import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * F002 PRD gap 회귀 — Task 013 확장 검증.
 *
 * Gap #1: 상세 페이지에서 "수동 6필드 입력" Dialog 열면 기존 토큰이 prefill.
 * Gap #2: 상세 페이지에서 스니펫 CRUD를 Dialog 경유 없이 직접 수행.
 */

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const SAMPLE_TOKENS = {
  subject: "ceramic teapot",
  style: "minimalist japanese",
  lighting: "soft diffused window light",
  composition: "centered close-up",
  medium: "editorial photography",
  mood: "serene contemplative",
};

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

test("Gap #1 — 상세 페이지 수동 6필드 Dialog가 기존 토큰을 prefill", async ({
  page,
}) => {
  // 새 이미지 드롭 → 토큰 수동 저장 → 상세 진입 → Dialog 재오픈 시 값 prefill
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const [key, value] of Object.entries(SAMPLE_TOKENS)) {
    await page.locator(`#manual-${key}`).fill(value);
  }
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });

  // 방금 저장한 카드 상세 진입
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  const refId = (await firstCard.getAttribute("data-testid"))!.replace(
    "reference-card-",
    "",
  );
  // revalidatePath 반영 기다림 — 재시도 goto로 상세 페이지가 최신 토큰을 실제 렌더할 때까지 대기
  await expect(async () => {
    await page.goto(`/library/${refId}`);
    await expect(
      page.getByRole("heading", { name: "6차원 토큰" }),
    ).toBeVisible();
    // 6차원 토큰 섹션에 저장한 subject 값이 노출돼야 함
    const tokensSection = page.locator("section", {
      has: page.getByRole("heading", { name: "6차원 토큰" }),
    });
    await expect(tokensSection.getByText("ceramic teapot")).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 15_000 });

  // "수동 6필드 입력" 버튼 클릭 → prefill 확인
  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  const reopen = page.getByRole("dialog");
  await expect(reopen).toBeVisible();

  for (const [key, value] of Object.entries(SAMPLE_TOKENS)) {
    await expect(page.locator(`#manual-${key}`)).toHaveValue(value);
  }
});

test("Gap #2 — 상세 페이지에서 스니펫을 Dialog 경유 없이 직접 추가·삭제", async ({
  page,
}) => {
  // 상세 페이지 준비
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  const refId = (await firstCard.getAttribute("data-testid"))!.replace(
    "reference-card-",
    "",
  );
  await page.goto(`/library/${refId}`);

  const section = page.locator("section", {
    hasText: "프롬프트 스니펫",
  });
  await expect(section).toBeVisible();

  // 추가 폼이 바로 노출돼야 함 (Dialog 없이)
  await expect(section.getByRole("radio", { name: "Higgsfield" })).toBeVisible();

  // 스니펫 하나 추가
  const text = `detail-direct ${Date.now()} moody tracking shot`;
  await section.getByRole("radio", { name: "Higgsfield" }).click();
  await section.getByPlaceholder("프롬프트 텍스트 붙여넣기…").fill(text);
  await section.getByRole("button", { name: /스니펫 추가/ }).click();

  await expect(section.getByText(text, { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  // 직접 복사 (토스트)
  await section
    .locator(`li:has-text("${text}")`)
    .getByRole("button", { name: "스니펫 복사" })
    .click();
  await expect(page.getByText("프롬프트 복사 완료")).toBeVisible({
    timeout: 5_000,
  });

  // 직접 삭제
  await section
    .locator(`li:has-text("${text}")`)
    .getByRole("button", { name: "스니펫 삭제" })
    .click();
  await expect(section.getByText(text, { exact: true })).toHaveCount(0, {
    timeout: 5_000,
  });
});
