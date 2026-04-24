import { z } from "zod";

/**
 * references 테이블 Row 스키마.
 * DB 컬럼: id, user_id, source_url, thumbnail_url, favorite_score, notes, uploaded_at
 */
export const referenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  source_url: z.string().url().nullable(),
  thumbnail_url: z.string().nullable(),
  favorite_score: z.number().int().min(1).max(10).nullable(),
  notes: z.string().nullable(),
  uploaded_at: z.string(),
});

/**
 * Insert 시 서버가 기본값을 채우는 필드는 optional.
 * user_id는 서버 세션에서 세팅되므로 클라이언트 insert payload에선 생략 가능.
 */
export const referenceInsertSchema = referenceSchema.partial({
  id: true,
  user_id: true,
  uploaded_at: true,
  favorite_score: true,
  notes: true,
  source_url: true,
  thumbnail_url: true,
});

export type Reference = z.infer<typeof referenceSchema>;
export type ReferenceInsert = z.infer<typeof referenceInsertSchema>;
