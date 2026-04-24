import { listReferenceCards } from "@/app/(app)/library/actions";
import { ReferenceCard } from "@/components/library/reference-card";
import { EmptyLibrary } from "@/components/library/empty-library";

export type LibraryGridProps = {
  limit?: number;
};

export async function LibraryGrid({ limit = 50 }: LibraryGridProps) {
  const result = await listReferenceCards(limit, 0);

  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-ref-card border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        라이브러리 조회 실패: {result.error}
      </div>
    );
  }

  if (result.cards.length === 0) {
    return <EmptyLibrary />;
  }

  return (
    <section className="space-y-3" aria-label="레퍼런스 라이브러리 그리드">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-medium">
          총 <span className="tabular-nums">{result.totalCount}</span>개
        </h2>
        {result.cards.length < result.totalCount && (
          <p className="text-xs text-muted-foreground">
            최근 {result.cards.length}개 표시 (페이지네이션은 Task 011 이후 추가)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {result.cards.map((card) => (
          <ReferenceCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
