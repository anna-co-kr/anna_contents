/**
 * 클라이언트 전용 이미지 리사이즈 유틸.
 *
 * 기능 (ROADMAP Task 007 / ERR-2):
 *   - 긴 변 maxSide(기본 1920px) 유지, 원본 비율 보존
 *   - JPEG 인코딩, quality 기본 0.85
 *   - maxBytes(기본 2MB) 초과 시 quality 단계적 하향(0.85 → 0.75 → 0.65)
 *   - Supabase Storage 5MB 제한·Vision 토큰 비용 회피 목적
 *
 * 브라우저 Canvas + createImageBitmap 의존. 서버(Node)에서 직접 호출 불가.
 * Server Action으로 넘기기 전 클라이언트에서 호출해 리사이즈된 Blob을 FormData로 전송.
 */
export type ResizeOptions = {
  maxSide?: number;
  quality?: number;
  maxBytes?: number;
};

export type ResizeResult = {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
  quality: number;
};

const DEFAULTS: Required<ResizeOptions> = {
  maxSide: 1920,
  quality: 0.85,
  maxBytes: 2_000_000,
};

const QUALITY_FALLBACK_STEPS = [0.85, 0.75, 0.65];

export async function resizeImage(
  file: File | Blob,
  opts: ResizeOptions = {},
): Promise<ResizeResult> {
  const { maxSide, quality, maxBytes } = { ...DEFAULTS, ...opts };

  const bitmap = await createImageBitmap(file);
  const { width: srcW, height: srcH } = bitmap;

  // 긴 변 기준 스케일 계산 (확대는 하지 않음)
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D context를 얻을 수 없습니다");
  }
  ctx.drawImage(bitmap, 0, 0, dstW, dstH);
  bitmap.close();

  // 용량 제한 맞추기 위해 quality 단계적 하향 재시도
  const qualities = quality === DEFAULTS.quality
    ? QUALITY_FALLBACK_STEPS
    : [quality, ...QUALITY_FALLBACK_STEPS.filter((q) => q < quality)];

  let lastBlob: Blob | null = null;
  let lastQuality = 0;
  for (const q of qualities) {
    const blob = await canvasToJpegBlob(canvas, q);
    lastBlob = blob;
    lastQuality = q;
    if (blob.size <= maxBytes) {
      return { blob, width: dstW, height: dstH, bytes: blob.size, quality: q };
    }
  }

  if (!lastBlob) {
    throw new Error("Canvas를 JPEG Blob으로 변환하지 못했습니다");
  }

  // 모든 quality에서도 초과하면 마지막(가장 낮은 q) 결과 반환 + 경고는 호출부에서
  return {
    blob: lastBlob,
    width: dstW,
    height: dstH,
    bytes: lastBlob.size,
    quality: lastQuality,
  };
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob 실패"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * 1KB 단위로 포맷된 바이트 크기 문자열 (UI 표시용).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
