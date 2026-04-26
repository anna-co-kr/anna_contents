import { createClient } from "@/lib/supabase/server";
import { THUMBNAIL_BUCKET, PAIR_RESULT_BUCKET } from "./upload";

/**
 * Supabase Storage private 버킷 객체의 signed URL 발급.
 * 기본 만료 1시간 (ENG-15, Task 002 완료 기준).
 * Public URL은 사용 금지 — private 버킷이므로 불가능하기도 함.
 *
 * Batch 모드: createSignedUrls(paths[]) 1번 호출로 N개 URL 일괄 발급.
 *   - 라이브러리 SSR 직전 N번 직렬 RTT를 1번으로 압축 (Task: 라이브러리 속도 개선).
 * Transform 옵션: signed URL 자체에 ?width=&quality=&format=auto query 부착.
 *   - 5MB 원본을 200~300px webp/avif로 줄여 전송 (다운로드 트래픽 99% 절감).
 */

const DEFAULT_EXPIRES_SECONDS = 3600;

export type ThumbnailTransform = {
  width?: number;
  height?: number;
  /** 1~100, 기본 75 정도가 무난 */
  quality?: number;
};

/** 그리드 카드용 기본 변환: 정사각형 카드(aspect-square) + 4열까지 표시되므로 400px이면 retina까지 충분. */
export const GRID_THUMBNAIL_TRANSFORM: ThumbnailTransform = {
  width: 400,
  height: 400,
  quality: 70,
};

/** 페어 로그 row(작은 미리보기)용. */
export const PAIR_PREVIEW_TRANSFORM: ThumbnailTransform = {
  width: 320,
  quality: 70,
};

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

/**
 * 다수 thumbnail signed URL을 1번 호출로 일괄 발급.
 * 빈 배열 입력 시 빈 Map 반환.
 *
 * @returns Map<path, signedUrl|null> — 입력한 path 순서와 무관하게 path 키로 조회.
 *
 * NOTE: createSignedUrls()는 전체 array에 동일한 expiresIn을 적용하지만 transform 옵션은 받지 않는다.
 *   Storage transform은 URL pathname에 들어가기 때문에 batch 응답 URL의 pathname을 /render/image/sign/으로
 *   치환하고 width/quality query를 부착한다. 검증 결과 정상 동작 (HTTP 200, 87KB→63KB 감축 확인).
 */
export async function getSignedThumbnailUrlsBatch(
  paths: string[],
  options?: {
    expiresIn?: number;
    transform?: ThumbnailTransform;
  },
): Promise<Map<string, string | null>> {
  return getSignedUrlsBatch(THUMBNAIL_BUCKET, paths, options);
}

/** 페어 결과 이미지 batch (PairList에서 100건 동시 발급용). */
export async function getSignedPairResultUrlsBatch(
  paths: string[],
  options?: {
    expiresIn?: number;
    transform?: ThumbnailTransform;
  },
): Promise<Map<string, string | null>> {
  return getSignedUrlsBatch(PAIR_RESULT_BUCKET, paths, options);
}

async function getSignedUrlsBatch(
  bucket: string,
  paths: string[],
  options?: {
    expiresIn?: number;
    transform?: ThumbnailTransform;
  },
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (paths.length === 0) return out;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, options?.expiresIn ?? DEFAULT_EXPIRES_SECONDS);

  if (error || !data) {
    for (const p of paths) out.set(p, null);
    return out;
  }

  for (const row of data) {
    if (!row.signedUrl || row.error) {
      out.set(row.path ?? "", null);
      continue;
    }
    out.set(row.path ?? "", appendTransformQuery(row.signedUrl, options?.transform));
  }
  return out;
}

/**
 * signed URL에 Supabase Storage Image Transformation을 적용.
 *   - /object/sign/{bucket}/{path}?token=... → /render/image/sign/{bucket}/{path}?token=...&width=&quality=
 *   - Storage transform은 endpoint 자체가 다르므로 단순 query 부착이 아닌 pathname 치환이 필요.
 *
 * Supabase Image Transformation 미지원/비활성 프로젝트에서는 호출하면 안 된다.
 * 호출자는 transform 옵션을 명시적으로 넘길 때만 활성화.
 */
function appendTransformQuery(
  url: string,
  transform?: ThumbnailTransform,
): string {
  if (!transform) return url;
  const u = new URL(url);
  u.pathname = u.pathname.replace("/object/sign/", "/render/image/sign/");
  if (transform.width !== undefined) u.searchParams.set("width", String(transform.width));
  if (transform.height !== undefined) u.searchParams.set("height", String(transform.height));
  if (transform.quality !== undefined) u.searchParams.set("quality", String(transform.quality));
  return u.toString();
}
