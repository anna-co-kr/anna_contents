import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Playwright E2E 설정 (Task 007 이후).
 * - vitest는 lib/ 단위 테스트 전용, playwright는 브라우저 End-to-End 전용
 * - dev server는 테스트 실행 시 이미 켜져있어야 함 (webServer 자동 기동 생략, 안나가 직접 켜거나 bash background로)
 * - headless 기본, Chromium만 사용
 * - 테스트 결과·스크린샷·비디오는 gitignored (test-results/)
 * - .env.local의 TEST_EMAIL / TEST_PASSWORD를 process.env로 주입 (Next.js와 달리
 *   playwright runner는 자동 로드하지 않음 — 의존성 없이 직접 파싱)
 */

function loadEnvLocal() {
  const envPath = resolve(__dirname, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // 따옴표 제거
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
