import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Storage 버킷·경로 컨벤션 (Task 003 마이그레이션의 Storage RLS와 맞물림).
 * 경로 첫 세그먼트 = user_id 여야 RLS 정책 (storage.foldername(name))[1]=auth.uid() 통과.
 */
export const THUMBNAIL_BUCKET = "references-thumbnails";
export const PAIR_RESULT_BUCKET = "pair-results";

export type UploadResult = {
  path: string;
  bytes: number;
};

/**
 * 레퍼런스 썸네일을 Supabase Storage의 `references-thumbnails` private 버킷에 업로드.
 * 경로: {user_id}/{uuid}.jpg
 *
 * 서버(Server Action·Route Handler) 전용. 내부에서 server client를 생성해 세션 쿠키로 RLS 통과.
 */
export async function uploadReferenceThumbnail(
  blob: Blob,
  userId: string,
  contentType = "image/jpeg",
  ext = "jpg",
): Promise<UploadResult> {
  if (!userId) throw new Error("userId 필요");

  const path = `${userId}/${randomUUID()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, blob, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`썸네일 업로드 실패: ${error.message}`);
  }

  return { path, bytes: blob.size };
}

/**
 * 페어 결과 이미지/영상 업로드 (Task 015에서 사용 예정).
 * Task 007 현재는 export만 해두고 미사용.
 */
export async function uploadPairResult(
  blob: Blob,
  userId: string,
  contentType = "image/jpeg",
  ext = "jpg",
): Promise<UploadResult> {
  if (!userId) throw new Error("userId 필요");

  const path = `${userId}/${randomUUID()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(PAIR_RESULT_BUCKET)
    .upload(path, blob, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`페어 결과 업로드 실패: ${error.message}`);
  }

  return { path, bytes: blob.size };
}
