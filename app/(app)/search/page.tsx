import SearchForm from "@/components/search/search-form";

/**
 * Task 026 (F005) — 태그·키워드 검색 (V1.5).
 *
 * 외부 임베딩 API 0. Supabase + 클라이언트 후처리 ILIKE.
 * 검색 대상: references.notes / reference_tokens.tokens 6 키 / prompts.prompt_text
 * 추가 필터: tool 다중 / language 다중 / 태그 교집합
 */
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
          notes · 6차원 토큰 · 프롬프트 텍스트에 대한 ILIKE 키워드 검색 + 태그 교집합 + tool/language 필터 (외부 임베딩 API 0).
        </p>
      </header>

      <SearchForm />
    </section>
  );
}
