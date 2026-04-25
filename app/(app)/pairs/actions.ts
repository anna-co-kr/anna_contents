"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { uploadPairResult } from "@/lib/storage/upload";
import {
  promptToolSchema,
  promptLanguageSchema,
  type PromptLanguage,
  type PromptTool,
} from "@/lib/schemas/prompt";

/**
 * Task 015 — F003 페어 저장 Server Actions.
 *
 * - createPair: prompts 1건 + 결과 파일 N건 → pairs N건 (파일 0건이면 null pair 1건)
 *               iteration_count_cumulative는 session_id별 기존 count + 1, 2, 3…
 * - updatePair: pairs.satisfaction · is_final_pick + 연관 prompts.self_rating PATCH
 * - listPairs:  시간 역순 + (선택) session_id 필터, prompts JOIN으로 tool/language/text 동반
 * - getPairStats: 세션별 self_rating 평균 (T1·T2·T3 실측 자동 집계용)
 */

type ActionOk = { ok: true };
type ActionErr = { ok: false; error: string };
type ActionResult<T = unknown> = T extends unknown
  ? (ActionOk & T) | ActionErr
  : never;
type SimpleActionResult = ActionOk | ActionErr;

async function requireUserId(): Promise<
  { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: "로그인이 필요합니다" };
  return { ok: true, userId, supabase };
}

// ─── createPair ────────────────────────────────────────────────────────────

const createPairInputSchema = z.object({
  promptText: z.string().trim().min(1, "프롬프트 본문은 비어있을 수 없습니다").max(8000),
  tool: promptToolSchema,
  language: promptLanguageSchema,
  selfRating: z.number().int().min(1).max(5).nullable(),
  satisfaction: z.number().int().min(1).max(5).nullable(),
  isFinalPick: z.boolean(),
  referenceId: z.string().uuid().nullable(),
  sessionId: z.string().min(1).max(64),
  // 파일은 FormData에서 별도 추출, Zod는 메타만 검증
});

export type CreatePairResult = ActionResult<{
  promptId: string;
  pairIds: string[];
  iterationStart: number;
  iterationEnd: number;
}>;

const ALLOWED_RESULT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

const MAX_RESULT_BYTES = 20_000_000;

function extOfContentType(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("quicktime")) return "mov";
  return "jpg";
}

