import { describe, it, expect } from "vitest";
import { buildAnalysisRequest } from "./prompt-builder";

describe("buildAnalysisRequest", () => {
  it("6개 키를 모두 언급하는 프롬프트 생성", () => {
    const prompt = buildAnalysisRequest();
    expect(prompt).toContain("subject");
    expect(prompt).toContain("style");
    expect(prompt).toContain("lighting");
    expect(prompt).toContain("composition");
    expect(prompt).toContain("medium");
    expect(prompt).toContain("mood");
  });

  it("JSON 응답 포맷 예시 블록 포함", () => {
    const prompt = buildAnalysisRequest();
    expect(prompt).toContain("```json");
    expect(prompt).toContain('"subject": "..."');
  });

  it("영어 고정 원칙 명시", () => {
    const prompt = buildAnalysisRequest();
    expect(prompt).toMatch(/영어/);
    expect(prompt).toMatch(/도구 독립적/);
  });

  it("프롬프트 인젝션 방어 문구 포함", () => {
    const prompt = buildAnalysisRequest();
    expect(prompt).toMatch(/이미지 내 텍스트.*지시.*무시/);
  });

  it("Zod strict 거부 안내 포함 (6개 키만·추가 키 금지)", () => {
    const prompt = buildAnalysisRequest();
    expect(prompt).toContain("6개 키만");
    expect(prompt).toMatch(/추가 키 금지/);
  });

  it("sourceUrl 있으면 리마인더 라인에 포함", () => {
    const prompt = buildAnalysisRequest({
      sourceUrl: "https://example.com/image.jpg",
    });
    expect(prompt).toContain("https://example.com/image.jpg");
    expect(prompt).toContain("참고용");
  });

  it("fileName 있으면 리마인더 라인에 포함", () => {
    const prompt = buildAnalysisRequest({ fileName: "hero.jpg" });
    expect(prompt).toContain("hero.jpg");
  });

  it("sourceUrl·fileName 둘 다 없어도 이미지 첨부 안내 포함", () => {
    const prompt = buildAnalysisRequest();
    expect(prompt).toMatch(/이미지를.*첨부/);
  });

  it("referenceId는 본문에 포함되지 않음 (프롬프트 인젝션·유출 방어)", () => {
    const prompt = buildAnalysisRequest({ referenceId: "abc-123-secret" });
    expect(prompt).not.toContain("abc-123-secret");
  });

  it("기본 출력은 single-line (Claude Code 데스크탑 앱 paste 안정성)", () => {
    const prompt = buildAnalysisRequest();
    // \n 한 개도 없어야 함 — paste 시 line 단위 send 회피
    expect(prompt).not.toContain("\n");
    // 한 줄 안에 6 키 모두 + JSON 코드펜스 + 규칙 모두 포함
    expect(prompt).toContain("subject");
    expect(prompt).toContain("```json");
    expect(prompt).toContain("6개 키만");
  });

  it("multiline 옵션 호출 시 기존 30줄 markdown 출력", () => {
    const prompt = buildAnalysisRequest({ format: "multiline" });
    // 여러 줄로 나뉘어야 함 (markdown 가독성)
    expect(prompt.split("\n").length).toBeGreaterThan(20);
    // 다중 라인이라도 동일한 6 키·규칙·JSON 펜스 포함
    expect(prompt).toContain("subject");
    expect(prompt).toContain("```json");
    expect(prompt).toContain("6개 키만");
  });
});
