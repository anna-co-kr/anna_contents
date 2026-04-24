import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Task 010 E2E — F002 레퍼런스 카드 그리드.
 *
 * 검증 범위:
 *   - /library 로그인 후 카드 그리드 또는 빈 상태가 노출
 *   - 이미지 1건 드롭 → 그리드 새 카드 등장 (data-testid)
 *   - 카드 hover 시 우상단 태그·편집 버튼 노출 (Task 011에서 활성화되지만 DOM 자체는 존재)
 *   - 카드 링크 클릭 시 /library/[id] 로 이동 시도 (Task 013 전이므로 404/프레임 허용)
 */

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.beforeEach(async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("TEST_EMAIL / TEST_PASSWORD env 필요");
  }
  await page.goto("/login");
  await expect(page.getByLabel("이메일")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("이메일").fill(TEST_EMAIL);
  await page.getByLabel("비밀번호").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL("**/library", { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "레퍼런스 라이브러리" }),
  ).toBeVisible({ timeout: 20_000 });
});

test("라이브러리 페이지가 그리드 또는 빈 상태 중 하나를 노출한다", async ({
  page,
}) => {
  const emptyState = page.getByRole("heading", {
    name: "첫 레퍼런스를 드롭해보세요",
  });
  const gridHeading = page.getByText(/^총 \d+개$/);

  await expect(async () => {
    const emptyVisible = await emptyState.isVisible();
    const gridVisible = await gridHeading.isVisible();
    expect(emptyVisible || gridVisible).toBe(true);
  }).toPass({ timeout: 15_000 });
});

test("이미지 드롭 후 그리드에 새 카드가 등장한다", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);

  // 드롭 완료 시그널
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  // 그리드 헤더 "총 N개" 는 Task 010에서 도입됨
  await expect(page.getByText(/^총 \d+개$/)).toBeVisible({ timeout: 10_000 });

  // 최소 1개 이상의 카드가 DOM에 존재
  const cards = page.locator('[data-testid^="reference-card-"]');
  await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
});

test("첫 카드에 상세 링크(/library/[id])가 걸려 있다", async ({ page }) => {
  // 기존 레퍼런스가 하나라도 있어야 의미 있는 테스트.
  // 없으면 먼저 하나 드롭해서 만든다.
  const existingCard = page
    .locator('[data-testid^="reference-card-"]')
    .first();

  if (!(await existingCard.isVisible().catch(() => false))) {
    const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
    await page.locator('input[type="file"]').setInputFiles(sample);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });
  }

  const firstCard = page
    .locator('[data-testid^="reference-card-"]')
    .first();
  await expect(firstCard).toBeVisible();

  const link = firstCard.getByRole("link", { name: "레퍼런스 상세로 이동" });
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^\/library\/[0-9a-f-]{36}$/);
});

test("그리드는 반응형 — lg 뷰포트에서는 4열, mobile에서는 2열", async ({
  page,
}) => {
  // 그리드 노출을 위해 최소 1개 보장
  const cards = page.locator('[data-testid^="reference-card-"]');
  if ((await cards.count()) === 0) {
    const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
    await page.locator('input[type="file"]').setInputFiles(sample);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });
  }

  const gridContainer = page.locator(
    '[aria-label="레퍼런스 라이브러리 그리드"] > div.grid',
  );
  await expect(gridContainer).toBeVisible();

  // grid template-columns 값으로 열수 검증
  const getColumnCount = async () =>
    gridContainer.evaluate((el) => {
      const cols = window.getComputedStyle(el).gridTemplateColumns;
      return cols.split(" ").length;
    });

  // lg (1280px)
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await getColumnCount()).toBe(4);

  // md (768px)
  await page.setViewportSize({ width: 800, height: 900 });
  expect(await getColumnCount()).toBe(3);

  // mobile (<768px)
  await page.setViewportSize({ width: 400, height: 900 });
  expect(await getColumnCount()).toBe(2);
});
