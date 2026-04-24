"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { TOKEN_KEYS, tokenSchema, type Token } from "@/lib/schemas/tokens";
import { saveReferenceTokens } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EMPTY_TOKENS: Record<(typeof TOKEN_KEYS)[number], string> = {
  subject: "",
  style: "",
  lighting: "",
  composition: "",
  medium: "",
  mood: "",
};

const KEY_LABEL: Record<(typeof TOKEN_KEYS)[number], string> = {
  subject: "subject (피사체)",
  style: "style (스타일 DNA)",
  lighting: "lighting (조명 톤)",
  composition: "composition (구도)",
  medium: "medium (매체·재질)",
  mood: "mood (분위기)",
};

export type ManualTokensDialogProps = {
  referenceId: string;
  trigger?: React.ReactNode;
  onSaved?: () => void;
};

export function ManualTokensDialog({
  referenceId,
  trigger,
  onSaved,
}: ManualTokensDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY_TOKENS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    const parsed = tokenSchema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(
        `[${issue.path.join(".") || "root"}] ${issue.message}`,
      );
      return;
    }

    startTransition(async () => {
      const result = await saveReferenceTokens({
        referenceId,
        tokens: parsed.data as Token,
        source: "manual",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setValues(EMPTY_TOKENS);
      onSaved?.();
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            수동 6필드 입력
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>수동 6차원 토큰 입력</DialogTitle>
          <DialogDescription className="text-xs">
            Claude Code 없이 직접 채웁니다. 각 필드는 영어 단어·구절로 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {TOKEN_KEYS.map((key) => (
            <div key={key} className="space-y-1">
              <label
                htmlFor={`manual-${key}`}
                className="text-xs font-medium"
              >
                {KEY_LABEL[key]}
              </label>
              <input
                id={`manual-${key}`}
                type="text"
                value={values[key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
                placeholder="e.g. ceramic teapot"
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs"
          >
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" disabled={isPending}>
              취소
            </Button>
          </DialogClose>
          <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-3 animate-spin mr-1" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
