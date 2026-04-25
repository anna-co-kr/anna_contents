import { listReferenceCards } from "@/app/(app)/library/actions";
import { FilterableGrid } from "@/components/library/filterable-grid";
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

  return <FilterableGrid cards={result.cards} totalCount={result.totalCount} />;
}
