import { tokenSchema, type Token } from "@/lib/schemas/tokens";

/**
 * Claude Code CLI 응답 paste 결과.
 * stage는 실패 원인이 어느 단계인지 UI 에러 메시지 분기에 사용.
 */
export type ParseResult =
  | { ok: true; tokens: Token }
  | { ok: false; error: string; stage: "extract" | "parse" | "validate" };

/**
 * Claude Code CLI 응답 텍스트에서 6-key JSON을 추출하고 tokenSchema로 검증.
 *
 * 안나가 Claude Code에 "6차원 분석 요청 프롬프트"를 이미지와 함께 붙여넣어
 * 받은 응답을 그대로 제품의 paste 폼에 붙여넣으면 이 함수가 호출된다.
 *
 * 지원 입력 포맷:
 *   - 순수 JSON: {"subject": "...", ...}
 *   - ```json ... ``` 코드펜스
 *   - ``` ... ``` 언어 태그 없는 코드펜스
 *   - 설명 문장 + JSON 블록 혼합 응답 (첫 균형 잡힌 { } 블록 추출)
 *
 * 단계:
 *   1. extract: 코드펜스 벗겨내고 첫 JSON 객체 블록 찾기
 *   2. parse: JSON.parse
 *   3. validate: tokenSchema.safeParse (6-key 엄격, 추가 키 거부, 빈 문자열 거부)
 */
export function parseClaudeCodeResponse(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "응답이 비어있습니다", stage: "extract" };
  }

  // 1. 코드펜스 stripping (```json ... ``` 또는 ``` ... ```)
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  let jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;

  // 2. 설명 텍스트 + JSON 블록 혼합 → 균형 잡힌 { } 블록 추출
  if (!jsonText.startsWith("{")) {
    const extracted = extractBalancedBraces(jsonText);
    if (!extracted) {
      return {
        ok: false,
        error: "JSON 객체를 찾을 수 없습니다. { } 블록으로 감싼 응답을 붙여넣어주세요",
        stage: "extract",
      };
    }
    jsonText = extracted;
  }

  // 3. JSON.parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return {
      ok: false,
      error: `JSON 파싱 실패: ${(e as Error).message}`,
      stage: "parse",
    };
  }

  // 4. Zod validation
  const result = tokenSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";
    return {
      ok: false,
      error: `검증 실패 [${path}]: ${issue.message}`,
      stage: "validate",
    };
  }

  // 5. Placeholder guard — 분석 요청 프롬프트의 예시 JSON("...")을 그대로
  //    paste한 경우를 거부. Claude Code 응답이라면 의미 있는 영어 단어가 와야 함.
  const placeholderKeys = Object.entries(result.data)
    .filter(([, v]) => isPlaceholderValue(v))
    .map(([k]) => k);
  if (placeholderKeys.length > 0) {
    return {
      ok: false,
      error: `예시 placeholder 값이 그대로 입력됐습니다 [${placeholderKeys.join(", ")}]. Claude Code 분석 요청을 받아 받은 실제 영어 응답을 붙여넣어주세요.`,
      stage: "validate",
    };
  }

  return { ok: true, tokens: result.data };
}

/**
 * placeholder 의심 값 판정.
 * - 빈 문자열은 zod min(1)에서 이미 거부
 * - "...", ". . .", "TBD", "..." 변형 등 안나가 prompt 예시를 그대로 paste한 케이스
 * - 너무 짧은(2자 이하) 또는 점·공백·하이픈만 있는 경우
 */
function isPlaceholderValue(value: string): boolean {
  const v = value.trim();
  if (v.length <= 2) return true;
  if (/^[\s.\-_…]+$/.test(v)) return true;
  if (/^(tbd|n\/a|todo|fixme|xxx|undefined|null)$/i.test(v)) return true;
  return false;
}

/**
 * 문자열에서 첫 번째 균형 잡힌 `{ ... }` 블록을 추출.
 * 중첩 중괄호 depth를 추적해 짝이 맞는 닫기 중괄호를 찾는다.
 * 문자열 리터럴 내부의 `}`를 오인하지 않도록 따옴표 상태도 추적.
 */
function extractBalancedBraces(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}
