export default function SearchPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">태그·키워드 검색</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-chip border border-border text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
            V1.5
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          태그 다중 필터 · 프롬프트 텍스트 ILIKE 검색 (외부 임베딩 API 없음, Task 026에서 구현 예정)
        </p>
      </header>
    </section>
  );
}
