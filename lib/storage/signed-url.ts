import { createClient } from "@/lib/supabase/server";
import { THUMBNAIL_BUCKET, PAIR_RESULT_BUCKET } from "./upload";

/**
 * Supabase Storage private 버킷 객체의 signed URL 발급.
 * 기본 만료 1시간 (ENG-15, Task 002 완료 기준).
 * Public URL은 사용 금지 — private 버킷이므로 불가능하기도 함.
 */

const DEFAULT_EXPIRES_SECONDS = 3600;

export async function getSignedThumbnailUrl(
  path: string,
  expiresIn = DEFAULT_EXPIRES_SECONDS,
): Promise<string | null> {
  return getSignedUrl(THUMBNAIL_BUCKET, path, expiresIn);
}

export async function getSignedPairResultUrl(
  path: string,
  expiresIn = DEFAULT_EXPIRES_SECONDS,
): Promise<string | null> {
  return getSignedUrl(PAIR_RESULT_BUCKET, path, expiresIn);
}

async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
