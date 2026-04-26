"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  searchReferences,
  listAllTags,
  type SearchResultCard,
} from "@/app/(app)/search/actions";

const TOOLS = [
  { value: "midjourney", label: "MJ" },
  { value: "nano-banana", label: "NBP" },
  { value: "higgsfield", label: "Higgsfield" },
] as const;

const LANGS = [
  { value: "en", label: "EN" },
  { value: "ko", label: "KO" },
] as const;

const TAG_KIND_META: Record<
  string,
  { label: string; helper: string }
> = {
  category: {
    label: "카테고리",
    helper: "큰 분류 — 예: 패션, 푸드, 인테리어, 인물",
  },
  mood: {
    label: "무드",
    helper: "분위기 — 예: 따뜻한, 차가운, 모던, 빈티지",
  },
  color: {
    label: "색감",
    helper: "색 톤 — 예: 파스텔, 모노크롬, 골든아워",
  },
  purpose: {
    label: "용도",
    helper: "쓰임새 — 예: 인스타 피드, 유튜브 썸네일, 포트폴리오",
  },
};

const TAG_KIND_ORDER = ["category", "mood", "color", "purpose"] as const;

/** D10 게이트·테스트 자동화에서 만든 무의미한 태그(gate-tag-{ts}, uuid 등)는 검색 UI에서 숨긴다. */
function isMeaningfulTag(value: string): boolean {
  if (/^gate-tag-/i.test(value)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return false;
  return true;
}

type TagOption = { value: string; tag_kind: string; count: number };

export default function SearchForm() {
  const [keyword, setKeyword] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [results, setResults] = useState<SearchResultCard[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listAllTags().then((res) => {
      if (mounted && res.ok) setAllTags(res.tags);
    });
    return () => {
      mounted = false;
    };
  }, []);

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function runSearch() {
    setError(null);
    startTransition(async () => {
      const res = await searchReferences({
        keyword,
        tools: selectedTools,
        languages: selectedLangs,
        tagValues: selectedTags,
      });
      if (res.ok) {
        setResults(res.cards);
        setSearched(true);
      } else {
        setError(res.error);
      }
    });
  }

  function clearAll() {
    setKeyword("");
    setSelectedTools([]);
    setSelectedLangs([]);
    setSelectedTags([]);
    setResults([]);
    setSearched(false);
    setError(null);
  }

  // 태그 그룹화 — 무의미 태그(자동화 잔재) 사전 필터, 4개 kind 고정 순서로 노출
  const tagsByKind = allTags
    .filter((t) => isMeaningfulTag(t.value))
    .reduce<Record<string, TagOption[]>>((acc, t) => {
      (acc[t.tag_kind] ??= []).push(t);
      return acc;
    }, {});

  const totalUsableTags = Object.values(tagsByKind).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* 키워드 + tool + language */}
      <div className="rounded-md border bg-card p-4 space-y-3">
        <label className="block text-sm space-y-1">
          <span className="block text-xs text-muted-foreground">
            키워드 (notes · 6차원 토큰 · 프롬프트 텍스트)
          </span>
          <input
            type="text"
            data-testid="search-keyword"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="예: navy suit / 골든아워 / editorial menswear"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <fieldset className="space-y-1">
            <legend className="text-xs text-muted-foreground">도구 (다중)</legend>
            <div className="flex gap-1">
              {TOOLS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectedTools(toggle(selectedTools, t.value))}
                  className={`flex-1 px-2 py-1.5 rounded-md border text-xs ${
                    selectedTools.includes(t.value)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1">
            <legend className="text-xs text-muted-foreground">언어 (다중)</legend>
            <div className="flex gap-1">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setSelectedLangs(toggle(selectedLangs, l.value))}
                  className={`flex-1 px-2 py-1.5 rounded-md border text-xs uppercase ${
                    selectedLangs.includes(l.value)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* 태그 — 4개 kind 고정 순서(category·mood·color·purpose), 도움말 동반, 빈 그룹은 숨김 */}
        <div className="space-y-2">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">
              태그 (선택한 태그를 모두 가진 카드만)
            </span>
          </div>

          {totalUsableTags === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              아직 태그가 없어요. 라이브러리에서 카드를 클릭하면 4가지 분류(카테고리·무드·색감·용도)로 태그를 붙일 수 있어요.
            </p>
          ) : (
            TAG_KIND_ORDER.map((kind) => {
              const list = tagsByKind[kind];
              if (!list || list.length === 0) return null;
              const meta = TAG_KIND_META[kind];
              return (
                <div key={kind} className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[11px] font-medium text-foreground">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {meta.helper}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {list.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setSelectedTags(toggle(selectedTags, t.value))}
                        className={`px-2 py-0.5 rounded-chip border text-xs ${
                          selectedTags.includes(t.value)
                            ? "bg-foreground text-background border-foreground"
                            : "bg-background border-border hover:bg-muted"
                        }`}
                      >
                        {t.value} <span className="text-[10px] opacity-60">{t.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={runSearch}
            disabled={isPending}
            data-testid="search-submit"
            className="rounded-md border bg-foreground text-background px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {isPending ? "검색 중..." : "검색"}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            초기화
          </button>
        </div>

        {error && <p className="text-xs text-red-600">⚠ {error}</p>}
      </div>

      {/* 결과 */}
      {searched && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">결과 {results.length}건</h2>
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">매칭된 카드 없음.</p>
          )}
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((card) => (
              <li
                key={card.id}
                className="rounded-md border bg-card p-3"
                data-testid={`search-result-${card.id}`}
              >
                <div className="flex gap-3">
                  {/* 좌측 80×80 썸네일 — 검색 결과를 시각으로 빠르게 식별. signed URL+160px 변환본 */}
                  <Link
                    href={`/library/${card.id}`}
                    target="_blank"
                    className="shrink-0 block relative size-20 overflow-hidden rounded-md border bg-muted"
                    aria-label="레퍼런스 상세로 이동"
                  >
                    {card.signed_thumbnail_url ? (
                      <Image
                        src={card.signed_thumbnail_url}
                        alt={card.notes ?? "레퍼런스 썸네일"}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="size-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <Link
                        href={`/library/${card.id}`}
                        className="text-xs underline text-muted-foreground"
                        target="_blank"
                      >
                        #{card.id.slice(0, 8)}
                      </Link>
                      {card.bestPrompt && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-chip bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200 shrink-0">
                          ★{card.bestPrompt.self_rating} · {card.bestPrompt.tool}-{card.bestPrompt.language}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-3">
                      <span className="text-muted-foreground">subject: </span>
                      {highlightKeyword(card.tokens.subject, keyword)}
                    </p>
                    <p className="text-xs leading-relaxed line-clamp-2">
                      <span className="text-muted-foreground">style: </span>
                      {highlightKeyword(card.tokens.style, keyword)}
                    </p>
                    {card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {card.tags.slice(0, 5).map((t, i) => (
                          <span
                            key={`${t.value}-${i}`}
                            className="px-1.5 py-0.5 rounded-chip border border-border text-[10px] text-muted-foreground"
                          >
                            {t.value}
                          </span>
                        ))}
                      </div>
                    )}
                    {card.bestPrompt && (
                      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 italic">
                        “{highlightKeyword(card.bestPrompt.prompt_text, keyword)}”
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function highlightKeyword(text: string, keyword: string) {
  if (!keyword.trim()) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700/50 px-0.5 rounded-sm">
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}