function parseNullableInt(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const s = String(value).trim();
  if (s === "" || s === "null") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseNullableUuid(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const s = String(value).trim();
  if (s === "" || s === "null") return null;
  return s;
}

export async function createPair(
  formData: FormData,
): Promise<CreatePairResult> {
  const ctx = await requireUserId();
  if (!ctx.ok) return ctx;

  const rawInput = {
    promptText: String(formData.get("promptText") ?? ""),
    tool: String(formData.get("tool") ?? ""),
    language: String(formData.get("language") ?? ""),
    selfRating: parseNullableInt(formData.get("selfRating")),
    satisfaction: parseNullableInt(formData.get("satisfaction")),
    isFinalPick: formData.get("isFinalPick") === "true",
    referenceId: parseNullableUuid(formData.get("referenceId")),
    sessionId: String(formData.get("sessionId") ?? ""),
  };

  const parsed = createPairInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `입력 검증 실패 [${issue.path.join(".")}]: ${issue.message}`,
    };
  }

  const {
    promptText,
    tool,
    language,
    selfRating,
    satisfaction,
    isFinalPick,
    referenceId,
    sessionId,
  } = parsed.data;

  // 결과 파일 추출
  const rawFiles = formData.getAll("results");
  const files: File[] = [];
  for (const f of rawFiles) {
    if (!(f instanceof File) || f.size === 0) continue;
    if (!ALLOWED_RESULT_TYPES.has(f.type)) {
      return { ok: false, error: `허용되지 않는 파일 타입: ${f.type}` };
    }
    if (f.size > MAX_RESULT_BYTES) {
      return {
        ok: false,
        error: `파일 용량 초과(${f.name}, 20MB 이하만 허용)`,
      };
    }
    files.push(f);
  }

  // referenceId 소유권 확인 (있을 때만)
  if (referenceId) {
    const { data: ref } = await ctx.supabase
      .from("references")
      .select("id")
      .eq("id", referenceId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!ref) {
      return { ok: false, error: "레퍼런스를 찾을 수 없거나 권한이 없습니다" };
    }
  }

  // 1) prompts insert
  const { data: promptRow, error: promptError } = await ctx.supabase
    .from("prompts")
    .insert({
      user_id: ctx.userId,
      reference_id: referenceId,
      prompt_text: promptText,
      tool,
      language,
      self_rating: selfRating,
      source: referenceId ? "copied" : "modified",
    })
    .select("id")
    .single();

  if (promptError || !promptRow) {
    return {
      ok: false,
      error: `프롬프트 저장 실패: ${promptError?.message ?? "unknown"}`,
    };
  }

  // 2) 같은 session 내 기존 pair count → 다음 iteration 시작값
  const { count: existingCount } = await ctx.supabase
    .from("pairs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("session_id", sessionId);

  const iterationStart = (existingCount ?? 0) + 1;

  // 3) 파일 N건 → 각각 storage 업로드 + pair row insert
  //    파일 0건이면 result_image_url=null인 pair 1건 (안나가 결과 없이도 시도 자체를 기록 가능)
  const pairIds: string[] = [];
  const fileCount = Math.max(files.length, 1);
  let nextIteration = iterationStart;

  for (let i = 0; i < fileCount; i += 1) {
    const file = files[i] ?? null;
    let resultUrl: string | null = null;

    if (file) {
      try {
        const uploaded = await uploadPairResult(
          file,
          ctx.userId,
          file.type,
          extOfContentType(file.type),
        );
        resultUrl = uploaded.path;
      } catch (e) {
        return {
          ok: false,
          error: `결과 파일 업로드 실패: ${(e as Error).message}`,
        };
      }
    }

    const { data: pairRow, error: pairError } = await ctx.supabase
      .from("pairs")
      .insert({
        user_id: ctx.userId,
        prompt_id: promptRow.id,
        result_image_url: resultUrl,
        // 첫 row만 만족도/pin 반영 — N개 파일은 동일 시도 묶음이지만
        // 안나가 채택하는 1건만 별도 마킹하는 것이 자연스러움
        satisfaction: i === 0 ? satisfaction : null,
        is_final_pick: i === 0 ? isFinalPick : false,
        iteration_count_cumulative: nextIteration,
        session_id: sessionId,
      })
      .select("id")
      .single();

    if (pairError || !pairRow) {
      return {
        ok: false,
        error: `페어 저장 실패: ${pairError?.message ?? "unknown"}`,
      };
    }
    pairIds.push(pairRow.id);
    nextIteration += 1;
  }

  revalidatePath("/pairs");
  return {
    ok: true,
    promptId: promptRow.id,
    pairIds,
    iterationStart,
    iterationEnd: nextIteration - 1,
  };
}

// ─── updatePair ────────────────────────────────────────────────────────────

const updatePairInputSchema = z
  .object({
    pairId: z.string().uuid(),
    satisfaction: z.number().int().min(1).max(5).nullable().optional(),
    isFinalPick: z.boolean().optional(),
    selfRating: z.number().int().min(1).max(5).nullable().optional(),
  })
  .refine(
    (v) =>
      v.satisfaction !== undefined ||
      v.isFinalPick !== undefined ||
      v.selfRating !== undefined,
    "변경할 필드가 최소 1개 필요합니다",
  );

export async function updatePair(raw: unknown): Promise<SimpleActionResult> {
  const parsed = updatePairInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 입력" };
  }
  const ctx = await requireUserId();
  if (!ctx.ok) return ctx;

  const { pairId, satisfaction, isFinalPick, selfRating } = parsed.data;

  // 소유권 확인 + prompt_id 추출 (self_rating 갱신용)
  const { data: pairRow, error: fetchError } = await ctx.supabase
    .from("pairs")
    .select("id, prompt_id")
    .eq("id", pairId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: `페어 조회 실패: ${fetchError.message}` };
  if (!pairRow) return { ok: false, error: "페어를 찾을 수 없거나 권한이 없습니다" };

  // pairs PATCH
  const pairPatch: Record<string, unknown> = {};
  if (satisfaction !== undefined) pairPatch.satisfaction = satisfaction;
  if (isFinalPick !== undefined) pairPatch.is_final_pick = isFinalPick;

  if (Object.keys(pairPatch).length > 0) {
    const { error } = await ctx.supabase
      .from("pairs")
      .update(pairPatch)
      .eq("id", pairId)
      .eq("user_id", ctx.userId);
    if (error) return { ok: false, error: `페어 갱신 실패: ${error.message}` };
  }

  // prompts.self_rating PATCH
  if (selfRating !== undefined) {
    const { error } = await ctx.supabase
      .from("prompts")
      .update({ self_rating: selfRating })
      .eq("id", pairRow.prompt_id)
      .eq("user_id", ctx.userId);
    if (error) {
      return { ok: false, error: `self_rating 갱신 실패: ${error.message}` };
    }
  }

  revalidatePath("/pairs");
  return { ok: true };
}

