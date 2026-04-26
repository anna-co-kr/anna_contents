import SearchForm from "@/components/search/search-form";
import { PageGuide } from "@/components/common/page-guide";

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
          <PageGuide
            title="태그·키워드 검색"
            intro="라이브러리에 쌓인 카드가 많아져서 '그때 그 분위기 어디 있었지?' 싶을 때 쓰는 곳이에요. 단어 한 개나 태그 몇 개로 카드를 빠르게 골라낼 수 있어요."
            steps={[
              "검색창에 떠올린 단어를 한국어든 영어든 그대로 적어요. (예: 'espresso', '점프', 'tracking shot')",
              "단어는 메모(notes) · 6차원 토큰 · 내가 적어둔 프롬프트 안 어디든 들어 있으면 매칭돼요.",
              "도구(MJ·NBP·Higgsfield) 또는 언어(en·ko) 칩을 눌러 좁혀요.",
              "태그 칩을 여러 개 누르면 '모두 가진' 카드만 골라줘요(교집합).",
              "결과 카드는 최신순으로 50건까지. 클릭하면 상세 페이지로 가요.",
            ]}
            whenToUse="새로운 그림을 만들기 전에 '내가 좋아하던 비슷한 분위기 카드를 먼저 찾자' 싶을 때, 또는 '오버캐스트 조명 들어간 거 모아보자' 같은 분류가 필요할 때."
            nextStep="찾은 카드를 /remix 페이지로 가져가면 그 카드의 토큰을 살린 새 프롬프트를 만들 수 있어요."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          notes · 6차원 토큰 · 프롬프트 텍스트에 대한 ILIKE 키워드 검색 + 태그 교집합 + tool/language 필터 (외부 임베딩 API 0).
        </p>
      </header>

      <SearchForm />
    </section>
  );
}
