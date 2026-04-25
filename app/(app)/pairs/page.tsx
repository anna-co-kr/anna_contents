import { Suspense } from "react";
import { listPairs } from "./actions";
import { getSignedPairResultUrl } from "@/lib/storage/signed-url";
import { PairComposer } from "@/components/pairs/pair-composer";
import { PairList, type PairListRow } from "@/components/pairs/pair-list";
import { SessionIndicator } from "@/components/pairs/session-indicator";

export default function PairsPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            프롬프트 페어 로그
          </h1>
          <p className="text-sm text-muted-foreground">
            MJ · NBP · Higgsfield 프롬프트와 결과를 페어로 기록 — self_rating 1차
            지표, satisfaction 2차 지표로 분리 측정.
          </p>
        </div>
        <SessionIndicator />
      </header>

      <PairComposer />

      <Suspense fallback={<PairListSkeleton />}>
        <PairListShell />
      </Suspense>
    </section>
  );
}

async function PairListShell() {
  const result = await listPairs({ limit: 100 });
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-ref-card border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        {result.error}
      </div>
    );
  }

  const rows: PairListRow[] = await Promise.all(
    result.rows.map(async (r) => ({
      pairId: r.pairId,
      promptId: r.promptId,
      tool: r.tool,
      language: r.language,
      promptText: r.promptText,
      selfRating: r.selfRating,
      satisfaction: r.satisfaction,
      isFinalPick: r.isFinalPick,
      iterationCount: r.iterationCount,
      createdAt: r.createdAt,
      resultImageUrl: r.resultImagePath
        ? await getSignedPairResultUrl(r.resultImagePath)
        : null,
    })),
  );

  return <PairList rows={rows} />;
}

function PairListSkeleton() {
  return (
    <div className="rounded-ref-card border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
      페어 목록 불러오는 중…
    </div>
  );
}
