"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchOgMeta, fetchImageAsBlob } from "@/lib/scrape/og-meta";
import { uploadReferenceThumbnail } from "@/lib/storage/upload";

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
