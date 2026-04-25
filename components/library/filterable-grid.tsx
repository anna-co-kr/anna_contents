"use client";

import { useMemo, useState } from "react";
import { ReferenceCard } from "@/components/library/reference-card";
import type { ReferenceCardData } from "@/app/(app)/library/actions";

type FilterMode = "all" | "auto" | "manual" | "untokened";

const FILTER_OPTIONS: { value: FilterMode; label: string; helper: string }[] = [
  { value: "all", label: "전체", helper: "" },
  {
    value: "auto",
    label: "auto · 검수 가능",
    helper: "Claude Code 자동 분석 토큰 — 안나가 정정하면 manual 승급",
  },
  {
    value: "manual",
    label: "manual ✓",
    helper: "안나 직접 입력·검수 완료 — 다음 라운드 anchor 후보",
  },
  {
    value: "untokened",
    label: "분석 대기",
    helper: "토큰 미분석 — 다음 라우틴 자연 처리",
  },
];

/**
 * Task 016-4 (검수 모드 신설) — 라이브러리 카드 source 칩 + 필터 토글.
 *
 * tokenSource = 'claude-code' (auto) / 'manual' (검수 완료) / null (분석 대기)
 * 안나가 auto 카드 클릭 → 상세 페이지 → ReferenceEditDialog로 토큰 정정 → source='manual' 승급
 */
export function FilterableGrid({
  cards,
  totalCount,
}: {
  cards: ReferenceCardData[];
  totalCount: number;
}) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    if (filter === "auto")
      return cards.filter((c) => c.tokenSource === "claude-code");
    if (filter === "manual")
      return cards.filter((c) => c.tokenSource === "manual");
    return cards.filter((c) => c.tokens === null);
  }, [cards, filter]);

  const counts = useMemo(
    () => ({
      all: cards.length,
      auto: cards.filter((c) => c.tokenSource === "claude-code").length,
      manual: cards.filter((c) => c.tokenSource === "manual").length,
      untokened: cards.filter((c) => c.tokens === null).length,
    }),
    [cards],
  );

  const activeOption = FILTER_OPTIONS.find((o) => o.value === filter);

  return (
    <section className="space-y-3" aria-label="레퍼런스 라이브러리 그리드">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-medium">
          총 <span className="tabular-nums">{totalCount}</span>개
        </h2>
        {cards.length < totalCount && (
          <p className="text-xs text-muted-foreground">
            최근 {cards.length}개 표시
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="토큰 출처 필터">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={filter === opt.value}
            onClick={() => setFilter(opt.value)}
            data-testid={`library-filter-${opt.value}`}
            className={`px-2.5 py-1 rounded-chip border text-xs ${
              filter === opt.value
                ? "bg-foreground text-background border-foreground"
                : "bg-background border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            {opt.label}{" "}
            <span className="text-[10px] opacity-70 tabular-nums">
              {counts[opt.value]}
            </span>
          </button>
        ))}
      </div>

      {activeOption?.helper && (
        <p className="text-xs text-muted-foreground italic px-1">
          {activeOption.helper}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-1">
          이 필터에 매칭되는 카드가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((card) => (
            <ReferenceCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}
