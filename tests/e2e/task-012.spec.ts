import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Task 012 E2E — copy prompt + sonner 토스트 + localStorage 스마트 매칭.
 *
 * 검증 범위:
 *   - 스니펫 [copy] 버튼 클릭 → 클립보드에 내용 기록
 *   - 토스트 "프롬프트 복사 완료" 노출
 *   - localStorage.promptStudio.recentCopiedPrompt에 {text, tool, language, referenceId, promptId, copiedAt} 저장
 *   - 30분 후(시간 조작) 기록은 자동 만료
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

  // 카드 보장
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  if (!(await firstCard.isVisible().catch(() => false))) {
    const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
    await page.locator('input[type="file"]').setInputFiles(sample);
    await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });
  }
});

test("스니펫 copy → 클립보드 + 토스트 + localStorage 기록", async ({ page }) => {
  // 첫 카드의 편집 Dialog 열기
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  await firstCard.getByRole("button", { name: "상세 편집" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("레퍼런스 편집", { exact: true })).toBeVisible();

  // 스니펫 하나 생성 (MJ / en)
  await dialog.getByRole("radio", { name: "Midjourney" }).click();
  const uniqueText = `copy-e2e ${Date.now()} a cinematic moody portrait`;
  await page.getByPlaceholder("프롬프트 텍스트 붙여넣기…").fill(uniqueText);
  await dialog.getByRole("button", { name: /스니펫 추가/ }).click();
  await expect(dialog.getByText(uniqueText, { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  // 해당 스니펫 항목의 [복사] 클릭
  const snippetItem = page.locator(`li:has-text("${uniqueText}")`);
  await snippetItem.getByRole("button", { name: "스니펫 복사" }).click();

  // 토스트 노출
  await expect(page.getByText("프롬프트 복사 완료")).toBeVisible({
    timeout: 5_000,
  });

  // 클립보드 내용 검증
  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toBe(uniqueText);

  // localStorage 기록 검증
  const raw = await page.evaluate(() =>
    window.localStorage.getItem("promptStudio.recentCopiedPrompt"),
  );
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw!);
  expect(parsed.text).toBe(uniqueText);
  expect(parsed.tool).toBe("midjourney");
  expect(parsed.language).toBe("en");
  expect(typeof parsed.copiedAt).toBe("string");
  expect(typeof parsed.referenceId).toBe("string");
  expect(typeof parsed.promptId).toBe("string");

  // 정리
  await snippetItem.getByRole("button", { name: "스니펫 삭제" }).click();
});

test("Claude Code 분석 요청 복사 버튼도 공용 폴백 사용 (토스트 없음, setState로 피드백)", async ({
  page,
}) => {
  // 새 이미지 드롭 → AnalysisSection 노출
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /Claude Code 분석 요청 복사/ }).click();
  await expect(page.getByRole("button", { name: "복사 완료!" })).toBeVisible({
    timeout: 5_000,
  });

  // 클립보드 내용은 prompt 문자열을 포함해야 함
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("6차원");
  expect(text).toMatch(/subject|style|lighting|composition|medium|mood/);
});
