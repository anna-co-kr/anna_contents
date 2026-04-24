import { z } from "zod";

/**
 * pairs 테이블 Row 스키마.
 *
 * - satisfaction: 이미지·영상 결과 만족도 (2차 지표, 1~5 또는 null)
 * - prompt 자체 만족도는 prompts.self_rating (1차 지표, 분리 측정)
 * - session_id + iteration_count_cumulative로 세션별 이터레이션 감축률 측정
 */
export const pairSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  prompt_id: z.string().uuid(),
  result_image_url: z.string().nullable(),
  satisfaction: z.number().int().min(1).max(5).nullable(),
  is_final_pick: z.boolean(),
  iteration_count_cumulative: z.number().int().min(1),
  session_id: z.string().min(1),
  created_at: z.string(),
});

export const pairInsertSchema = pairSchema.partial({
  id: true,
  user_id: true,
  created_at: true,
  is_final_pick: true,
  iteration_count_cumulative: true,
  satisfaction: true,
  result_image_url: true,
});

export type Pair = z.infer<typeof pairSchema>;
export type PairInsert = z.infer<typeof pairInsertSchema>;
