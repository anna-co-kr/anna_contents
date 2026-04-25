import { describe, it, expect } from "vitest";
import {
  buildRemixRequest,
  defaultLanguageFor,
  type SixDimTokens,
} from "./template-engine";

const SAMPLE_TOKENS: SixDimTokens = {
  subject: "editorial portrait — businessman with espresso cup",
  style: "modern korean editorial, quiet luxury",
  lighting: "soft window light, high-key bright",
  composition: "medium close-up, eye-level, generous negative space, slow push in",
  medium: "editorial photography, standard 50mm portrait, shallow depth f/2.8",
  mood: "confident corporate, refined morning ritual",
};

describe("defaultLanguageFor", () => {
  it("MJ는 en, NBP는 ko, Higgsfield는 en", () => {
    expect(defaultLanguageFor("midjourney")).toBe("en");
    expect(defaultLanguageFor("nano-banana")).toBe("ko");
    expect(defaultLanguageFor("higgsfield")).toBe("en");
  });
});

describe("buildRemixRequest — 6 조합 모두 작동", () => {
  const theme = "luxury hotel breakfast scene";

  it("MJ-en: --ar 등 MJ 파라미터 안내 포함", () => {
    const out = buildRemixRequest({
      tokens: SAMPLE_TOKENS,
      theme,
      tool: "midjourney",
      language: "en",
    });
    expect(out).toContain("Midjourney prompts in English");
    expect(out).toContain("--ar");
    expect(out).toContain(theme);
    expect(out).toContain(SAMPLE_TOKENS.subject);
  });

  it("MJ-ko: 한국어 본문 + MJ 파라미터 영어 병기", () => {
    const out = buildRemixRequest({
      tokens: SAMPLE_TOKENS,
      theme,
      tool: "midjourney",
      language: "ko",
    });
    expect(out).toContain("Midjourney 프롬프트");
    expect(out).toContain("--ar");
    expect(out).toContain("--style raw");
    expect(out).toContain(theme);
  });

  it("NBP-ko: 한국어 본문 + 6차원 한국어 라벨", () => {
    const out = buildRemixRequest({
      tokens: SAMPLE_TOKENS,
      theme,
      tool: "nano-banana",
      language: "ko",
    });
    expect(out).toContain("나노바나나");
    expect(out).toContain("피사체:");
    expect(out).toContain("3가지 안을 번호로");
  });

  it("NBP-en: 영어 본문 + 6 dimension 라벨", () => {
    const out = buildRemixRequest({
      tokens: SAMPLE_TOKENS,
      theme,
      tool: "nano-banana",
      language: "en",
    });
    expect(out).toContain("Nano Banana Pro");
    expect(out).toContain("subject:");
    expect(out).toContain("Return 3 numbered options");
  });

  it("Higgsfield-en: 키프레임/모션 분리 + 촬영 용어", () => {
    const out = buildRemixRequest({
      tokens: SAMPLE_TOKENS,
      theme,
      tool: "higgsfield",
      language: "en",
    });
    expect(out).toContain("Higgsfield prompts");
    expect(out).toContain("dolly in");
    expect(out).toContain("tracking shot");
    expect(out).toContain("Short imperative commands");
    expect(out).toContain("keyframe");
    expect(out).toContain("camera move");
  });

  it("Higgsfield-ko: 한국어 본문 + 영어 촬영 용어 유지", () => {
    const out = buildRemixRequest({
      tokens: SAMPLE_TOKENS,
      theme,
      tool: "higgsfield",
      language: "ko",
    });
    expect(out).toContain("Higgsfield 프롬프트");
    expect(out).toContain("dolly in");
    expect(out).toContain("키프레임");
    expect(out).toContain("짧은 명령형");
  });

  it("토큰 6 키 모두 출력에 들어감", () => {
    const out = buildRemixRequest({
      tokens: SAMPLE_TOKENS,
      theme,
      tool: "nano-banana",
      language: "ko",
    });
    expect(out).toContain(SAMPLE_TOKENS.subject);
    expect(out).toContain(SAMPLE_TOKENS.style);
    expect(out).toContain(SAMPLE_TOKENS.lighting);
    expect(out).toContain(SAMPLE_TOKENS.composition);
    expect(out).toContain(SAMPLE_TOKENS.medium);
    expect(out).toContain(SAMPLE_TOKENS.mood);
    expect(out).toContain(theme);
  });
});
