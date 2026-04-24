import { describe, it, expect } from "vitest";
import { parseClaudeCodeResponse } from "./paste-parser";

const validJson = {
  subject: "ceramic teapot",
  style: "minimalist japanese",
  lighting: "soft diffused window light",
  composition: "centered close-up",
  medium: "editorial photography",
  mood: "serene contemplative",
};

describe("parseClaudeCodeResponse — 정상 경로", () => {
  it("순수 JSON 문자열 파싱 성공", () => {
    const result = parseClaudeCodeResponse(JSON.stringify(validJson));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tokens.subject).toBe("ceramic teapot");
      expect(result.tokens.mood).toBe("serene contemplative");
    }
  });

  it("pretty-printed JSON 파싱 성공", () => {
    const result = parseClaudeCodeResponse(JSON.stringify(validJson, null, 2));
    expect(result.ok).toBe(true);
  });

  it("```json ... ``` 코드펜스 포함 응답 파싱", () => {
    const raw = `분석 결과입니다:\n\n\`\`\`json\n${JSON.stringify(validJson, null, 2)}\n\`\`\`\n필요하면 수정해 드릴게요.`;
    const result = parseClaudeCodeResponse(raw);
    expect(result.ok).toBe(true);
  });

  it("``` ... ``` 언어 태그 없는 코드펜스 파싱", () => {
    const raw = `\`\`\`\n${JSON.stringify(validJson)}\n\`\`\``;
    const result = parseClaudeCodeResponse(raw);
    expect(result.ok).toBe(true);
  });

  it("설명 문장 + JSON 블록 혼합 (코드펜스 없음) 파싱", () => {
    const raw = `Here is the analysis:\n\n${JSON.stringify(validJson)}\n\nLet me know if you need adjustments.`;
    const result = parseClaudeCodeResponse(raw);
    expect(result.ok).toBe(true);
  });

  it("중첩 객체가 value 내에 있는 문자열은 균형 추출 간섭 없음", () => {
    const withBraces = {
      ...validJson,
      style: "a style with {curly} in description",
    };
    const result = parseClaudeCodeResponse(JSON.stringify(withBraces));
    expect(result.ok).toBe(true);
  });
});

describe("parseClaudeCodeResponse — 실패 경로", () => {
  it("빈 응답 거부 (stage=extract)", () => {
    const result = parseClaudeCodeResponse("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("extract");
  });

  it("JSON 없는 텍스트 거부 (stage=extract)", () => {
    const result = parseClaudeCodeResponse(
      "이미지를 분석할 수 없었어요. 다시 시도해주세요.",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("extract");
  });

  it("깨진 JSON 거부 (stage=parse)", () => {
    const result = parseClaudeCodeResponse("{ subject: no quotes }");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("parse");
  });

  it("드리프트 5-key (mood 누락) 거부 (stage=validate)", () => {
    const drifted = {
      subject: validJson.subject,
      style: validJson.style,
      lighting: validJson.lighting,
      composition: validJson.composition,
      medium: validJson.medium,
    };
    const result = parseClaudeCodeResponse(JSON.stringify(drifted));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("validate");
  });

  it("드리프트 (추가 키 'description') 거부 (stage=validate)", () => {
    const drifted = { ...validJson, description: "a serene scene" };
    const result = parseClaudeCodeResponse(JSON.stringify(drifted));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("validate");
  });

  it("드리프트 (빈 문자열) 거부 (stage=validate)", () => {
    const drifted = { ...validJson, subject: "" };
    const result = parseClaudeCodeResponse(JSON.stringify(drifted));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("validate");
  });

  it("에러 메시지에 문제된 key 포함", () => {
    const drifted = { ...validJson, mood: 42 };
    const result = parseClaudeCodeResponse(JSON.stringify(drifted));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("mood");
    }
  });
});
