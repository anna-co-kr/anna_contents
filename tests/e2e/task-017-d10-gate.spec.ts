import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Task 017 D10 게이트 — V1 코어 E2E 점검 (3-tier 판정).
 *
 * 자동화 범위 (F001 / F002 / F003 13항목 중 외부 의존 제외 항목):
 *   F001-A: 이미지 직접 업로드 + 저장 완료 토스트
 *   F001-B: 수동 6필드 입력 폴백 → source='manual' 저장
 *   F001-C: Zod 거부 — 5-key JSON paste 시 인라인 에러 + 재입력 가능
 *   F002-A: 점수·태그·스니펫 저장 + 재진입 시 유지 (스니펫 tool/language 포함)
 *   F002-B: [copy prompt] → localStorage tool/language 메타 기록 + 페어 로그 토스트 액션
 *   F002-C: 토큰 편집(수동 6필드 dialog prefill) 동작
 *   F003-A: NBP-ko 세션 페어 저장 (실사용 1순위, 최소 2건 → iteration 카운트 증가)
 *   F003-B: Higgsfield-en 세션 페어 저장 (영상 용어, 최소 1건)
 *   F003-C: MJ-en + Cmd+V 스마트 매칭 → /pairs prefill (최소 1건)
 *   F003-D: 언어 override — NBP+en 저장 가능 (6 조합 자유 검증)
 *
 * 자동화 제외 (안나 수동 점검 항목, d10-gate.md에 별도 기록):
 *   - IG/Pinterest URL 드롭 (외부 OG 의존)
 *   - Claude Code 왕복 paste (안나 세션 비결정적)
 *   - 실 사용 왕복 1회 (PRD 요구)
 */

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const SAMPLE_PATH = path.resolve(__dirname, "../fixtures/sample.jpg");

const SAMPLE_TOKENS_EN = {
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

async function dropSampleAndCaptureRefId(page: Page): Promise<string> {
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PATH);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });
  const firstCard = page.locator('[data-testid^="reference-card-"]').first();
  const cardId = await firstCard.getAttribute("data-testid");
  expect(cardId).toMatch(/^reference-card-[0-9a-f-]{36}$/);
  return cardId!.replace("reference-card-", "");
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

// ─── F001 ──────────────────────────────────────────────────────────────────

test("F001-A 이미지 직접 업로드 → 저장 완료", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PATH);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });
  // AnalysisSection 노출
  await expect(
    page.getByRole("button", { name: /Claude Code 분석 요청 복사/ }),
  ).toBeVisible();
});

