import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Task 013 E2E — 레퍼런스 상세 페이지 /library/[id].
 *
 * 검증 범위:
 *   - 카드 클릭 시 상세 페이지 진입 → 원본 이미지 + 4 섹션(점수/토큰/태그/스니펫) 노출
 *   - "라이브러리로 돌아가기" 링크 동작
 *   - 삭제 AlertDialog → cascade 삭제 → /library 리다이렉트 + 목록에서 사라짐
 */

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.use({
  permissions: ["clipboard-read", "clipboard-write"],
});

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
});

test("카드 클릭 → 상세 페이지 4 섹션 노출", async ({ page }) => {
  // 드롭해서 새 카드 확보
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  const link = firstCard.getByRole("link", { name: "레퍼런스 상세로 이동" });
  await link.click();

  await page.waitForURL(/\/library\/[0-9a-f-]{36}$/, { timeout: 10_000 });

  // 4 섹션 헤더 노출
  await expect(
    page.getByRole("heading", { name: "즐겨찾기 점수" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "6차원 토큰" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "태그" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "프롬프트 스니펫" }),
  ).toBeVisible();

  // 삭제 버튼 노출
  await expect(
    page.getByRole("button", { name: /레퍼런스 삭제/ }),
  ).toBeVisible();

  // 돌아가기 링크
  await page.getByRole("link", { name: /라이브러리로 돌아가기/ }).click();
  await page.waitForURL("**/library", { timeout: 5_000 });
});

test("상세 → 삭제 AlertDialog confirm → /library 로 리다이렉트 + 목록에서 사라짐", async ({
  page,
}) => {
  // 전용 카드 생성 (삭제 대상)
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  const cardTestId = await firstCard.getAttribute("data-testid");
  expect(cardTestId).toMatch(/^reference-card-[0-9a-f-]{36}$/);
  const refId = cardTestId!.replace("reference-card-", "");

  await page.goto(`/library/${refId}`);
  await expect(
    page.getByRole("heading", { name: "즐겨찾기 점수" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /레퍼런스 삭제/ }).click();

  // AlertDialog 확인
  await expect(
    page.getByRole("alertdialog").getByText("이 레퍼런스를 삭제하시겠어요?"),
  ).toBeVisible({ timeout: 5_000 });

  await page.getByRole("alertdialog").getByRole("button", { name: "삭제" }).click();

  // /library 로 이동
  await page.waitForURL("**/library", { timeout: 10_000 });

  // 해당 카드가 그리드에서 사라져야 함
  await expect(
    page.locator(`[data-testid="reference-card-${refId}"]`),
  ).toHaveCount(0, { timeout: 10_000 });
});

test("존재하지 않는 id는 에러/404 안내", async ({ page }) => {
  await page.goto("/library/00000000-0000-0000-0000-000000000000");
  // notFound() → not-found 페이지 또는 에러 role=alert 중 하나 노출
  const notFound = page
    .getByText(/This page could not be found|찾을 수 없|not found/i)
    .first();
  const errorAlert = page.getByRole("alert").filter({ hasText: /찾을 수 없/ });

  await expect(async () => {
    const nf = await notFound.isVisible().catch(() => false);
    const err = await errorAlert.isVisible().catch(() => false);
    expect(nf || err).toBe(true);
  }).toPass({ timeout: 10_000 });
});
