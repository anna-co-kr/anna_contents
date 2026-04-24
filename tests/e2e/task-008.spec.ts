import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Task 008 E2E — Claude Code 분석 연동.
 *
 * 시나리오:
 *   1. 이미지 드롭 후 "Claude Code 분석 요청 복사" 버튼 + paste 폼 노출
 *   2. 잘못된 JSON paste → 검증 실패 단계별 에러 (extract/parse/validate)
 *   3. 정상 6-key JSON paste → 저장 완료
 *   4. 수동 6필드 dialog → 저장 완료
 */

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const VALID_TOKENS = {
  subject: "ceramic teapot",
  style: "minimalist japanese",
  lighting: "soft diffused window light",
  composition: "centered close-up",
  medium: "editorial photography",
  mood: "serene contemplative",
};

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

test("이미지 드롭 후 Claude Code 분석 섹션 노출", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  // 분석 요청 복사 버튼 + paste form + 수동 폴백 노출
  await expect(
    page.getByRole("button", { name: /Claude Code 분석 요청 복사/ }),
  ).toBeVisible();
  await expect(page.getByText("Claude Code 응답 붙여넣기")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "수동 6필드 입력" }),
  ).toBeVisible();
});

test("정상 6-key JSON paste → 저장 완료", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const textarea = page.getByRole("textbox", {
    name: "Claude Code 응답 붙여넣기",
  });
  await textarea.fill(JSON.stringify(VALID_TOKENS, null, 2));

  await page.getByRole("button", { name: "검증 + 저장" }).click();

  await expect(page.getByText("6차원 토큰이 저장되었습니다")).toBeVisible({
    timeout: 15_000,
  });
});

test("코드펜스 포함 응답도 파싱 성공", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const withFence = "분석 결과:\n\n```json\n" + JSON.stringify(VALID_TOKENS, null, 2) + "\n```";
  const textarea = page.getByRole("textbox", {
    name: "Claude Code 응답 붙여넣기",
  });
  await textarea.fill(withFence);
  await page.getByRole("button", { name: "검증 + 저장" }).click();

  await expect(page.getByText("6차원 토큰이 저장되었습니다")).toBeVisible({
    timeout: 15_000,
  });
});

test("5-key JSON paste → Zod validate 단계 에러", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const drifted = { ...VALID_TOKENS } as Partial<typeof VALID_TOKENS>;
  delete drifted.mood;

  const textarea = page.getByRole("textbox", {
    name: "Claude Code 응답 붙여넣기",
  });
  await textarea.fill(JSON.stringify(drifted));
  await page.getByRole("button", { name: "검증 + 저장" }).click();

  await expect(page.getByText(/검증 실패/).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/6키 스키마 검증/)).toBeVisible();
});

test("깨진 JSON → parse 단계 에러", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const textarea = page.getByRole("textbox", {
    name: "Claude Code 응답 붙여넣기",
  });
  await textarea.fill("{ subject: no quotes here }");
  await page.getByRole("button", { name: "검증 + 저장" }).click();

  await expect(page.getByText(/JSON 파싱/).first()).toBeVisible({ timeout: 10_000 });
});

test("수동 6필드 입력 dialog → 저장 완료", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  for (const [key, value] of Object.entries(VALID_TOKENS)) {
    await page.locator(`#manual-${key}`).fill(value);
  }

  await page.getByRole("button", { name: "저장", exact: true }).click();

  // dialog 닫힌 후 success 메시지 또는 dialog 사라짐 확인
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
});

test("수동 dialog에서 빈 필드는 Zod 거부", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // 전부 비운 채 저장
  await page.getByRole("button", { name: "저장", exact: true }).click();

  // 에러 표시 (subject부터 비어있음) — dialog 내 role="alert"
  await expect(
    page.getByRole("alert").filter({ hasText: /비어있을 수 없습니다/ }),
  ).toBeVisible({ timeout: 5_000 });
});
