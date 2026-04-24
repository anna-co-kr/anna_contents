import { Suspense } from "react";
import { DropZone } from "@/components/library/drop-zone";
import { LibraryGrid } from "@/components/library/library-grid";

export default function LibraryPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          레퍼런스 라이브러리
        </h1>
        <p className="text-sm text-muted-foreground">
          URL · 이미지를 드롭해 6차원 토큰으로 축적. 카드 hover 시 우상단 버튼으로 태그·스코어·스니펫을 편집할 수 있어요.
        </p>
      </header>

      <DropZone />

      <Suspense fallback={<GridSkeleton />}>
        <LibraryGrid />
      </Suspense>
    </section>
  );
}

function GridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="라이브러리 불러오는 중"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-ref-card border border-border bg-card"
        >
          <div className="aspect-square w-full animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
