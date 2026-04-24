import { describe, it, expect } from "vitest";
import { formatBytes } from "./resize";

// resizeImage 자체는 브라우저 Canvas·createImageBitmap 의존이라 Node vitest 환경
// (environment: "node")에서 단위 테스트 불가. 수동 브라우저 확인으로 대체.
// 여기서는 순수 함수인 formatBytes만 검증한다.

describe("formatBytes", () => {
  it("B 단위 (1024 미만)", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("KB 단위 (1024 이상 1MB 미만)", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024 - 1)).toMatch(/KB$/);
  });

  it("MB 단위 (1MB 이상)", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(2_000_000)).toBe("1.9 MB");
    expect(formatBytes(5_000_000)).toBe("4.8 MB");
  });
});
