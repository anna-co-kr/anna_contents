"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  buildRemixRequest,
  defaultLanguageFor,
  type RemixLanguage,
  type RemixTool,
  type SixDimTokens,
} from "@/lib/remix/template-engine";
import { copyWithFallback } from "@/lib/clipboard/copy-with-fallback";

export type RemixComposerReference = {
  id: string;
  thumbnail_url: string | null;
  notes: string | null;
  tokens: SixDimTokens;
  /** 이 레퍼런스의 가장 최근 성공 프롬프트 (self_rating ≥ 4)의 tool — default toggle 힌트 */
  bestTool?: RemixTool | null;
};

const TOOL_LABELS: Record<RemixTool, string> = {
  midjourney: "Midjourney",
  "nano-banana": "Nano Banana Pro",
  higgsfield: "Higgsfield",
};

/**
 * Task 028 (F006) — 리믹스 요청 프롬프트 생성기.
 *
 * 기준 레퍼런스 선택 + tool 3-way + language 2-way + 새 주제 → 실시간 조립 → 클립보드 복사.
 * 외부 API 호출 0 (lib/remix/template-engine.ts pure function).
 */
export default function RemixComposer({
  references,
}: {
  references: RemixComposerReference[];
}) {
  const [refId, setRefId] = useState<string>(references[0]?.id ?? "");
  const baseRef = references.find((r) => r.id === refId);

  // tool default = baseRef.bestTool ?? "nano-banana" (실사용 1순위)
  const [tool, setTool] = useState<RemixTool>(
    baseRef?.bestTool ?? "nano-banana",
  );
  // language: tool 변경 시 default로 reset, 단 안나가 명시 override한 적 있으면 유지
  const [languageDirty, setLanguageDirty] = useState(false);
  const [language, setLanguage] = useState<RemixLanguage>(
    defaultLanguageFor(baseRef?.bestTool ?? "nano-banana"),
  );

  function handleToolChange(next: RemixTool) {
    setTool(next);
    if (!languageDirty) {
      setLanguage(defaultLanguageFor(next));
    }
  }

  function handleLanguageChange(next: RemixLanguage) {
    setLanguage(next);
    setLanguageDirty(true);
  }

  function handleRefChange(nextId: string) {
    setRefId(nextId);
    const next = references.find((r) => r.id === nextId);
    if (next?.bestTool) {
      setTool(next.bestTool);
      if (!languageDirty) setLanguage(defaultLanguageFor(next.bestTool));
    }
  }

  const [theme, setTheme] = useState<string>("");

  const preview = useMemo(() => {
    if (!baseRef || !theme.trim()) return "";
    return buildRemixRequest({
      tokens: baseRef.tokens,
      theme: theme.trim(),
      tool,
      language,
    });
  }, [baseRef, theme, tool, language]);

  async function handleCopy() {
    if (!preview) {
      toast.error("새 주제를 입력해주세요");
      return;
    }
    const outcome = await copyWithFallback(preview);
    if (outcome === "clipboard") {
      toast.success("클립보드에 복사됨", {
        description:
          "Claude Code 채팅에 paste → 후보 3개 받으면 페어 로그에 저장",
        duration: 6000,
      });
    } else if (outcome === "exec") {
      toast.success("복사됨 (legacy fallback)");
    } else {
      toast.warning("자동 복사 실패 — 아래 textarea에서 수동 복사해주세요");
    }
  }

  if (references.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
        토큰이 저장된 레퍼런스가 아직 없습니다.{" "}
        <Link href="/library" className="underline">
          라이브러리
        </Link>
        에서 URL/이미지 드롭 후 6차원 분석을 먼저 완료해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. 기준 레퍼런스 */}
      <label className="block text-sm space-y-1">
        <span className="block text-xs text-muted-foreground">기준 레퍼런스</span>
        <select
          data-testid="remix-reference-select"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={refId}
          onChange={(e) => handleRefChange(e.target.value)}
        >
          {references.map((r) => {
            const summary = r.tokens.subject.length > 60
              ? `${r.tokens.subject.slice(0, 60)}...`
              : r.tokens.subject;
            return (
              <option key={r.id} value={r.id}>
                #{r.id.slice(0, 8)} · {summary}
              </option>
            );
          })}
        </select>
      </label>

      {/* 2. Tool 3-way + Language 2-way */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <fieldset className="space-y-1">
          <legend className="text-xs text-muted-foreground">도구 (tool)</legend>
          <div className="flex gap-1" role="radiogroup" aria-label="도구 선택">
            {(Object.keys(TOOL_LABELS) as RemixTool[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tool === t}
                onClick={() => handleToolChange(t)}
                className={`flex-1 px-2 py-1.5 rounded-md border text-xs ${
                  tool === t
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {TOOL_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="text-xs text-muted-foreground">
            언어 (language) {languageDirty ? "· override 활성" : "· tool 연동"}
          </legend>
          <div className="flex gap-1" role="radiogroup" aria-label="언어 선택">
            {(["en", "ko"] as RemixLanguage[]).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={language === l}
                onClick={() => handleLanguageChange(l)}
                className={`flex-1 px-2 py-1.5 rounded-md border text-xs uppercase ${
                  language === l
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* 3. 새 주제 */}
      <label className="block text-sm space-y-1">
        <span className="block text-xs text-muted-foreground">
          새 주제 (이 느낌 × 무엇)
        </span>
        <textarea
          data-testid="remix-theme-input"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm min-h-[60px]"
          placeholder="예: 럭셔리 호텔 조식 정물 / 가을 화장품 캠페인 / 빈티지 차 광고 영상"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />
      </label>

      {/* 4. 토큰 미리보기 */}
      {baseRef && (
        <details className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            기준 레퍼런스 6차원 토큰 펼치기
          </summary>
          <dl className="mt-2 grid grid-cols-1 gap-1 leading-relaxed">
            {(Object.entries(baseRef.tokens) as [keyof SixDimTokens, string][]).map(
              ([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="font-medium text-muted-foreground min-w-[80px]">
                    {k}
                  </dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ),
            )}
          </dl>
        </details>
      )}

      {/* 5. 실시간 프리뷰 + copy 버튼 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            요청 문장 프리뷰 ({TOOL_LABELS[tool]} · {language})
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!preview}
            data-testid="remix-copy-button"
            className="rounded-md border bg-foreground text-background px-3 py-1 text-xs disabled:opacity-40"
          >
            Claude Code로 요청 복사
          </button>
        </div>
        <textarea
          readOnly
          data-testid="remix-preview"
          className="w-full rounded-md border bg-card px-3 py-2 text-xs font-mono min-h-[200px] whitespace-pre-wrap"
          value={preview || "새 주제를 입력하면 여기에 조립된 요청 문장이 표시됩니다."}
        />
      </div>
    </div>
  );
}
