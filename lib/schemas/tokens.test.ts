import { describe, it, expect } from "vitest";
import { tokenSchema, TOKEN_KEYS, type Token } from "./tokens";

const validTokens: Token = {
  subject: "ceramic teapot",
  style: "minimalist japanese",
  lighting: "soft diffused window light",
  composition: "centered close-up",
  medium: "editorial photography",
  mood: "serene contemplative",
};

describe("tokenSchema", () => {
  it("정상 6-key 통과", () => {
    const result = tokenSchema.safeParse(validTokens);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("ceramic teapot");
    }
  });

  it("5-key 거부 (mood 누락)", () => {
    const invalid: Record<string, string> = { ...validTokens };
    delete invalid.mood;
    expect(tokenSchema.safeParse(invalid).success).toBe(false);
  });

  it("추가 키 거부 (.strict())", () => {
    const invalid = { ...validTokens, extra: "not allowed" };
    expect(tokenSchema.safeParse(invalid).success).toBe(false);
  });

  it("빈 문자열 거부", () => {
    const invalid = { ...validTokens, subject: "" };
    const result = tokenSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("잘못된 타입 거부 (number)", () => {
    const invalid = { ...validTokens, mood: 42 };
    expect(tokenSchema.safeParse(invalid).success).toBe(false);
  });

  it("null 값 거부", () => {
    const invalid = { ...validTokens, style: null };
    expect(tokenSchema.safeParse(invalid).success).toBe(false);
  });

  it("Claude Code 응답 샘플 (영어 토큰) parse 성공", () => {
    const sample: Token = {
      subject: "A ceramic teapot on a wooden table",
      style: "Japanese minimalist, wabi-sabi",
      lighting: "Soft natural light from left window, low contrast",
      composition: "Centered close-up, shallow depth of field",
      medium: "Editorial still life photography",
      mood: "Quiet, meditative, understated",
    };
    expect(tokenSchema.safeParse(sample).success).toBe(true);
  });

  it("드리프트 샘플 (추가 키 'description') parse 실패", () => {
    const drifted = {
      ...validTokens,
      description: "A serene scene with a teapot",
    };
    expect(tokenSchema.safeParse(drifted).success).toBe(false);
  });

  it("모든 6 키에 대해 누락·빈 문자열 각각 거부", () => {
    for (const key of TOKEN_KEYS) {
      const missing: Record<string, string> = { ...validTokens };
      delete missing[key];
      expect(
        tokenSchema.safeParse(missing).success,
        `${key} 누락은 거부돼야 함`,
      ).toBe(false);

      const empty = { ...validTokens, [key]: "" };
      expect(
        tokenSchema.safeParse(empty).success,
        `${key} 빈 문자열은 거부돼야 함`,
      ).toBe(false);
    }
  });
});
