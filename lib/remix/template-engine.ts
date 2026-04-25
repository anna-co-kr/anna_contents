/**
 * Task 028 (F006) — 리믹스 요청 프롬프트 생성기 (클라이언트 템플릿 엔진).
 *
 * 기준 레퍼런스의 6차원 토큰 + 새 주제 + (tool, language) 조합을 받아
 * Claude Code에 붙여넣을 완성된 요청 문장을 조립한다.
 *
 * **외부 API 호출 0** — pure function, 클라이언트·서버 양쪽에서 호출 가능.
 *
 * 6 템플릿 정의는 ROADMAP Task 028에 박아둔 거 그대로:
 * - MJ-en / MJ-ko / NBP-en / NBP-ko / Higgsfield-en / Higgsfield-ko
 *
 * Higgsfield는 영상 우선이라 키프레임-모션 분리 + 짧은 명령형 + 촬영 용어 강조 (PRD).
 */

export type RemixTool = "midjourney" | "nano-banana" | "higgsfield";
export type RemixLanguage = "en" | "ko";

export type SixDimTokens = {
  subject: string;
  style: string;
  lighting: string;
  composition: string;
  medium: string;
  mood: string;
};

export type RemixRequest = {
  tokens: SixDimTokens;
  theme: string;
  tool: RemixTool;
  language: RemixLanguage;
};

/**
 * tool에 따른 default language. 안나 실사용 패턴:
 * - MJ → en (추상·영어 기본)
 * - NBP → ko (실물·한국어 기본)
 * - Higgsfield → en (영상·영어 + 촬영 용어)
 *
 * 안나가 UI에서 수동 override 가능 (6 조합 자유).
 */
export function defaultLanguageFor(tool: RemixTool): RemixLanguage {
  if (tool === "nano-banana") return "ko";
  return "en";
}

/**
 * 6 템플릿 중 (tool, language) 키로 하나 선택해 조립.
 * Claude Code 데스크탑 앱 paste 안정성을 위해 본 함수가 반환하는 문자열은
 * 줄바꿈을 포함 — 사용자 측에서 single-line 변환이 필요하면 별도 후처리.
 * (F001 prompt-builder는 single-line default지만 F006는 후보 3개 출력이 본질이라
 *  Claude 응답 가독성 우선 — 다만 paste 시 라인 단위 send를 마주하면 single-line 옵션 추가 검토)
 */
export function buildRemixRequest({
  tokens,
  theme,
  tool,
  language,
}: RemixRequest): string {
  const t = tokens;

  if (tool === "midjourney" && language === "en") {
    return [
      "Generate 3 Midjourney prompts in English based on these 6-dimension attributes:",
      `subject: ${t.subject}, style: ${t.style}, lighting: ${t.lighting},`,
      `composition: ${t.composition}, medium: ${t.medium}, mood: ${t.mood}`,
      `New subject: ${theme}`,
      "Use Midjourney syntax (--ar 16:9, --style raw, etc.). Return 3 numbered options.",
    ].join("\n");
  }

  if (tool === "midjourney" && language === "ko") {
    return [
      "다음 6차원을 토대로 Midjourney 프롬프트 후보 3개를 한국어로 제시:",
      `피사체: ${t.subject} / 스타일: ${t.style} / 조명: ${t.lighting} /`,
      `구도: ${t.composition} / 매체: ${t.medium} / 분위기: ${t.mood}`,
      `새 주제: ${theme}`,
      "각 후보 끝에 --ar, --style raw 등 MJ 파라미터 영어로 병기.",
    ].join("\n");
  }

  if (tool === "nano-banana" && language === "ko") {
    return [
      "다음 6차원 분석을 토대로 나노바나나 프롬프트 3개를 한국어로 생성해주세요:",
      `피사체: ${t.subject}, 스타일: ${t.style}, 조명: ${t.lighting},`,
      `구도: ${t.composition}, 매체: ${t.medium}, 분위기: ${t.mood}`,
      `새 주제: ${theme}`,
      "배경·피사체·조명·분위기를 명시적으로 서술. 3가지 안을 번호로 반환.",
    ].join("\n");
  }

  if (tool === "nano-banana" && language === "en") {
    return [
      "Generate 3 Nano Banana Pro prompts in English based on these dimensions:",
      `subject: ${t.subject}, style: ${t.style}, lighting: ${t.lighting},`,
      `composition: ${t.composition}, medium: ${t.medium}, mood: ${t.mood}`,
      `New subject: ${theme}`,
      "Describe background, subject, lighting, mood explicitly. Return 3 numbered options.",
    ].join("\n");
  }

  if (tool === "higgsfield" && language === "en") {
    return [
      "Generate 3 Higgsfield prompts in English for video/motion generation.",
      `Base dimensions: subject: ${t.subject}, style: ${t.style}, lighting: ${t.lighting},`,
      `composition: ${t.composition}, medium: ${t.medium}, mood: ${t.mood}`,
      `New subject: ${theme}`,
      "Rules:",
      '- Short imperative commands (no polite filler, no "please")',
      "- Separate image layout from motion: first line locks keyframe (lighting, lens, framing),",
      "  second line specifies camera move + subject action + strong verb",
      "- Use cinematic terms: dolly in/out, tracking shot, slow motion, push-in, orbit",
      "- One clear beat per line",
      "Return 3 numbered options.",
    ].join("\n");
  }

  // higgsfield-ko
  return [
    "Higgsfield 프롬프트 3개를 한국어로 생성. 영어 촬영 용어(dolly in, tracking shot, slow motion 등)는 그대로 유지.",
    `6차원: 피사체: ${t.subject}, 스타일: ${t.style}, 조명: ${t.lighting},`,
    `구도: ${t.composition}, 매체: ${t.medium}, 분위기: ${t.mood}`,
    `새 주제: ${theme}`,
    "규칙:",
    "- 짧은 명령형 (정중한 표현 금지)",
    "- 키프레임(조명·렌즈·프레이밍)과 모션(카메라 무브·주체 동작·강한 동사) 분리 서술",
    "- 각 비트를 한 줄에",
    "3가지 안을 번호로 반환.",
  ].join("\n");
}
