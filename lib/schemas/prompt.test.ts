import { describe, it, expect } from "vitest";
import {
  promptToolSchema,
  promptLanguageSchema,
  promptSourceSchema,
  DEFAULT_LANGUAGE_BY_TOOL,
  TOOL_DISPLAY_NAME,
  type PromptTool,
  type PromptLanguage,
} from "./prompt";

describe("promptToolSchema (3 도구)", () => {
  it("midjourney 유효", () => {
    expect(promptToolSchema.safeParse("midjourney").success).toBe(true);
  });

  it("nano-banana 유효", () => {
    expect(promptToolSchema.safeParse("nano-banana").success).toBe(true);
  });

  it("higgsfield 유효 (2026-04-24 추가)", () => {
    expect(promptToolSchema.safeParse("higgsfield").success).toBe(true);
  });

  it("enum 외 값 거부", () => {
    expect(promptToolSchema.safeParse("dalle").success).toBe(false);
    expect(promptToolSchema.safeParse("stable-diffusion").success).toBe(false);
    expect(promptToolSchema.safeParse("").success).toBe(false);
  });
});

describe("promptLanguageSchema (2 언어)", () => {
  it("en·ko 유효", () => {
    expect(promptLanguageSchema.safeParse("en").success).toBe(true);
    expect(promptLanguageSchema.safeParse("ko").success).toBe(true);
  });

  it("다른 언어 거부", () => {
    expect(promptLanguageSchema.safeParse("ja").success).toBe(false);
    expect(promptLanguageSchema.safeParse("zh").success).toBe(false);
  });
});

describe("promptSourceSchema", () => {
  it("copied/modified/remix 유효", () => {
    expect(promptSourceSchema.safeParse("copied").success).toBe(true);
    expect(promptSourceSchema.safeParse("modified").success).toBe(true);
    expect(promptSourceSchema.safeParse("remix").success).toBe(true);
  });

  it("enum 외 값 거부", () => {
    expect(promptSourceSchema.safeParse("original").success).toBe(false);
  });
});

describe("기본값 연동 맵 (DEFAULT_LANGUAGE_BY_TOOL)", () => {
  it("3 도구 전부 커버", () => {
    expect(DEFAULT_LANGUAGE_BY_TOOL.midjourney).toBe("en");
    expect(DEFAULT_LANGUAGE_BY_TOOL["nano-banana"]).toBe("ko");
    expect(DEFAULT_LANGUAGE_BY_TOOL.higgsfield).toBe("en");
  });

  it("TOOL_DISPLAY_NAME 3 도구 전부 있음", () => {
    expect(TOOL_DISPLAY_NAME.midjourney).toBe("Midjourney");
    expect(TOOL_DISPLAY_NAME["nano-banana"]).toBe("Nano Banana Pro");
    expect(TOOL_DISPLAY_NAME.higgsfield).toBe("Higgsfield");
  });
});

describe("6 조합 (tool × language) 전부 Zod 유효", () => {
  const tools: PromptTool[] = ["midjourney", "nano-banana", "higgsfield"];
  const langs: PromptLanguage[] = ["en", "ko"];

  for (const tool of tools) {
    for (const lang of langs) {
      it(`${tool} + ${lang} 조합 허용`, () => {
        expect(promptToolSchema.safeParse(tool).success).toBe(true);
        expect(promptLanguageSchema.safeParse(lang).success).toBe(true);
      });
    }
  }

  it("6 조합 총합이 정확히 6개", () => {
    let count = 0;
    for (const tool of tools) {
      for (const lang of langs) {
        if (
          promptToolSchema.safeParse(tool).success &&
          promptLanguageSchema.safeParse(lang).success
        ) {
          count++;
        }
      }
    }
    expect(count).toBe(6);
  });
});
