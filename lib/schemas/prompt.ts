import { z } from "zod";

/**
 * prompts 테이블 관련 Zod 스키마 (2026-04-24 Higgsfield 추가 반영).
 *
 * - tool 3종: midjourney / nano-banana / higgsfield
 * - language 2종: en / ko
 * - 6 조합(tool × language) 전부 Zod 레벨에서 유효
 * - 기본값 연동(MJ→en, NBP→ko, Higgsfield→en)은 UI default로 처리
 * - self_rating: 프롬프트 자체 만족도 (1차 성공 지표, 1~5 또는 null)
 */
export const promptToolSchema = z.enum([
  "midjourney",
  "nano-banana",
  "higgsfield",
]);

export const promptLanguageSchema = z.enum(["en", "ko"]);

export const promptSourceSchema = z.enum(["copied", "modified", "remix"]);

export const promptSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  reference_id: z.string().uuid().nullable(),
  prompt_text: z.string().min(1),
  tool: promptToolSchema,
  language: promptLanguageSchema,
  self_rating: z.number().int().min(1).max(5).nullable(),
  source: promptSourceSchema,
  created_at: z.string(),
});

export const promptInsertSchema = promptSchema.partial({
  id: true,
  user_id: true,
  reference_id: true,
  self_rating: true,
  source: true,
  created_at: true,
});

export type PromptTool = z.infer<typeof promptToolSchema>;
export type PromptLanguage = z.infer<typeof promptLanguageSchema>;
export type PromptSource = z.infer<typeof promptSourceSchema>;
export type Prompt = z.infer<typeof promptSchema>;
export type PromptInsert = z.infer<typeof promptInsertSchema>;

/**
 * UI default 연동 테이블. 사용자가 override하지 않으면 이 기본값을 선택.
 * Zod는 모든 6 조합을 허용하므로 이 맵은 순수 UX layer 힌트.
 */
export const DEFAULT_LANGUAGE_BY_TOOL: Record<PromptTool, PromptLanguage> = {
  midjourney: "en",
  "nano-banana": "ko",
  higgsfield: "en",
};

/**
 * 도구별 사용자 친화 표시명 (UI 배지·토글 라벨).
 */
export const TOOL_DISPLAY_NAME: Record<PromptTool, string> = {
  midjourney: "Midjourney",
  "nano-banana": "Nano Banana Pro",
  higgsfield: "Higgsfield",
};

export const LANGUAGE_DISPLAY_NAME: Record<PromptLanguage, string> = {
  en: "English",
  ko: "한국어",
};
