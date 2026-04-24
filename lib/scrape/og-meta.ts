import ogs from "open-graph-scraper";

/**
 * OpenGraph 메타 추출 유틸 (Task 007, 서버 전용).
 *
 * 실패 시 `null` 반환 — 소프트 폴백 정책 (ROADMAP Task 007, Q3=A).
 * 호출부는 null이어도 URL만 저장해서 레퍼런스 레코드 생성을 진행해야 한다.
 *
 * 보편 제한:
 *   - Instagram·Pinterest 등은 private·robots block으로 OG 못 가져오는 경우 많음
 *   - 이 경우 null 반환 → 소프트 폴백으로 placeholder UX
 */
export type OgMeta = {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
};

const FETCH_TIMEOUT_MS = 8000;

export async function fetchOgMeta(url: string): Promise<OgMeta | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const { error, result } = await ogs({
      url,
      fetchOptions: { signal: controller.signal },
      timeout: FETCH_TIMEOUT_MS,
    });

    clearTimeout(timeout);

    if (error) return null;

    const imageUrl =
      result.ogImage?.[0]?.url ??
      result.twitterImage?.[0]?.url ??
      undefined;

    return {
      title: result.ogTitle ?? result.twitterTitle ?? undefined,
      description: result.ogDescription ?? result.twitterDescription ?? undefined,
      imageUrl,
      siteName: result.ogSiteName ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * OG 이미지를 fetch해 Blob으로 반환. Content-Length 검증·timeout 포함.
 * 이 함수도 실패 시 null 반환 (소프트 폴백).
 */
export async function fetchImageAsBlob(
  imageUrl: string,
  maxBytes = 5_000_000,
): Promise<{ blob: Blob; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "PromptStudio/0.5 (+https://github.com/)" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > maxBytes) return null;

    const blob = await res.blob();
    if (blob.size > maxBytes) return null;

    return { blob, contentType };
  } catch {
    return null;
  }
}
