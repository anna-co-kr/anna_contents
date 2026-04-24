import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Task 011 E2E — 태그 Popover + 점수/스니펫 편집 Dialog.
 *
 * 검증 범위:
 *   - 카드 [🏷] 버튼 → Popover 노출, 태그 추가·삭제·datalist 자동완성
 *   - 카드 [✏️] 버튼 → Dialog 노출 + 점수 저장(dot slider) + 스니펫 CRUD
 *   - 6 조합(tool × language) 중 복수 조합 저장 시 UI 반영
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

  // 그리드가 비었으면 1개 드롭해서 카드를 하나 이상 확보
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  if (!(await firstCard.isVisible().catch(() => false))) {
    const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
    await page.locator('input[type="file"]').setInputFiles(sample);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });
  }
});

test("카드 [🏷] 버튼 → Popover 열림 → 태그 추가 → 즉시 반영", async ({
  page,
}) => {
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  await firstCard.getByRole("button", { name: "태그 편집" }).click();

  // Popover 노출
  await expect(
    page.getByRole("dialog").getByText("태그 편집", { exact: true }),
  ).toBeVisible({ timeout: 5_000 });

  // 무드 카테고리 선택 + 태그 입력
  await page.getByRole("combobox", { name: "태그 종류" }).selectOption("무드");
  const input = page.getByRole("combobox", { name: "새 태그" });
  const label = `test-tag-${Date.now()}`;
  await input.fill(label);
  await input.press("Enter");

  // 태그 칩 노출 (optimistic 반영)
  await expect(
    page.getByRole("dialog").getByText(label, { exact: true }),
  ).toBeVisible({ timeout: 5_000 });

  // 삭제 버튼 클릭 → 사라짐
  await page
    .getByRole("dialog")
    .getByRole("button", { name: `${label} 삭제` })
    .click();
  await expect(
    page.getByRole("dialog").getByText(label, { exact: true }),
  ).toHaveCount(0, { timeout: 5_000 });
});

test("카드 [✏️] 버튼 → 편집 Dialog → 점수 저장", async ({ page }) => {
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  await firstCard.getByRole("button", { name: "상세 편집" }).click();

  await expect(
    page.getByRole("dialog").getByText("레퍼런스 편집", { exact: true }),
  ).toBeVisible({ timeout: 5_000 });

  // dot slider role="slider" 포커스 후 End 키로 10점 세팅
  const slider = page.getByRole("slider", { name: "즐겨찾기 점수 (1~10)" });
  await slider.focus();
  await slider.press("End");

  // "점수 저장" 버튼 노출되고 클릭
  const saveBtn = page.getByRole("button", { name: "점수 저장" });
  await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  await saveBtn.click();

  // 성공 시 버튼이 사라지고 (dirty=false) 슬라이더는 "10 / 10"
  await expect(saveBtn).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText("10 / 10")).toBeVisible();
});

test("편집 Dialog → 스니펫 추가 → 목록 반영", async ({ page }) => {
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  await firstCard.getByRole("button", { name: "상세 편집" }).click();
  await expect(
    page.getByRole("dialog").getByText("레퍼런스 편집", { exact: true }),
  ).toBeVisible();

  // tool = Higgsfield 클릭 시 language 자동으로 en 세팅
  await page
    .getByRole("dialog")
    .getByRole("radio", { name: "Higgsfield" })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("radio", { name: "English" }),
  ).toHaveAttribute("aria-checked", "true");

  const snippetText = `test snippet ${Date.now()}`;
  await page
    .getByPlaceholder("프롬프트 텍스트 붙여넣기…")
    .fill(snippetText);

  await page
    .getByRole("dialog")
    .getByRole("button", { name: /스니펫 추가/ })
    .click();

  // 목록에 노출
  await expect(
    page.getByRole("dialog").getByText(snippetText, { exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  // 삭제로 정리
  await page
    .locator(`li:has-text("${snippetText}")`)
    .getByRole("button", { name: "스니펫 삭제" })
    .click();
  await expect(
    page.getByRole("dialog").getByText(snippetText, { exact: true }),
  ).toHaveCount(0, { timeout: 5_000 });
});

test("tool 변경 시 language 기본값 자동 세팅 (NBP→ko, MJ→en, Higgsfield→en)", async ({
  page,
}) => {
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  await firstCard.getByRole("button", { name: "상세 편집" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("레퍼런스 편집", { exact: true })).toBeVisible();

  // NBP → ko
  await dialog.getByRole("radio", { name: "Nano Banana Pro" }).click();
  await expect(dialog.getByRole("radio", { name: "한국어" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Midjourney → en
  await dialog.getByRole("radio", { name: "Midjourney" }).click();
  await expect(dialog.getByRole("radio", { name: "English" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Higgsfield → en
  await dialog.getByRole("radio", { name: "Higgsfield" }).click();
  await expect(dialog.getByRole("radio", { name: "English" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
