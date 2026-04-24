"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  Copy,
} from "lucide-react";
import {
  addPromptSnippet,
  deletePromptSnippet,
  listReferenceSnippets,
  type PromptSnippetData,
} from "@/app/(app)/library/actions";
import { copyWithFallback } from "@/lib/clipboard/copy-with-fallback";
import { saveRecentCopiedPrompt } from "@/lib/storage/recent-prompt";
import {
  DEFAULT_LANGUAGE_BY_TOOL,
  TOOL_DISPLAY_NAME,
  LANGUAGE_DISPLAY_NAME,
  type PromptTool,
  type PromptLanguage,
} from "@/lib/schemas/prompt";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DotSlider } from "@/components/ui/dot-slider";

const TOOL_ORDER: PromptTool[] = ["nano-banana", "higgsfield", "midjourney"];
const LANG_ORDER: PromptLanguage[] = ["en", "ko"];

const TOOL_CHIP_CLASS: Record<PromptTool, string> = {
  midjourney: "border-token-style/40 bg-token-style/10 text-token-style",
  "nano-banana": "border-token-subject/40 bg-token-subject/10 text-token-subject",
  higgsfield: "border-token-composition/40 bg-token-composition/10 text-token-composition",
};

export type SnippetListProps = {
  referenceId: string;
  /**
   * - "mount" (기본): 컴포넌트 마운트 시 즉시 로드 (상세 페이지 사용)
   * - "defer": shouldLoad가 true로 올라올 때만 로드 (Dialog 사용 — Dialog 열릴 때)
   */
  loadMode?: "mount" | "defer";
  shouldLoad?: boolean;
  /** 서버에서 이미 SSR로 받은 초기값 (상세 페이지에서 race condition 방지) */
  initialSnippets?: PromptSnippetData[];
  onChanged?: () => void;
};

