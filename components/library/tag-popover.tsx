"use client";

import {
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Tag as TagIcon, X, AlertCircle } from "lucide-react";
import {
  addReferenceTag,
  deleteReferenceTag,
  listUserTagSuggestions,
  type TagKind,
  type UserTagSuggestion,
} from "@/app/(app)/library/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type TagItem = { id: string; label: string; kind: TagKind };

export type TagPopoverProps = {
  referenceId: string;
  tags: TagItem[];
  trigger?: React.ReactNode;
};

const KIND_LABEL: Record<TagKind, string> = {
  category: "카테고리",
  mood: "무드",
  color: "컬러",
  purpose: "용도",
};

const KIND_ORDER: TagKind[] = ["category", "mood", "color", "purpose"];

const KIND_CHIP_CLASS: Record<TagKind, string> = {
  category: "border-border bg-background",
  mood: "border-token-mood/40 bg-token-mood/10 text-token-mood",
  color: "border-token-composition/40 bg-token-composition/10 text-token-composition",
  purpose: "border-token-lighting/40 bg-token-lighting/10 text-token-lighting",
};

type LocalOp =
  | { kind: "add"; tag: TagItem }
  | { kind: "remove"; tagId: string };

export function TagPopover({ referenceId, tags, trigger }: TagPopoverProps) {
  const router = useRouter();
  const dataListId = useId();
  const inputId = useId();

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<TagKind>("category");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<UserTagSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [optimisticTags, applyOp] = useOptimistic<TagItem[], LocalOp>(
    tags,
    (current, op) =>
      op.kind === "add"
        ? [...current, op.tag]
        : current.filter((t) => t.id !== op.tagId),
  );

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void listUserTagSuggestions().then((res) => {
      if (alive && res.ok) setSuggestions(res.tags);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      // Popover 열릴 때 input 자동 포커스
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      // optimistic: 임시 id로 즉시 반영
      const tempId = `temp-${Date.now()}`;
      applyOp({
        kind: "add",
        tag: { id: tempId, label: trimmed, kind },
      });

      const res = await addReferenceTag({ referenceId, label: trimmed, kind });
      if (!res.ok) {
        setError(res.error);
        router.refresh(); // rollback
        return;
      }

      setLabel("");
      router.refresh();
    });
  };

  const handleRemove = (tagId: string) => {
    if (tagId.startsWith("temp-")) return;
    setError(null);
    startTransition(async () => {
      applyOp({ kind: "remove", tagId });
      const res = await deleteReferenceTag({ tagId });
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  // kind별 그룹핑
  const groups = KIND_ORDER.map((k) => ({
    kind: k,
    items: optimisticTags.filter((t) => t.kind === k),
  })).filter((g) => g.items.length > 0);

  const suggestionsForKind = suggestions
    .filter((s) => s.kind === kind)
    .slice(0, 20);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 rounded-full bg-background/90 shadow-sm backdrop-blur hover:bg-background"
            aria-label="태그 편집"
          >
            <TagIcon className="size-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 space-y-3 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <p className="text-xs font-medium">태그 편집</p>
          <p className="text-[11px] text-muted-foreground">
            Enter로 추가 · 칩 ×로 삭제
          </p>
        </div>

        {/* 기존 태그 칩 (kind 그룹) */}
        {groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.kind} className="space-y-1">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {KIND_LABEL[g.kind]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {g.items.map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                        KIND_CHIP_CLASS[g.kind],
                      )}
                    >
                      {t.label}
                      <button
                        type="button"
                        onClick={() => handleRemove(t.id)}
                        aria-label={`${t.label} 삭제`}
                        disabled={t.id.startsWith("temp-")}
                        className="flex size-3.5 items-center justify-center rounded-full hover:bg-muted/60 disabled:opacity-50"
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-[11px] text-muted-foreground">
            아직 태그가 없어요
          </p>
        )}

        {/* 신규 입력 */}
        <div className="space-y-1.5 border-t border-border pt-2">
          <label htmlFor={inputId} className="text-[10px] font-medium uppercase text-muted-foreground">
            새 태그
          </label>
          <div className="flex gap-1.5">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as TagKind)}
              className="rounded-md border border-input bg-background px-1.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="태그 종류"
            >
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예: 따뜻한, 밤, 무채색…"
              list={dataListId}
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <datalist id={dataListId}>
              {suggestionsForKind.map((s) => (
                <option key={`${s.kind}-${s.label}`} value={s.label} />
              ))}
            </datalist>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!label.trim()}
            >
              추가
            </Button>
          </div>
          {suggestionsForKind.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              최근 사용: {suggestionsForKind.slice(0, 5).map((s) => s.label).join(" · ")}
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

