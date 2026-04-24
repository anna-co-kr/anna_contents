"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchOgMeta, fetchImageAsBlob } from "@/lib/scrape/og-meta";
import { uploadReferenceThumbnail } from "@/lib/storage/upload";
import { getSignedThumbnailUrl } from "@/lib/storage/signed-url";
import { tokenSchema, type Token, TOKEN_KEYS } from "@/lib/schemas/tokens";

/**
 * Task 007 Server Actions — 레퍼런스 생성 2 경로 (URL / 이미지 직접).
 *
 * 원칙:
 *   - B 재설계: reference_tokens 레코드는 여기서 생성 안 함. Task 008(Claude Code paste) 전용.
 *   - URL 경로는 OpenGraph 메타 실패해도 소프트 폴백 (ROADMAP Q3=A)
 *   - 중복 URL은 기존 reference_id 반환 + existing=true flag
 */

const urlInputSchema = z.object({
  url: z
    .string()
    .min(1, "URL을 입력해주세요")
    .url("올바른 URL 형식이 아닙니다"),
});

export type CreateFromUrlResult =
  | {
      ok: true;
      referenceId: string;
      existing: boolean;
      thumbnailPath: string | null;
      title: string | null;
    }
  | { ok: false; error: string };

export async function createReferenceFromUrl(
  rawUrl: string,
): Promise<CreateFromUrlResult> {
  const parsed = urlInputSchema.safeParse({ url: rawUrl });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 URL" };
  }

  const { url } = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { ok: false, error: "로그인이 필요합니다" };
  }

  // 1) 중복 URL 체크 (partial unique index (user_id, source_url) where source_url not null)
  const { data: existingRow } = await supabase
    .from("references")
    .select("id, thumbnail_url, notes")
    .eq("user_id", userId)
    .eq("source_url", url)
    .limit(1)
    .maybeSingle();

  if (existingRow) {
    return {
      ok: true,
      referenceId: existingRow.id,
      existing: true,
      thumbnailPath: existingRow.thumbnail_url,
      title: existingRow.notes,
    };
  }

  // 2) OG 메타 fetch (실패해도 진행 — 소프트 폴백)
  const og = await fetchOgMeta(url);

  // 3) OG 이미지 있으면 fetch + Storage 업로드 (실패해도 진행)
  let thumbnailPath: string | null = null;
  if (og?.imageUrl) {
    const imageData = await fetchImageAsBlob(og.imageUrl);
    if (imageData) {
      try {
        const uploaded = await uploadReferenceThumbnail(
          imageData.blob,
          userId,
          imageData.contentType,
          extensionFromContentType(imageData.contentType),
        );
        thumbnailPath = uploaded.path;
      } catch {
        // 업로드 실패도 소프트 폴백
        thumbnailPath = null;
      }
    }
  }

  const title = og?.title ?? null;

  // 4) references insert
  const { data: inserted, error: insertError } = await supabase
    .from("references")
    .insert({
      user_id: userId,
      source_url: url,
      thumbnail_url: thumbnailPath,
      notes: title,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: `레퍼런스 저장 실패: ${insertError?.message ?? "unknown"}`,
    };
  }

  revalidatePath("/library");
  return {
    ok: true,
    referenceId: inserted.id,
    existing: false,
    thumbnailPath,
    title,
  };
}

export type CreateFromImageResult =
  | { ok: true; referenceId: string; thumbnailPath: string }
  | { ok: false; error: string };

