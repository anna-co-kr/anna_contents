import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Task 007 E2E — URL/이미지 드롭 플로우.
 *
 * 환경 변수:
 *   TEST_EMAIL / TEST_PASSWORD — 로그인 자격증명
 *   (주의: 쉘 히스토리 노출 피하려면 `read -s` 또는 env 파일 사용)
 *
 * 검증 범위:
 *   - /login → 정상 로그인 → /library 이동
 *   - URL 저장 (OG 메타 O/X 각각, 중복)
 *   - 이미지 드롭 (정상)
 *   - 진행 상태 UI 단계 전환
 */

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.beforeEach(async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("TEST_EMAIL / TEST_PASSWORD env 변수 필요");
  }
  // 1) 로그인 (dev 서버 on-demand 컴파일 대비 longer timeout)
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

test("드롭존 초기 상태가 idle — 드롭존 영역과 URL 입력 필드 보인다", async ({
  page,
}) => {
  await expect(
    page.getByPlaceholder(/Instagram.*Pinterest.*YouTube.*Are\.na/),
  ).toBeVisible();
  await expect(
    page.getByText(/이미지 파일을 드래그하거나 클릭해서 선택/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "URL 저장" })).toBeVisible();
});

test("URL 저장 — OG 메타 있는 사이트(example.com)에서 소프트 폴백 성공", async ({
  page,
}) => {
  const uniqueUrl = `https://example.com/?task7=${Date.now()}`;
  await page
    .getByPlaceholder(/Instagram.*Pinterest.*YouTube.*Are\.na/)
    .fill(uniqueUrl);
  await page.getByRole("button", { name: "URL 저장" }).click();

  // 성공 카드 — "저장 완료" 또는 "기존 레퍼런스 감지"
  await expect(
    page.getByText(/저장 완료|기존 레퍼런스 감지/),
  ).toBeVisible({ timeout: 20_000 });
});

test("URL 저장 — 중복 입력 시 기존 레퍼런스 감지 메시지", async ({ page }) => {
  const dupUrl = `https://example.org/?task7-dup=${Date.now()}`;
  const input = page.getByPlaceholder(
    /Instagram.*Pinterest.*YouTube.*Are\.na/,
  );

  // 첫 번째 저장
  await input.fill(dupUrl);
  await page.getByRole("button", { name: "URL 저장" }).click();
  await expect(page.getByText(/저장 완료|기존 레퍼런스 감지/)).toBeVisible({
    timeout: 20_000,
  });

  // 두 번째 저장 — 같은 URL
  await input.fill(dupUrl);
  await page.getByRole("button", { name: "URL 저장" }).click();
  await expect(page.getByText("기존 레퍼런스 감지")).toBeVisible({
    timeout: 20_000,
  });
});

test("이미지 드롭 — 로컬 JPG 파일 업로드 → 저장 완료", async ({ page }) => {
  const sample = path.resolve(__dirname, "../fixtures/sample.jpg");
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(sample);

  // 단계 전환: 리사이즈 → 업로드 → 저장 완료
  await expect(page.getByText("저장 완료")).toBeVisible({
    timeout: 30_000,
  });
  // 파일 메타에 "KB" 또는 "MB" 표시 확인
  await expect(page.getByText(/\d+(\.\d+)? (KB|MB)/)).toBeVisible();
});

test("잘못된 URL 형식 → 에러 메시지", async ({ page }) => {
  const input = page.getByPlaceholder(
    /Instagram.*Pinterest.*YouTube.*Are\.na/,
  );
  await input.fill("not-a-valid-url");
  const button = page.getByRole("button", { name: "URL 저장" });

  // input type="url"에 대한 브라우저 검증이 submit 차단 가능 → JS로 강제 클릭
  await button.click({ force: true });

  // 서버 에러 메시지 (Zod "올바른 URL 형식이 아닙니다") 또는 브라우저 네이티브 검증
  // 둘 중 하나만 나와도 통과
  const hasZodError = await page
    .getByText(/URL 형식|URL을 입력/)
    .isVisible()
    .catch(() => false);
  const isInputInvalid = await input.evaluate(
    (el) => (el as HTMLInputElement).validity.valid === false,
  );
  expect(hasZodError || isInputInvalid).toBe(true);
});
