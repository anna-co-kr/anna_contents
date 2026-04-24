/**
 * 클립보드 복사 — 3단 폴백 (ENG-9 autoplan).
 *
 *  1) navigator.clipboard.writeText()          (보안 컨텍스트 + 권한 허용)
 *  2) <textarea> + document.execCommand("copy") (비HTTPS, 구형 브라우저)
 *  3) window.prompt()                           (완전 실패 폴백 — 사용자에게 수동 Ctrl+C 유도)
 *
 * 반환: "clipboard" | "exec" | "prompt" — 어떤 단계로 성공했는지.
 *      fatal 실패 시 throw.
 *
 *  - SSR guard: document / window 접근 전 타입 체크
 *  - drop-zone.tsx 의 buildAnalysisRequest prompt 복사와 Task 012 스니펫 copy 공용
 */
export type CopyOutcome = "clipboard" | "exec" | "prompt";

export async function copyWithFallback(text: string): Promise<CopyOutcome> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("클립보드는 브라우저 환경에서만 사용 가능합니다");
  }

  // 1) 권장 경로
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "clipboard";
    }
  } catch {
    // fall through
  }

  // 2) execCommand 폴백
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return "exec";
  } catch {
    // fall through
  }

  // 3) 최종 폴백 — 사용자에게 수동 복사 요청
  window.prompt("클립보드 접근 실패 · 아래 텍스트를 직접 복사하세요:", text);
  return "prompt";
}