// ─── listPairs ─────────────────────────────────────────────────────────────

export type PairListItem = {
  pairId: string;
  promptId: string;
  tool: PromptTool;
  language: PromptLanguage;
  promptText: string;
  selfRating: number | null;
  satisfaction: number | null;
  isFinalPick: boolean;
  iterationCount: number;
  sessionId: string;
  createdAt: string;
  resultImagePath: string | null;
};

export async function listPairs(opts?: {
  sessionId?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ rows: PairListItem[]; totalCount: number }>> {
  const ctx = await requireUserId();
  if (!ctx.ok) return ctx;

  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 200);
  const offset = Math.max(opts?.offset ?? 0, 0);

  const countQuery = ctx.supabase
    .from("pairs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId);
  if (opts?.sessionId) countQuery.eq("session_id", opts.sessionId);
  const { count } = await countQuery;

  const dataQuery = ctx.supabase
    .from("pairs")
    .select(
      `
      id,
      prompt_id,
      result_image_url,
      satisfaction,
      is_final_pick,
      iteration_count_cumulative,
      session_id,
      created_at,
      prompts:prompt_id ( prompt_text, tool, language, self_rating )
      `,
    )
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts?.sessionId) dataQuery.eq("session_id", opts.sessionId);

  const { data, error } = await dataQuery;
  if (error) return { ok: false, error: `페어 조회 실패: ${error.message}` };

  const rows: PairListItem[] = (data ?? []).map((row) => {
    const prompt = (Array.isArray(row.prompts) ? row.prompts[0] : row.prompts) as
      | {
          prompt_text: string;
          tool: PromptTool;
          language: PromptLanguage;
          self_rating: number | null;
        }
      | null;
    return {
      pairId: row.id,
      promptId: row.prompt_id,
      tool: prompt?.tool ?? "midjourney",
      language: prompt?.language ?? "en",
      promptText: prompt?.prompt_text ?? "",
      selfRating: prompt?.self_rating ?? null,
      satisfaction: row.satisfaction,
      isFinalPick: row.is_final_pick,
      iterationCount: row.iteration_count_cumulative,
      sessionId: row.session_id,
      createdAt: row.created_at,
      resultImagePath: row.result_image_url,
    };
  });

  return { ok: true, rows, totalCount: count ?? 0 };
}

// ─── getPairStats (세션별 self_rating 평균) ────────────────────────────────

export type PairStats = {
  sessionId: string;
  pairCount: number;
  selfRatingAvg: number | null;
  satisfactionAvg: number | null;
  finalPickCount: number;
};

export async function getPairStats(
  sessionId: string,
): Promise<ActionResult<{ stats: PairStats }>> {
  if (!sessionId || typeof sessionId !== "string") {
    return { ok: false, error: "sessionId 필요" };
  }
  const ctx = await requireUserId();
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("pairs")
    .select(
      `
      id,
      satisfaction,
      is_final_pick,
      prompts:prompt_id ( self_rating )
      `,
    )
    .eq("user_id", ctx.userId)
    .eq("session_id", sessionId);

  if (error) return { ok: false, error: `세션 조회 실패: ${error.message}` };

  const rows = data ?? [];
  let selfSum = 0;
  let selfCount = 0;
  let satSum = 0;
  let satCount = 0;
  let finalPickCount = 0;

  for (const row of rows) {
    const prompt = (Array.isArray(row.prompts) ? row.prompts[0] : row.prompts) as
      | { self_rating: number | null }
      | null;
    if (typeof prompt?.self_rating === "number") {
      selfSum += prompt.self_rating;
      selfCount += 1;
    }
    if (typeof row.satisfaction === "number") {
      satSum += row.satisfaction;
      satCount += 1;
    }
    if (row.is_final_pick) finalPickCount += 1;
  }

  return {
    ok: true,
    stats: {
      sessionId,
      pairCount: rows.length,
      selfRatingAvg: selfCount > 0 ? selfSum / selfCount : null,
      satisfactionAvg: satCount > 0 ? satSum / satCount : null,
      finalPickCount,
    },
  };
}
