"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ImageIcon, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  /** signed URL + 160px 변환 (서버에서 batch 발급) — picker 시각 식별용. */
  signedThumbnailUrl: string | null;
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
      {/* 1. 기준 레퍼런스 — 시각 picker */}
      <div className="space-y-1">
        <span className="block text-xs text-muted-foreground">기준 레퍼런스</span>
        <ReferencePicker
          references={references}
          selectedId={refId}
          onSelect={handleRefChange}
        />
      </div>

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

/**
 * 100건 references를 시각 그리드로 펼쳐 검색·선택할 수 있는 Popover picker.
 *
 * 트리거 버튼: 현재 선택된 카드 썸네일 + subject 한 줄 + 화살표 — 무엇을 골라뒀는지 한눈에.
 * 펼침 영역: 검색 input + 4열 그리드 (썸네일 + #ID + subject 짧게).
 *
 * 성능 — references는 보통 ≤ 100. signedThumbnailUrl은 서버에서 LIST_THUMBNAIL_TRANSFORM(160px·q65)
 * batch 발급. <Image loading="lazy">로 viewport 밖 카드는 미루므로 펼침 직후 트래픽 폭증 없음.
 */
function ReferencePicker({
  references,
  selectedId,
  onSelect,
}: {
  references: RemixComposerReference[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = references.find((r) => r.id === selectedId) ?? references[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return references;
    return references.filter((r) => {
      if (r.id.toLowerCase().includes(q)) return true;
      if ((r.notes ?? "").toLowerCase().includes(q)) return true;
      // 6차원 토큰 어디라도 매칭
      return Object.values(r.tokens).some((v) =>
        String(v).toLowerCase().includes(q),
      );
    });
  }, [query, references]);

  function handlePick(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-testid="remix-reference-picker-trigger"
        className="flex w-full items-center gap-3 rounded-md border bg-background p-2 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="기준 레퍼런스 선택"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
          {selected?.signedThumbnailUrl ? (
            <Image
              src={selected.signedThumbnailUrl}
              alt={selected.notes ?? "기준 레퍼런스 썸네일"}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="size-4 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">
            #{selected?.id.slice(0, 8) ?? "—"}
          </div>
          <div className="truncate text-sm">
            {selected?.tokens.subject ?? "선택된 레퍼런스 없음"}
          </div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(640px,calc(100vw-32px))] p-3"
      >
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="text"
              data-testid="remix-picker-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색 — #ID, notes, 6차원 토큰 어디든"
              className="w-full rounded-md border bg-background py-1.5 pl-7 pr-2 text-xs"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            {filtered.length}개 / {references.length}개
          </p>

          <div className="max-h-[440px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                매칭되는 레퍼런스가 없어요. 검색어를 줄여보세요.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {filtered.map((r) => {
                  const isActive = r.id === selectedId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        data-testid={`remix-picker-item-${r.id}`}
                        onClick={() => handlePick(r.id)}
                        className={`group block w-full overflow-hidden rounded-md border text-left transition ${
                          isActive
                            ? "border-foreground ring-2 ring-foreground"
                            : "border-border hover:border-ring/60"
                        }`}
                        aria-pressed={isActive}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-muted">
                          {r.signedThumbnailUrl ? (
                            <Image
                              src={r.signedThumbnailUrl}
                              alt={r.notes ?? "레퍼런스 썸네일"}
                              fill
                              sizes="(min-width: 768px) 25vw, 50vw"
                              className="object-cover transition group-hover:scale-[1.03]"
                              loading="lazy"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="size-5 text-muted-foreground/40" />
                            </div>
                          )}
                          {r.bestTool && (
                            <span className="absolute right-1 top-1 rounded-chip bg-background/90 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur">
                              {r.bestTool}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 px-2 py-1.5">
                          <div className="text-[10px] text-muted-foreground">
                            #{r.id.slice(0, 8)}
                          </div>
                          <div className="line-clamp-2 text-[11px] leading-snug">
                            {r.tokens.subject}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
