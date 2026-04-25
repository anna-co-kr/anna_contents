"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  ImagePlus,
  Pin,
  Send,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createPair } from "@/app/(app)/pairs/actions";
import {
  DEFAULT_LANGUAGE_BY_TOOL,
  LANGUAGE_DISPLAY_NAME,
  TOOL_DISPLAY_NAME,
  type PromptLanguage,
  type PromptTool,
} from "@/lib/schemas/prompt";
import {
  loadRecentCopiedPrompt,
  clearRecentCopiedPrompt,
  type RecentCopiedPrompt,
} from "@/lib/storage/recent-prompt";
import { ensureSessionId, touchSession } from "@/lib/session/session-id";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const TOOL_ORDER: PromptTool[] = ["nano-banana", "higgsfield", "midjourney"];
const LANGUAGE_ORDER: PromptLanguage[] = ["en", "ko"];

const PLACEHOLDERS: Record<`${PromptTool}-${PromptLanguage}`, string> = {
  "midjourney-en":
    "영어 프롬프트 붙여넣기 (--ar, --style raw 등 MJ 파라미터 포함)",
  "midjourney-ko": "한국어 프롬프트 붙여넣기",
  "nano-banana-en": "영어 프롬프트 붙여넣기",
  "nano-banana-ko": "한국어 프롬프트 붙여넣기",
  "higgsfield-en":
    "영어 프롬프트 (dolly in, tracking shot 등 영상 용어 권장)",
  "higgsfield-ko": "한국어 프롬프트 붙여넣기",
};

const RESULT_LABEL_BY_TOOL: Record<PromptTool, string> = {
  midjourney: "Variation",
  "nano-banana": "Iteration",
  higgsfield: "Shot",
};

type PreparedResult = {
  id: string;
  file: File;
  previewUrl: string;
};

export type PairComposerProps = {
  onSubmitted?: () => void;
};