export async function createReferenceFromImage(
  formData: FormData,
): Promise<CreateFromImageResult> {
  const file = formData.get("image");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "이미지 파일이 포함되지 않았습니다" };
  }
  if (file.size > 5_000_000) {
    return { ok: false, error: "이미지 용량이 5MB를 초과합니다" };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { ok: false, error: "로그인이 필요합니다" };
  }

  let uploaded;
  try {
    uploaded = await uploadReferenceThumbnail(
      file,
      userId,
      file.type || "image/jpeg",
      extensionFromContentType(file.type || "image/jpeg"),
    );
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("references")
    .insert({
      user_id: userId,
      source_url: null,
      thumbnail_url: uploaded.path,
      notes: null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    // 삽입 실패 시 업로드된 파일은 orphan이 됨 — 추후 backfill 스크립트에서 정리 (TODOS 메모)
    return {
      ok: false,
      error: `레퍼런스 저장 실패: ${insertError?.message ?? "unknown"}`,
    };
  }

  revalidatePath("/library");
  return {
    ok: true,
    referenceId: inserted.id,
    thumbnailPath: uploaded.path,
  };
}

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

// ═══════════════════════════════════════════════════════════════════════════
// Task 008 — reference_tokens 저장 (Claude Code paste 또는 수동 입력)
// ═══════════════════════════════════════════════════════════════════════════

const saveTokensInputSchema = z.object({
  referenceId: z.string().uuid("referenceId는 UUID여야 합니다"),
  tokens: tokenSchema,
  source: z.enum(["claude-code", "manual"]),
});

export type SaveTokensInput = z.infer<typeof saveTokensInputSchema>;

export type SaveTokensResult =
  | { ok: true; referenceTokenId: string; source: "claude-code" | "manual" }
  | { ok: false; error: string };

/**
 * 6차원 토큰을 저장. 기존 active 레코드는 is_active=false로 전환하고
 * 새 레코드를 is_active=true로 insert (이력 보존 구조, ENG-1).
 *
 * source:
 *   - 'claude-code': 안나가 Claude Code 응답을 paste 폼에 붙여넣어 parser 통과한 경우
 *   - 'manual': 수동 6필드 입력 dialog 경로
 */
export async function saveReferenceTokens(
  rawInput: unknown,
): Promise<SaveTokensResult> {
  const parsed = saveTokensInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `입력 검증 실패 [${issue.path.join(".")}]: ${issue.message}`,
    };
  }

  const { referenceId, tokens, source } = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { ok: false, error: "로그인이 필요합니다" };
  }

  // 1) 소유권 확인 (RLS가 동일 조건 강제하지만 explicit check로 에러 메시지 개선)
  const { data: ref } = await supabase
    .from("references")
    .select("id")
    .eq("id", referenceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!ref) {
    return { ok: false, error: "레퍼런스를 찾을 수 없거나 권한이 없습니다" };
  }

  // 2) 기존 active 레코드 is_active=false로 전환
  const { error: deactivateError } = await supabase
    .from("reference_tokens")
    .update({ is_active: false })
    .eq("reference_id", referenceId)
    .eq("is_active", true);
  if (deactivateError) {
    return {
      ok: false,
      error: `기존 활성 레코드 전환 실패: ${deactivateError.message}`,
    };
  }

  // 3) 새 reference_tokens insert (is_active=true, source 명시)
  const { data: inserted, error: insertError } = await supabase
    .from("reference_tokens")
    .insert({
      user_id: userId,
      reference_id: referenceId,
      tokens: tokens as unknown as Token & Record<string, unknown>,
      source,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: `토큰 저장 실패: ${insertError?.message ?? "unknown"}`,
    };
  }

  revalidatePath("/library");
  revalidatePath(`/library/${referenceId}`);
  return {
    ok: true,
    referenceTokenId: inserted.id,
    source,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Task 010 — 레퍼런스 카드 그리드 조회
// ═══════════════════════════════════════════════════════════════════════════

export type ReferenceCardData = {
  id: string;
  sourceUrl: string | null;
  thumbnailUrl: string | null; // Supabase Storage 객체 경로
  signedThumbnailUrl: string | null; // 1시간 TTL signed URL (null = 미설정 또는 발급 실패)
  favoriteScore: number | null;
  notes: string | null;
  uploadedAt: string;
  tokens: Token | null; // 활성 토큰 (미분석 시 null)
  tags: { id: string; label: string; kind: "category" | "mood" | "color" | "purpose" }[];
};

export type ListReferenceCardsResult =
  | { ok: true; cards: ReferenceCardData[]; totalCount: number }
  | { ok: false; error: string };

export async function listReferenceCards(
  limit = 50,
  offset = 0,
): Promise<ListReferenceCardsResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { ok: false, error: "로그인이 필요합니다" };
  }

  const { count } = await supabase
    .from("references")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data, error } = await supabase
    .from("references")
    .select(
      `
      id,
      source_url,
      thumbnail_url,
      favorite_score,
      notes,
      uploaded_at,
      reference_tokens(tokens, is_active),
      tags(id, tag, tag_kind)
      `,
    )
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { ok: false, error: `카드 조회 실패: ${error.message}` };
  }

  const cards: ReferenceCardData[] = await Promise.all(
    (data ?? []).map(async (row) => {
      const activeTokenRow = (row.reference_tokens ?? []).find(
        (rt: { is_active: boolean; tokens: unknown }) => rt.is_active,
      );
      const tokens = activeTokenRow
        ? normalizeTokens(activeTokenRow.tokens)
        : null;

      const signed = row.thumbnail_url
        ? await getSignedThumbnailUrl(row.thumbnail_url)
        : null;

      return {
        id: row.id,
        sourceUrl: row.source_url,
        thumbnailUrl: row.thumbnail_url,
        signedThumbnailUrl: signed,
        favoriteScore: row.favorite_score,
        notes: row.notes,
        uploadedAt: row.uploaded_at,
        tokens,
        tags: (row.tags ?? []).map(
          (t: { id: string; tag: string; tag_kind: ReferenceCardData["tags"][number]["kind"] }) => ({
            id: t.id,
            label: t.tag,
            kind: t.tag_kind,
          }),
        ),
      };
    }),
  );

  return { ok: true, cards, totalCount: count ?? 0 };
}

function normalizeTokens(raw: unknown): Token | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of TOKEN_KEYS) {
    const v = rec[key];
    if (typeof v !== "string" || v.length === 0) return null;
    result[key] = v;
  }
  return result as Token;
}
