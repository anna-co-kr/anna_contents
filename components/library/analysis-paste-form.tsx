"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { parseClaudeCodeResponse } from "@/lib/claude-code/paste-parser";
import { saveReferenceTokens } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";

export type AnalysisPasteFormProps = {
  referenceId: string;
  onSaved?: () => void;
};

type State =
  | { kind: "idle" }
  | { kind: "parse-error"; message: string; stage: string }
  | { kind: "saving" }
  | { kind: "save-error"; message: string }
  | { kind: "saved" };

export function AnalysisPasteForm({
  referenceId,
  onSaved,
}: AnalysisPasteFormProps) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!value.trim()) return;

    const parsed = parseClaudeCodeResponse(value);
    if (!parsed.ok) {
      setState({
        kind: "parse-error",
        message: parsed.error,
        stage: parsed.stage,
      });
      return;
    }

    setState({ kind: "saving" });
    startTransition(async () => {
      const result = await saveReferenceTokens({
        referenceId,
        tokens: parsed.tokens,
        source: "claude-code",
      });
      if (!result.ok) {
        setState({ kind: "save-error", message: result.error });
        return;
      }
      setState({ kind: "saved" });
      setValue("");
      onSaved?.();
      router.refresh();
    });
  };

  const disabled = state.kind === "saving" || isPending;
  const saved = state.kind === "saved";

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-xs font-medium">
        Claude Code 응답 붙여넣기
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (state.kind !== "idle" && state.kind !== "saved") {
            setState({ kind: "idle" });
          }
        }}
        placeholder={`{\n  "subject": "...",\n  "style": "...",\n  "lighting": "...",\n  "composition": "...",\n  "medium": "...",\n  "mood": "..."\n}`}
        rows={8}
        disabled={disabled}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />

      {state.kind === "parse-error" && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs"
        >
          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-destructive font-medium">
              검증 실패 · {stageLabel(state.stage)}
            </p>
            <p className="text-destructive/80">{state.message}</p>
          </div>
        </div>
      )}

      {state.kind === "save-error" && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs"
        >
          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-destructive">{state.message}</p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-md border border-token-lighting/40 bg-token-lighting/10 p-3 text-xs">
          <CheckCircle2 className="size-4 text-token-lighting shrink-0" />
          <p className="font-medium">6차원 토큰이 저장되었습니다</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={disabled || !value.trim()}
        >
          {state.kind === "saving" || isPending ? (
            <>
              <Loader2 className="size-3 animate-spin mr-1" />
              저장 중...
            </>
          ) : saved ? (
            "다시 저장"
          ) : (
            "검증 + 저장"
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          JSON만 · 코드펜스(` ```json `) 허용 · 6개 키 엄격
        </p>
      </div>
    </div>
  );
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "extract":
      return "JSON 객체 추출";
    case "parse":
      return "JSON 파싱";
    case "validate":
      return "6키 스키마 검증";
    default:
      return stage;
  }
}
