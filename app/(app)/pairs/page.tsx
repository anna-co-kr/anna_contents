import { Suspense } from "react";
import { PairComposer } from "@/components/pairs/pair-composer";
import { PairList } from "@/components/pairs/pair-list";
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
  // Task 015에서 listPairs() Server Action으로 실제 조회 교체 예정
  const rows: React.ComponentProps<typeof PairList>["rows"] = [];
  return <PairList rows={rows} />;
}

function PairListSkeleton() {
  return (
    <div className="rounded-ref-card border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
      페어 목록 불러오는 중…
    </div>
  );
}
