import { z } from "zod";

/**
 * Prompt Studio 6차원 토큰 스키마 (영어 고정).
 *
 * Claude Code CLI에 레퍼런스 이미지 분석을 요청한 응답을 제품이 paste 폼으로 받은 뒤
 * 이 스키마로 엄격 검증한다. 외부 API의 tool_use 같은 구조 강제가 없으므로
 * Zod 검증이 유일한 스키마 드리프트 방어선이다.
 *
 * 제약:
 *   - 6 키 정확히: subject / style / lighting / composition / medium / mood
 *   - 각 값은 non-empty 영문 문자열
 *   - 추가 키 거부 (.strict())
 *   - null / number / array 등 다른 타입 거부
 */
export const tokenSchema = z
  .object({
    subject: z.string().min(1, "subject는 비어있을 수 없습니다"),
    style: z.string().min(1, "style는 비어있을 수 없습니다"),
    lighting: z.string().min(1, "lighting는 비어있을 수 없습니다"),
    composition: z.string().min(1, "composition는 비어있을 수 없습니다"),
    medium: z.string().min(1, "medium는 비어있을 수 없습니다"),
    mood: z.string().min(1, "mood는 비어있을 수 없습니다"),
  })
  .strict();

export type Token = z.infer<typeof tokenSchema>;

export const TOKEN_KEYS = [
  "subject",
  "style",
  "lighting",
  "composition",
  "medium",
  "mood",
] as const;
