import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 설정 (Task 007 이후).
 * - vitest는 lib/ 단위 테스트 전용, playwright는 브라우저 End-to-End 전용
 * - dev server는 테스트 실행 시 이미 켜져있어야 함 (webServer 자동 기동 생략, 안나가 직접 켜거나 bash background로)
 * - headless 기본, Chromium만 사용
 * - 테스트 결과·스크린샷·비디오는 gitignored (test-results/)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
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