export function PairComposer({ onSubmitted }: PairComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tool, setTool] = useState<PromptTool>("nano-banana");
  const [language, setLanguage] = useState<PromptLanguage>(
    DEFAULT_LANGUAGE_BY_TOOL["nano-banana"],
  );
  const [languageDirty, setLanguageDirty] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [isFinalPick, setIsFinalPick] = useState(false);
  const [results, setResults] = useState<PreparedResult[]>([]);
  const [smartMatch, setSmartMatch] = useState<RecentCopiedPrompt | null>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const submitting = isPending;

  // 세션 초기화 (여러 탭 공유). 저장은 실제 제출 시에만 touch.
  useEffect(() => {
    ensureSessionId();
  }, []);

  // Cmd+V 스마트 매칭 — 최근 복사한 프롬프트 감지 시 컨펌 카드 노출
  useEffect(() => {
    const recent = loadRecentCopiedPrompt();
    if (recent) setSmartMatch(recent);
  }, []);

  // tool 변경 시 기본 language 연동 (사용자가 직접 바꾸기 전까지만)
  useEffect(() => {
    if (!languageDirty) {
      setLanguage(DEFAULT_LANGUAGE_BY_TOOL[tool]);
    }
  }, [tool, languageDirty]);

  // preview URL 누수 방지
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  const placeholder = PLACEHOLDERS[`${tool}-${language}`];
  const resultLabel = RESULT_LABEL_BY_TOOL[tool];
  const canSubmit = promptText.trim().length > 0 && !submitting;

  const acceptSmartMatch = useCallback(() => {
    if (!smartMatch) return;
    setTool(smartMatch.tool);
    setLanguage(smartMatch.language);
    setLanguageDirty(true); // 재연동 방지
    setPromptText(smartMatch.text);
    setReferenceId(smartMatch.referenceId);
    setSmartMatch(null);
    toast.success("레퍼런스 출처 연결됨", {
      description: `${TOOL_DISPLAY_NAME[smartMatch.tool]} · ${LANGUAGE_DISPLAY_NAME[smartMatch.language]} · 프롬프트 prefill 완료`,
    });
  }, [smartMatch]);

  const rejectSmartMatch = useCallback(() => {
    clearRecentCopiedPrompt();
    setSmartMatch(null);
  }, []);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const msg =
          rejections[0].errors[0]?.message ??
          "파일을 받지 못했습니다 (이미지·영상·20MB 이하)";
        toast.error(msg);
      }
      if (accepted.length === 0) return;
      const prepared = accepted.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        return {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl,
        };
      });
      setResults((prev) => [...prev, ...prepared]);
    },
    [],
  );

  const removeResult = useCallback((id: string) => {
    setResults((prev) => {
      const victim = prev.find((r) => r.id === id);
      if (victim) {
        URL.revokeObjectURL(victim.previewUrl);
        previewUrlsRef.current.delete(victim.previewUrl);
      }
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const {
    getRootProps: getResultRootProps,
    getInputProps: getResultInputProps,
    isDragActive: isResultDragActive,
  } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
    },
    maxSize: 20_000_000,
    multiple: true,
  });

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      const sessionId = ensureSessionId();
      const fd = new FormData();
      fd.set("promptText", promptText.trim());
      fd.set("tool", tool);
      fd.set("language", language);
      fd.set("selfRating", selfRating === null ? "" : String(selfRating));
      fd.set("satisfaction", satisfaction === null ? "" : String(satisfaction));
      fd.set("isFinalPick", isFinalPick ? "true" : "false");
      fd.set("referenceId", referenceId ?? "");
      fd.set("sessionId", sessionId);
      for (const r of results) {
        fd.append("results", r.file, r.file.name);
      }

      startTransition(async () => {
        const result = await createPair(fd);
        if (!result.ok) {
          toast.error("페어 저장 실패", { description: result.error });
          return;
        }
        touchSession();
        const range =
          result.iterationStart === result.iterationEnd
            ? `#${result.iterationStart}`
            : `#${result.iterationStart}–${result.iterationEnd}`;
        toast.success("페어 저장 완료", {
          description: `${TOOL_DISPLAY_NAME[tool]} · ${LANGUAGE_DISPLAY_NAME[language]} · ${results.length || 0}건 첨부 · iteration ${range}`,
        });
        // 폼 리셋 (referenceId는 의도적으로 유지: 같은 레퍼런스 다음 시도)
        setPromptText("");
        setSelfRating(null);
        setSatisfaction(null);
        setIsFinalPick(false);
        for (const r of results) {
          URL.revokeObjectURL(r.previewUrl);
          previewUrlsRef.current.delete(r.previewUrl);
        }
        setResults([]);
        onSubmitted?.();
        router.refresh();
      });
    },
    [
      canSubmit,
      tool,
      language,
      promptText,
      selfRating,
      satisfaction,
      isFinalPick,
      referenceId,
      results,
      onSubmitted,
      router,
    ],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-ref-card border border-border bg-card p-5"
    >
      {smartMatch && (
        <SmartMatchBanner
          recent={smartMatch}
          onAccept={acceptSmartMatch}
          onReject={rejectSmartMatch}
        />
      )}

      <ToolToggle value={tool} onChange={setTool} />

      <LanguageToggle
        value={language}
        onChange={(next) => {
          setLanguage(next);
          setLanguageDirty(true);
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="pair-prompt-text" className="text-sm font-medium">
          프롬프트 본문
        </Label>
        <Textarea
          id="pair-prompt-text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="font-mono text-sm"
        />
        {referenceId && (
          <p className="text-[11px] text-muted-foreground">
            레퍼런스 연결됨 · <span className="font-mono">{referenceId.slice(0, 8)}…</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            결과 파일 <span className="text-xs text-muted-foreground">({resultLabel} 단위)</span>
          </Label>
          <span className="text-[11px] text-muted-foreground">
            {results.length > 0 ? `${results.length}건 선택됨` : "drag-drop · 다중 가능"}
          </span>
        </div>
        <div
          {...getResultRootProps()}
          className={cn(
            "border-2 border-dashed rounded-md p-5 text-center cursor-pointer transition text-xs",
            isResultDragActive
              ? "border-primary bg-accent/30"
              : "border-border hover:border-ring/50 hover:bg-accent/20",
          )}
        >
          <input {...getResultInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="size-5 text-muted-foreground" />
            <span className="font-medium">이미지·영상 파일 드롭 또는 클릭</span>
            <span className="text-muted-foreground">
              JPEG·PNG·WebP·MP4·MOV · 건당 20MB 이하
            </span>
          </div>
        </div>

        {results.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((r, idx) => (
              <li
                key={r.id}
                className="group relative overflow-hidden rounded-md border border-border bg-muted"
              >
                {r.file.type.startsWith("video/") ? (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted-foreground/10 text-xs">
                    영상: {r.file.name}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.previewUrl}
                    alt={r.file.name}
                    className="aspect-square w-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[11px] text-white">
                  {resultLabel} {idx + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeResult(r.id)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label={`${r.file.name} 제거`}
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-border/70 bg-muted/30 p-3">
        <RatingRow
          label="프롬프트 자체 만족도"
          hint="이 프롬프트가 내 머릿속 의도를 얼마나 담았나 (1차 지표)"
          value={selfRating}
          onChange={setSelfRating}
          accent="primary"
        />
        <RatingRow
          label="결과 만족도"
          hint="뽑힌 이미지·영상 품질 (2차 지표)"
          value={satisfaction}
          onChange={setSatisfaction}
          accent="token-lighting"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant={isFinalPick ? "default" : "outline"}
          size="sm"
          onClick={() => setIsFinalPick((v) => !v)}
          className="gap-1.5"
        >
          <Pin className={cn("size-3.5", isFinalPick && "fill-current")} />
          {isFinalPick ? "최종 채택" : "최종 채택 표시"}
        </Button>

        <div className="flex items-center gap-2">
          {referenceId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReferenceId(null)}
              className="text-xs text-muted-foreground"
            >
              레퍼런스 연결 해제
            </Button>
          )}
          <Button type="submit" disabled={!canSubmit} className="gap-1.5">
            <Send className="size-3.5" />
            {submitting ? "저장 중…" : "페어 저장"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SmartMatchBanner({
  recent,
  onAccept,
  onReject,
}: {
  recent: RecentCopiedPrompt;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-token-style/40 bg-token-style/5 p-3 text-sm"
    >
      <Sparkles className="mt-0.5 size-4 shrink-0 text-token-style" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-foreground">이 레퍼런스에서 왔죠?</p>
        <p className="text-xs text-muted-foreground">
          최근 복사: {TOOL_DISPLAY_NAME[recent.tool]} ·{" "}
          {LANGUAGE_DISPLAY_NAME[recent.language]} ·{" "}
          <span className="font-mono">{recent.referenceId.slice(0, 8)}…</span>
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          “{recent.text.slice(0, 140)}
          {recent.text.length > 140 ? "…" : ""}”
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Button type="button" size="sm" onClick={onAccept}>
          프롬프트 불러오기
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onReject}
          className="text-xs text-muted-foreground"
        >
          <X className="size-3" /> 닫기
        </Button>
      </div>
    </div>
  );
}

function ToolToggle({
  value,
  onChange,
}: {
  value: PromptTool;
  onChange: (next: PromptTool) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">도구</Label>
      <div
        role="radiogroup"
        aria-label="도구 선택"
        className="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
      >
        {TOOL_ORDER.map((t) => {
          const active = value === t;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(t)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {TOOL_DISPLAY_NAME[t]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LanguageToggle({
  value,
  onChange,
}: {
  value: PromptLanguage;
  onChange: (next: PromptLanguage) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">언어</Label>
      <div
        role="radiogroup"
        aria-label="언어 선택"
        className="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
      >
        {LANGUAGE_ORDER.map((lang) => {
          const active = value === lang;
          return (
            <button
              key={lang}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(lang)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {LANGUAGE_DISPLAY_NAME[lang]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RatingRow({
  label,
  hint,
  value,
  onChange,
  accent,
}: {
  label: string;
  hint: string;
  value: number | null;
  onChange: (next: number | null) => void;
  accent: "primary" | "token-lighting";
}) {
  const colorClass =
    accent === "primary"
      ? "text-primary"
      : "text-token-lighting";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              onClick={() => onChange(value === n ? null : n)}
              className={cn(
                "rounded-sm p-1 transition hover:scale-110",
                active ? colorClass : "text-muted-foreground/40",
              )}
            >
              <Star
                className={cn("size-4", active && "fill-current")}
                aria-hidden
              />
              <span className="sr-only">{n}점</span>
            </button>
          );
        })}
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-1 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
          >
            지우기
          </button>
        )}
      </div>
    </div>
  );
}
