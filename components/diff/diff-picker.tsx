"use client";

import { useMemo, useState } from "react";
import { diffWords } from "diff";
import Link from "next/link";

export type DiffPickerPair = {
  id: string;
  satisfaction: number | null;
  is_final_pick: boolean | null;
  iteration_count_cumulative: number | null;
  created_at: string;
  prompt: {
    id: string;
    prompt_text: string;
    tool: string;
    language: string;
    self_rating: number | null;
    reference_id: string | null;
  } | null;
};

/**
 * Task 018 (F004) — 페어 2개를 선택해 프롬프트 텍스트의 단어 단위 diff를 시각화.
 *
 * - PRD F004 (164-174): 추가 단어 초록 / 제거 단어 빨강 / 동일 언어 권장
 * - 라이브러리: `diff` (jsdiff, 단어 단위 `diffWords`)
 * - 클라이언트 전용 — 외부 API 호출 0
 */
export default function DiffPicker({ pairs }: { pairs: DiffPickerPair[] }) {
  const [aId, setAId] = useState<string>(pairs[0]?.id ?? "");
  const [bId, setBId] = useState<string>(pairs[1]?.id ?? "");

  const pairA = pairs.find((p) => p.id === aId);
  const pairB = pairs.find((p) => p.id === bId);

  const langA = pairA?.prompt?.language;
  const langB = pairB?.prompt?.language;
  const sameLang = langA && langA === langB;

  const diff = useMemo(() => {
    const textA = pairA?.prompt?.prompt_text ?? "";
    const textB = pairB?.prompt?.prompt_text ?? "";
    if (!textA || !textB) return [];
    return diffWords(textA, textB);
  }, [pairA, pairB]);

  if (pairs.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        페어가 2개 이상 필요합니다 (현재 {pairs.length}개).{" "}
        <Link href="/pairs" className="underline">
          페어 로그
        </Link>
        에서 더 저장해주세요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PairSelect label="페어 A (기준)" pairs={pairs} value={aId} onChange={setAId} />
        <PairSelect label="페어 B (비교)" pairs={pairs} value={bId} onChange={setBId} />
      </div>

      {pairA && pairB && !sameLang && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-sm">
          ⚠ language 불일치 (A: {langA}, B: {langB}). 동일 언어 비교가 PRD 권장 — 결과 해석 시 주의.
        </p>
      )}

      {pairA && pairB && (
        <>
          <PairMeta pairA={pairA} pairB={pairB} />
          <div className="rounded-md border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-2">단어 단위 diff · A → B</div>
            <div className="leading-relaxed text-sm whitespace-pre-wrap">
              {diff.map((part, i) => (
                <span
                  key={i}
                  className={
                    part.added
                      ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200 px-0.5 rounded-sm"
                      : part.removed
                        ? "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200 px-0.5 rounded-sm line-through"
                        : ""
                  }
                >
                  {part.value}
                </span>
              ))}
            </div>
          </div>

          <Legend />
        </>
      )}
    </div>
  );
}

function PairSelect({
  label,
  pairs,
  value,
  onChange,
}: {
  label: string;
  pairs: DiffPickerPair[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      <select
        data-testid={`pair-select-${label.startsWith("페어 A") ? "a" : "b"}`}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {pairs.map((p) => {
          const text = p.prompt?.prompt_text ?? "";
          const preview = text.length > 30 ? `${text.slice(0, 30)}...` : text;
          const tool = p.prompt?.tool ?? "?";
          const lang = p.prompt?.language ?? "?";
          const rating = p.prompt?.self_rating ?? "-";
          return (
            <option key={p.id} value={p.id}>
              {tool}-{lang} · ★{rating} · {preview}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function PairMeta({ pairA, pairB }: { pairA: DiffPickerPair; pairB: DiffPickerPair }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
      {[pairA, pairB].map((p, i) => (
        <div key={p.id} className="rounded-md border bg-muted/30 px-2 py-1.5 space-y-0.5">
          <div className="font-medium">페어 {i === 0 ? "A" : "B"}</div>
          <div>tool: {p.prompt?.tool ?? "-"} · lang: {p.prompt?.language ?? "-"}</div>
          <div>self_rating: ★{p.prompt?.self_rating ?? "-"} · sat: {p.satisfaction ?? "-"} · iter#{p.iteration_count_cumulative ?? "-"}</div>
          {p.prompt?.reference_id && (
            <div>
              <Link
                href={`/library/${p.prompt.reference_id}`}
                target="_blank"
                className="underline"
              >
                레퍼런스 #{p.prompt.reference_id.slice(0, 8)}
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200 px-1 rounded-sm">
          추가
        </span>
        B에만 있는 단어
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200 px-1 rounded-sm line-through">
          제거
        </span>
        A에만 있는 단어
      </span>
      <span>일반 텍스트 = 양쪽 동일</span>
    </div>
  );
}