export function SnippetList({
  referenceId,
  loadMode = "mount",
  shouldLoad = true,
  initialSnippets,
  onChanged,
}: SnippetListProps) {
  const router = useRouter();
  const textareaId = useId();
  const [snippets, setSnippets] = useState<PromptSnippetData[] | null>(
    initialSnippets ?? null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [tool, setTool] = useState<PromptTool>("nano-banana");
  const [language, setLanguage] = useState<PromptLanguage>(
    DEFAULT_LANGUAGE_BY_TOOL["nano-banana"],
  );
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, startAdd] = useTransition();
  const [, startDelete] = useTransition();

  // 로드 트리거 — loadMode=mount이면 항상, defer면 shouldLoad=true 진입 시
  useEffect(() => {
    const shouldFetch =
      loadMode === "mount" ? snippets === null : shouldLoad;
    if (!shouldFetch) return;
    if (initialSnippets && loadMode === "mount") return; // SSR 데이터로 충분

    let alive = true;
    setLoadError(null);
    void listReferenceSnippets(referenceId).then((res) => {
      if (!alive) return;
      if (res.ok) setSnippets(res.snippets);
      else setLoadError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [loadMode, shouldLoad, referenceId, initialSnippets, snippets]);

  const handleToolChange = (next: PromptTool) => {
    setTool(next);
    setLanguage(DEFAULT_LANGUAGE_BY_TOOL[next]);
  };

  const notifyChange = () => {
    onChanged?.();
    router.refresh();
  };

  const handleAdd = () => {
    if (!text.trim()) return;
    setAddError(null);
    startAdd(async () => {
      const res = await addPromptSnippet({
        referenceId,
        text: text.trim(),
        tool,
        language,
        selfRating,
      });
      if (!res.ok) {
        setAddError(res.error);
        return;
      }
      setSnippets((prev) =>
        prev
          ? [
              {
                id: res.promptId,
                text: res.text,
                tool: res.tool,
                language: res.language,
                selfRating: res.selfRating,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]
          : [
              {
                id: res.promptId,
                text: res.text,
                tool: res.tool,
                language: res.language,
                selfRating: res.selfRating,
                createdAt: new Date().toISOString(),
              },
            ],
      );
      setText("");
      setSelfRating(null);
      notifyChange();
    });
  };

  const handleDelete = (promptId: string) => {
    startDelete(async () => {
      const res = await deletePromptSnippet({ promptId });
      if (!res.ok) {
        setAddError(res.error);
        return;
      }
      setSnippets((prev) => prev?.filter((s) => s.id !== promptId) ?? null);
      notifyChange();
    });
  };

  const handleCopy = async (snippet: PromptSnippetData) => {
    try {
      const outcome = await copyWithFallback(snippet.text);
      saveRecentCopiedPrompt({
        text: snippet.text,
        referenceId,
        promptId: snippet.id,
        tool: snippet.tool,
        language: snippet.language,
      });
      toast.success("프롬프트 복사 완료", {
        description:
          outcome === "clipboard"
            ? "Cmd+V로 바로 붙여넣을 수 있어요"
            : outcome === "exec"
              ? "구형 환경에서 복사됨 (execCommand 폴백)"
              : "수동 복사 창이 떴어요 — 직접 Ctrl+C 해주세요",
      });
    } catch (e) {
      toast.error("복사 실패", {
        description: (e as Error).message,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">
          {snippets === null ? "불러오는 중…" : `저장된 스니펫 ${snippets.length}개`}
        </span>
      </div>

      {/* 목록 */}
      {loadError ? (
        <p role="alert" className="text-xs text-destructive">
          {loadError}
        </p>
      ) : snippets === null ? (
        <p className="text-xs text-muted-foreground">로딩 중…</p>
      ) : snippets.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          저장된 스니펫이 없어요
        </p>
      ) : (
        <ul className="space-y-1.5">
          {snippets.map((s) => (
            <li
              key={s.id}
              data-testid={`snippet-${s.id}`}
              className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0 text-[10px] font-medium",
                    TOOL_CHIP_CLASS[s.tool],
                  )}
                >
                  {TOOL_DISPLAY_NAME[s.tool]}
                </span>
                <span className="rounded-full border border-border bg-background px-1.5 py-0 text-[10px] font-medium">
                  {LANGUAGE_DISPLAY_NAME[s.language]}
                </span>
                {s.selfRating !== null && (
                  <span className="text-[10px] text-muted-foreground">
                    ⭐ {s.selfRating}/5
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(s)}
                  aria-label="스니펫 복사"
                  className="ml-auto flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Copy className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  aria-label="스니펫 삭제"
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
              <p className="whitespace-pre-wrap break-words text-xs font-mono">
                {s.text}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* 추가 폼 */}
      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-[11px] font-medium uppercase text-muted-foreground">
          스니펫 추가
        </p>

        <div role="radiogroup" aria-label="대상 도구" className="flex gap-1">
          {TOOL_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tool === t}
              onClick={() => handleToolChange(t)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
                tool === t
                  ? cn(TOOL_CHIP_CLASS[t], "border-current")
                  : "border-border bg-background text-muted-foreground hover:border-ring/60",
              )}
            >
              {TOOL_DISPLAY_NAME[t]}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label="언어" className="flex gap-1">
          {LANG_ORDER.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={language === l}
              onClick={() => setLanguage(l)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
                language === l
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-ring/60",
              )}
            >
              {LANGUAGE_DISPLAY_NAME[l]}
            </button>
          ))}
        </div>

        <textarea
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="프롬프트 텍스트 붙여넣기…"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <DotSlider
          value={selfRating}
          onChange={setSelfRating}
          min={1}
          max={5}
          label="self_rating (프롬프트 자체 만족도, 선택)"
        />

        {addError && (
          <div
            role="alert"
            className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            <span>{addError}</span>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!text.trim() || isAdding}
          className="w-full"
        >
          {isAdding ? (
            <>
              <Loader2 className="mr-1 size-3 animate-spin" /> 저장 중
            </>
          ) : (
            <>
              <Plus className="mr-1 size-3" /> 스니펫 추가
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
