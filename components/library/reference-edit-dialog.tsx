"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, AlertCircle } from "lucide-react";
import { updateReferenceScore } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";
import { DotSlider } from "@/components/ui/dot-slider";
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
import { SnippetList } from "@/components/library/snippet-list";

export type ReferenceEditDialogProps = {
  referenceId: string;
  initialScore: number | null;
  trigger?: React.ReactNode;
};

export function ReferenceEditDialog({
  referenceId,
  initialScore,
  trigger,
}: ReferenceEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 rounded-full bg-background/90 shadow-sm backdrop-blur hover:bg-background"
            aria-label="상세 편집"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>레퍼런스 편집</DialogTitle>
          <DialogDescription className="text-xs">
            점수와 프롬프트 스니펫을 관리합니다. 태그는 카드의 🏷 버튼을 사용하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ScoreSection
            referenceId={referenceId}
            initialScore={initialScore}
            onSaved={() => router.refresh()}
          />

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-medium">프롬프트 스니펫</h3>
            <SnippetList
              referenceId={referenceId}
              loadMode="defer"
              shouldLoad={open}
              onChanged={() => router.refresh()}
            />
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              닫기
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 점수 섹션 ──────────────────────────────────────────────────────────────

function ScoreSection({
  referenceId,
  initialScore,
  onSaved,
}: {
  referenceId: string;
  initialScore: number | null;
  onSaved: () => void;
}) {
  const [score, setScore] = useState<number | null>(initialScore);
  const [savedScore, setSavedScore] = useState<number | null>(initialScore);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = score !== savedScore;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateReferenceScore({ referenceId, score });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedScore(score);
      onSaved();
    });
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">점수</h3>
        {dirty && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1 size-3 animate-spin" /> 저장 중
              </>
            ) : (
              "점수 저장"
            )}
          </Button>
        )}
      </div>
      <DotSlider
        value={score}
        onChange={setScore}
        label="즐겨찾기 점수 (1~10)"
      />
      {error && (
        <div
          role="alert"
          className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
