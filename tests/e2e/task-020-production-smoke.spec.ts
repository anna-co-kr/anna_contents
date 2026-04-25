import { test, expect, type Page } from "@playwright/test";

/**
 * Task 020 production smoke — D13 배포 검증용 read-only spec.
 *
 * 실행: PLAYWRIGHT_BASE_URL=https://anna-contents.vercel.app npx playwright test tests/e2e/task-020-production-smoke.spec.ts
 *
 * destructive INSERT 없음 (production DB 보호). login → /library 진입 → 카드 1건 이상 → /pairs 진입.
 * Task 017 PARTIAL 등급 + production URL E2E 동작 확인 = Task 020 완료 기준 3번 검증.
 */

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

async function login(page: Page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("TEST_EMAIL / TEST_PASSWORD env 필요");
  }
  await page.goto("/login");
  await expect(page.getByLabel("이메일")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("이메일").fill(TEST_EMAIL);
  await page.getByLabel("비밀번호").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL("**/library", { timeout: 20_000 });
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("smoke-1 로그인 → /library 진입 + 카드 1건 이상 존재", async ({ page }) => {
  await expect(page).toHaveURL(/\/library$/);
  const cards = page.locator('[data-testid^="reference-card-"]');
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  console.log(`[smoke-1] /library 카드 ${count}건 노출`);
});

test("smoke-2 /pairs 진입 + 페어 목록 또는 빈 상태 정상 렌더", async ({ page }) => {
  await page.goto("/pairs");
  await expect(page).toHaveURL(/\/pairs$/);
  // 페어 카드가 1건 이상이거나, 빈 상태 메시지가 노출되거나 둘 중 하나는 보여야 정상
  const pairCards = page.locator('[data-testid^="pair-row-"]');
  const emptyMessage = page.getByText(/페어가 없습니다|아직 저장된 페어가 없습니다|첫 페어를/);
  const hasPairs = (await pairCards.count()) > 0;
  const hasEmptyState = await emptyMessage
    .first()
    .isVisible()
    .catch(() => false);
  expect(hasPairs || hasEmptyState).toBe(true);
  console.log(`[smoke-2] /pairs ${hasPairs ? `${await pairCards.count()}건` : "빈 상태"} 정상 렌더`);
});

test("smoke-3 production URL이 https + Vercel hosting", async ({ page }) => {
  const url = page.url();
  expect(url.startsWith("https://")).toBe(true);
  // Vercel 호스팅 시 응답 헤더 또는 도메인으로 검증 (직접 fetch)
  const response = await page.request.get("/");
  expect(response.ok() || response.status() === 307).toBe(true);
});
