"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pin, Sparkles, Star } from "lucide-react";
import {
  LANGUAGE_DISPLAY_NAME,
  TOOL_DISPLAY_NAME,
  type PromptLanguage,
  type PromptTool,
} from "@/lib/schemas/prompt";
import { cn } from "@/lib/utils";

const TOOL_FILTERS: (PromptTool | "all")[] = [
  "all",
  "nano-banana",
  "higgsfield",
  "midjourney",
];

const LANGUAGE_FILTERS: (PromptLanguage | "all")[] = ["all", "en", "ko"];

/**
 * 페어 목록 Row — Task 015에서 Server Action과 연결 예정.
 * 현재는 UI 스캐폴딩 상태로 비어있는 목록을 보여준다.
 */
export type PairListRow = {
  pairId: string;
  promptId: string;
  tool: PromptTool;
  language: PromptLanguage;
  promptText: string;
  selfRating: number | null;
  satisfaction: number | null;
  isFinalPick: boolean;
  iterationCount: number;
  createdAt: string;
  resultImageUrl: string | null;
  referenceId: string | null;
};

export type PairListProps = {
  rows: PairListRow[];
};

export function PairList({ rows }: PairListProps) {
  const [toolFilter, setToolFilter] = useState<PromptTool | "all">("all");
  const [langFilter, setLangFilter] = useState<PromptLanguage | "all">("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [minSelf, setMinSelf] = useState(0);
  const [minSatisfaction, setMinSatisfaction] = useState(0);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (toolFilter !== "all" && r.tool !== toolFilter) return false;
      if (langFilter !== "all" && r.language !== langFilter) return false;
      if (pinnedOnly && !r.isFinalPick) return false;
      if (minSelf > 0 && (r.selfRating ?? 0) < minSelf) return false;
      if (minSatisfaction > 0 && (r.satisfaction ?? 0) < minSatisfaction) {
        return false;
      }
      return true;
    });
  }, [rows, toolFilter, langFilter, pinnedOnly, minSelf, minSatisfaction]);

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">저장된 페어</h2>
        <span className="text-xs text-muted-foreground">
          {filtered.length} / {rows.length}
        </span>
      </header>

      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/20 p-2 text-xs">
        <FilterChipGroup
          label="도구"
          options={TOOL_FILTERS.map((v) => ({
            value: v,
            label: v === "all" ? "전체" : TOOL_DISPLAY_NAME[v],
          }))}
          value={toolFilter}
          onChange={setToolFilter}
        />
        <FilterChipGroup
          label="언어"
          options={LANGUAGE_FILTERS.map((v) => ({
            value: v,
            label: v === "all" ? "전체" : LANGUAGE_DISPLAY_NAME[v],
          }))}
          value={langFilter}
          onChange={setLangFilter}
        />
        <FilterChipGroup
          label="최종채택"
          options={[
            { value: false, label: "전체" },
            { value: true, label: "채택만" },
          ]}
          value={pinnedOnly}
          onChange={setPinnedOnly}
        />
        <FilterChipGroup
          label="self ≥"
          options={[0, 3, 4, 5].map((n) => ({
            value: n,
            label: n === 0 ? "제한 없음" : `${n}점`,
          }))}
          value={minSelf}
          onChange={setMinSelf}
        />
        <FilterChipGroup
          label="결과 ≥"
          options={[0, 3, 4, 5].map((n) => ({
            value: n,
            label: n === 0 ? "제한 없음" : `${n}점`,
          }))}
          value={minSatisfaction}
          onChange={setMinSatisfaction}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyPairList hasRows={rows.length > 0} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => (
            <PairRow key={row.pairId} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterChipGroup<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <div className="inline-flex rounded border border-border bg-background">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "px-2 py-0.5 text-[11px] transition",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PairRow({ row }: { row: PairListRow }) {
  return (
    <li className="flex flex-col gap-3 rounded-ref-card border border-border bg-card p-4 sm:flex-row">
      {row.resultImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.resultImageUrl}
          alt=""
          className="size-24 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full border border-border bg-muted px-2 py-0.5">
            {TOOL_DISPLAY_NAME[row.tool]}
          </span>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5">
            {LANGUAGE_DISPLAY_NAME[row.language]}
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 font-mono">
            #{row.iterationCount}
          </span>
          {row.isFinalPick && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
              <Pin className="size-3 fill-current" /> 최종 채택
            </span>
          )}
          {row.referenceId && (
            <Link
              href={`/library/${row.referenceId}`}
              className="inline-flex items-center gap-1 rounded-full border border-token-style/40 bg-token-style/10 px-2 py-0.5 text-token-style transition hover:bg-token-style/20"
              title="이 프롬프트를 가져온 레퍼런스로 이동"
            >
              <ExternalLink className="size-3" />
              레퍼런스 #{row.referenceId.slice(0, 8)}
            </Link>
          )}
        </div>
        <p className="line-clamp-3 font-mono text-xs text-foreground">
          {row.promptText}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <RatingPill
            label="self"
            value={row.selfRating}
            color="text-primary"
          />
          <RatingPill
            label="결과"
            value={row.satisfaction}
            color="text-token-lighting"
          />
          <span>
            {new Date(row.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
          </span>
        </div>
      </div>
    </li>
  );
}

function RatingPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1">
        <Star className="size-3 text-muted-foreground/40" />
        {label} –
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1", color)}>
      <Star className="size-3 fill-current" />
      {label} {value}
    </span>
  );
}

function EmptyPairList({ hasRows }: { hasRows: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-ref-card border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
      <Sparkles className="size-5 text-muted-foreground/60" />
      {hasRows ? (
        <p>현재 필터에 맞는 페어가 없어요 — 조건을 풀어보세요.</p>
      ) : (
        <>
          <p>아직 저장된 페어가 없어요.</p>
          <p className="text-xs">
            위 컴포저에서 프롬프트와 결과를 저장하면 여기 쌓입니다.
          </p>
        </>
      )}
    </div>
  );
}