test("F001-B 수동 6필드 폴백 → 상세 페이지에 토큰 노출 (source=manual)", async ({
  page,
}) => {
  const refId = await dropSampleAndCaptureRefId(page);

  // 상세 페이지에서 manual dialog로 저장 (라이브러리 컨텍스트의 revalidate race 회피)
  await page.goto(`/library/${refId}`);
  await expect(
    page.getByRole("heading", { name: "6차원 토큰" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const [key, value] of Object.entries(SAMPLE_TOKENS_EN)) {
    await page.locator(`#manual-${key}`).fill(value);
  }
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });

  await expect(async () => {
    await page.reload();
    await expect(
      page
        .locator("section", {
          has: page.getByRole("heading", { name: "6차원 토큰" }),
        })
        .getByText("ceramic teapot"),
    ).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
});

test("F001-C Zod 거부 — 5-key paste 시 인라인 에러 + 재입력 가능", async ({
  page,
}) => {
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PATH);
  await expect(page.getByText("저장 완료")).toBeVisible({ timeout: 30_000 });

  const fivePartial = JSON.stringify({
    subject: "ceramic teapot",
    style: "minimalist",
    lighting: "soft",
    composition: "centered",
    medium: "photo",
    // mood 누락
  });

  const paste = page.getByLabel("Claude Code 응답 붙여넣기");
  await paste.fill(fivePartial);
  await page.getByRole("button", { name: "검증 + 저장" }).click();

  // 인라인 에러 노출 (구조 검증 실패)
  const alert = page.getByRole("alert").filter({ hasText: /(검증|mood|6)/ });
  await expect(alert.first()).toBeVisible({ timeout: 10_000 });

  // 재입력 가능 — 6키로 다시 채우면 통과해야 함
  const sixComplete = JSON.stringify(SAMPLE_TOKENS_EN);
  await paste.fill(sixComplete);
  await page.getByRole("button", { name: "검증 + 저장" }).click();
  await expect(page.getByText("6차원 토큰이 저장되었습니다")).toBeVisible({
    timeout: 10_000,
  });
});

// ─── F002 ──────────────────────────────────────────────────────────────────

test("F002-A 점수·태그·스니펫 저장 + 재진입 유지 (tool/language 포함)", async ({
  page,
}) => {
  const refId = await dropSampleAndCaptureRefId(page);

  // 토큰 먼저 저장 (스니펫 추가 폼 노출 조건 아님 — 그러나 상세 페이지 이동 위해)
  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  const tokenDialog = page.getByRole("dialog");
  for (const [k, v] of Object.entries(SAMPLE_TOKENS_EN)) {
    await page.locator(`#manual-${k}`).fill(v);
  }
  await tokenDialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(tokenDialog).toBeHidden({ timeout: 15_000 });

  // 상세 페이지로
  await page.goto(`/library/${refId}`);
  await expect(page.getByRole("heading", { name: "즐겨찾기 점수" })).toBeVisible();

  // 태그 추가 (Popover)
  await page.getByRole("button", { name: "태그 편집" }).click();
  await expect(
    page.getByRole("dialog").getByText("태그 편집", { exact: true }),
  ).toBeVisible({ timeout: 5_000 });
  const tagInput = page.getByRole("combobox", { name: "새 태그" });
  const tagLabel = `gate-tag-${Date.now()}`;
  await tagInput.fill(tagLabel);
  await tagInput.press("Enter");
  // optimistic + DB 저장 모두 반영될 때까지 대기 (popover 안에서 칩이 더 이상 temp- 상태가 아니어야 함)
  await expect(
    page.getByRole("dialog").getByText(tagLabel, { exact: true }),
  ).toBeVisible({ timeout: 5_000 });
  await expect
    .poll(
      async () => {
        const removeBtn = page
          .getByRole("dialog")
          .getByRole("button", { name: `${tagLabel} 삭제` });
        return await removeBtn.isDisabled().catch(() => true);
      },
      { timeout: 10_000 },
    )
    .toBe(false);
  // popover 닫기
  await page.keyboard.press("Escape");

  // 스니펫 추가 (NBP + ko)
  const snippetSection = page.locator("section", {
    hasText: "프롬프트 스니펫",
  });
  // Higgsfield/Midjourney가 아닌 nano-banana 라디오 선택 (기본값일 수도)
  await snippetSection
    .getByRole("radio", { name: "Nano Banana Pro" })
    .click();
  await snippetSection.getByRole("radio", { name: "한국어" }).click();
  const snippetText = `gate-snippet ${Date.now()} 도자기 주전자 클로즈업`;
  await snippetSection
    .getByPlaceholder("프롬프트 텍스트 붙여넣기…")
    .fill(snippetText);
  await snippetSection.getByRole("button", { name: /스니펫 추가/ }).click();
  await expect(snippetSection.getByText(snippetText, { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  // 새로고침 → 유지 검증 (revalidate race 대응 재시도)
  await expect(async () => {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "즐겨찾기 점수" }),
    ).toBeVisible();
    await expect(page.getByText(tagLabel).first()).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 15_000 });
  await expect(
    page
      .locator("section", { hasText: "프롬프트 스니펫" })
      .getByText(snippetText),
  ).toBeVisible();
  // tool/language 칩 노출
  await expect(
    page
      .locator("section", { hasText: "프롬프트 스니펫" })
      .getByText("Nano Banana Pro")
      .first(),
  ).toBeVisible();
});

test("F002-B [copy prompt] → localStorage tool/language 메타 + 페어 로그 토스트 액션", async ({
  page,
}) => {
  const refId = await dropSampleAndCaptureRefId(page);
  await page.goto(`/library/${refId}`);

  // 스니펫이 없으니 추가 (NBP-ko)
  const section = page.locator("section", { hasText: "프롬프트 스니펫" });
  await section.getByRole("radio", { name: "Nano Banana Pro" }).click();
  await section.getByRole("radio", { name: "한국어" }).click();
  const txt = `copy-test ${Date.now()} 한국어 프롬프트`;
  await section.getByPlaceholder("프롬프트 텍스트 붙여넣기…").fill(txt);
  await section.getByRole("button", { name: /스니펫 추가/ }).click();
  await expect(section.getByText(txt, { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  // copy 버튼 클릭
  await section
    .locator(`li:has-text("${txt}")`)
    .getByRole("button", { name: "스니펫 복사" })
    .click();

  // 토스트 + 액션 버튼 노출
  await expect(page.getByText("프롬프트 복사 완료")).toBeVisible({
    timeout: 5_000,
  });
  const toastAction = page.getByRole("button", { name: /페어 로그/ });
  await expect(toastAction).toBeVisible();

  // localStorage tool/language 메타 검증
  const recent = await page.evaluate(() => {
    const raw = localStorage.getItem("promptStudio.recentCopiedPrompt");
    return raw ? JSON.parse(raw) : null;
  });
  expect(recent).toMatchObject({
    tool: "nano-banana",
    language: "ko",
    referenceId: refId,
  });
  expect(recent.text).toBe(txt);
});

test("F002-C 토큰 편집 dialog prefill", async ({ page }) => {
  const refId = await dropSampleAndCaptureRefId(page);

  // 상세 페이지에서 manual 저장 → 곧바로 dialog 다시 열어 prefill 검증
  await page.goto(`/library/${refId}`);
  await expect(
    page.getByRole("heading", { name: "6차원 토큰" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  const dlg = page.getByRole("dialog");
  for (const [k, v] of Object.entries(SAMPLE_TOKENS_EN)) {
    await page.locator(`#manual-${k}`).fill(v);
  }
  await dlg.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dlg).toBeHidden({ timeout: 15_000 });

  // 토큰이 페이지에 노출될 때까지 대기 (cacheComponents revalidate race 대응)
  await expect(async () => {
    await page.reload();
    await expect(
      page
        .locator("section", {
          has: page.getByRole("heading", { name: "6차원 토큰" }),
        })
        .getByText("ceramic teapot"),
    ).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });

  // 다시 dialog 열기 → 모든 필드 prefill
  await page.getByRole("button", { name: "수동 6필드 입력" }).click();
  const reopen = page.getByRole("dialog");
  await expect(reopen).toBeVisible();
  for (const [k, v] of Object.entries(SAMPLE_TOKENS_EN)) {
    await expect(page.locator(`#manual-${k}`)).toHaveValue(v);
  }
});

// ─── F003 ──────────────────────────────────────────────────────────────────

async function fillPair(page: Page, promptText: string) {
  const ta = page.getByLabel("프롬프트 본문");
  await ta.fill(promptText);
}

async function submitPair(page: Page) {
  await page.getByRole("button", { name: /^페어 저장$/ }).click();
}

test("F003-A NBP-ko 세션 페어 저장 2건 → iteration #1·#2 증가", async ({
  page,
}) => {
  await page.goto("/pairs");
  // 새 세션부터 시작 (전 테스트의 누적이 있을 수 있음)
  await page.getByRole("button", { name: /새 세션/ }).click();

  // 1차
  await page.getByRole("radio", { name: "Nano Banana Pro" }).click();
  // 한국어가 자동 연동되어야 함
  await expect(
    page.locator('[aria-label="언어 선택"] [aria-checked="true"]'),
  ).toHaveText("한국어");
  await fillPair(page, "도자기 주전자, 부드러운 창가 빛, 미니멀 일본식 미감");
  // self_rating 4
  await page.locator('[aria-label="프롬프트 자체 만족도"] [role="radio"]').nth(3).click();
  await submitPair(page);
  await expect(page.getByText(/iteration\s+#1/)).toBeVisible({ timeout: 10_000 });

  // 2차 — 같은 세션 (자동 재사용)
  await fillPair(page, "도자기 주전자, 골든아워, 따뜻한 톤");
  await page.locator('[aria-label="프롬프트 자체 만족도"] [role="radio"]').nth(4).click();
  await submitPair(page);
  await expect(page.getByText(/iteration\s+#2/)).toBeVisible({ timeout: 10_000 });
});

test("F003-B Higgsfield-en 세션 영상 용어 페어 저장", async ({ page }) => {
  await page.goto("/pairs");
  await page.getByRole("button", { name: /새 세션/ }).click();

  await page.getByRole("radio", { name: "Higgsfield" }).click();
  await expect(
    page.locator('[aria-label="언어 선택"] [aria-checked="true"]'),
  ).toHaveText("English");
  await fillPair(
    page,
    "dolly in to ceramic teapot, tracking shot, soft window light, 24fps",
  );
  await submitPair(page);
  await expect(page.getByText(/iteration\s+#1/)).toBeVisible({ timeout: 10_000 });
});

test("F003-C MJ + Cmd+V 스마트 매칭 → /pairs prefill", async ({ page }) => {
  // 1) 라이브러리에서 MJ-en 스니펫 만들고 copy
  const refId = await dropSampleAndCaptureRefId(page);
  await page.goto(`/library/${refId}`);
  const section = page.locator("section", { hasText: "프롬프트 스니펫" });
  await section.getByRole("radio", { name: "Midjourney" }).click();
  await section.getByRole("radio", { name: "English" }).click();
  const txt = `mj-smart-match ${Date.now()} editorial ceramic --ar 4:5`;
  await section.getByPlaceholder("프롬프트 텍스트 붙여넣기…").fill(txt);
  await section.getByRole("button", { name: /스니펫 추가/ }).click();
  await expect(section.getByText(txt, { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await section
    .locator(`li:has-text("${txt}")`)
    .getByRole("button", { name: "스니펫 복사" })
    .click();
  await expect(page.getByText("프롬프트 복사 완료")).toBeVisible({
    timeout: 5_000,
  });

  // 2) /pairs로 이동 → 컨펌 카드 노출 → accept → prefill
  await page.goto("/pairs");
  await page
    .getByRole("button", { name: /프롬프트 불러오기/ })
    .click();

  await expect(page.getByLabel("프롬프트 본문")).toHaveValue(txt);
  await expect(
    page.locator('[aria-label="도구 선택"] [aria-checked="true"]'),
  ).toHaveText("Midjourney");
  await expect(
    page.locator('[aria-label="언어 선택"] [aria-checked="true"]'),
  ).toHaveText("English");
  // referenceId 칩 링크 노출
  await expect(page.getByRole("link", { name: new RegExp(refId.slice(0, 8)) }))
    .toBeVisible();

  await submitPair(page);
  await expect(page.getByText(/iteration\s+#\d+/)).toBeVisible({
    timeout: 10_000,
  });
});

test("F003-D 언어 override — NBP+en 6 조합 자유 검증", async ({ page }) => {
  await page.goto("/pairs");
  await page.getByRole("button", { name: /새 세션/ }).click();

  await page.getByRole("radio", { name: "Nano Banana Pro" }).click();
  // 자동 연동된 한국어 → English로 수동 override
  await page.getByRole("radio", { name: "English" }).click();
  await expect(
    page.locator('[aria-label="언어 선택"] [aria-checked="true"]'),
  ).toHaveText("English");

  // tool 다시 NBP로 클릭 → languageDirty 유지 검증
  await page.getByRole("radio", { name: "Nano Banana Pro" }).click();
  await expect(
    page.locator('[aria-label="언어 선택"] [aria-checked="true"]'),
  ).toHaveText("English");

  await fillPair(page, "Nano Banana Pro override: editorial product still");
  await submitPair(page);
  await expect(page.getByText(/iteration\s+#\d+/)).toBeVisible({
    timeout: 10_000,
  });
});
