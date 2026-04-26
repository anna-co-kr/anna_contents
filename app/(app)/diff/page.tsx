import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import DiffPicker, {
  type DiffPickerPair,
} from "@/components/diff/diff-picker";
import { PageGuide } from "@/components/common/page-guide";

/**
 * Task 018 (F004) — V1.5 토큰 diff 페이지.
 * Task 027 보강 — searchParams a/b로 /pairs → /diff 진입 시 자동 선택.
 *
 * 페어 2개 선택 → 프롬프트 텍스트 단어 단위 diff 시각화 (jsdiff).
 * 동일 언어 비교 권장 (PRD 164-174).
 *
 * proxy.ts 미들웨어가 비로그인 redirect를 담당하므로 본 페이지는 로그인 전제.
 * cacheComponents: true 환경이라 dynamic API 사용 시 Suspense 경계 필수.
 */
export default function DiffPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">토큰 diff</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-chip border border-border text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
            V1.5
          </span>
          <PageGuide
            title="토큰 diff"
            intro="두 페어의 프롬프트를 나란히 놓고 '어떤 단어가 추가됐고 어떤 단어가 빠졌는지'를 색깔로 보여주는 곳이에요. 비교를 통해 어떤 단어 차이가 결과를 바꿨는지 또렷이 보여요."
            steps={[
              "왼쪽 A에 첫 번째 페어를 골라요.",
              "오른쪽 B에 두 번째 페어를 골라요. 같은 언어로 만든 페어를 비교해야 의미 있어요.",
              "초록색은 B에 새로 들어간 단어, 빨간색은 A에서 빠진 단어예요.",
              "왼쪽 위 별점·만족도를 비교해서 '어떤 단어 차이가 결과를 더 좋게 만들었는지' 짐작해요.",
              "/pairs 페이지에서 페어 옆 'diff →' 버튼을 누르면 A가 자동 선택된 채로 이 페이지에 와요.",
            ]}
            whenToUse="비슷한 주제로 두 번 시도했는데 한 쪽만 잘 나왔을 때, 두 프롬프트의 차이를 단어 단위로 보고 다음 시도에 반영하고 싶을 때."
            nextStep="알게 된 단어 패턴을 /remix 페이지의 새 주제에 반영해 다음 라운드에 적용해요."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          페어 2개를 선택해 프롬프트 텍스트의 단어 단위 diff를 시각화합니다 (클라이언트 jsdiff, 외부 API 호출 0).
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">페어 목록 불러오는 중...</p>
        }
      >
        <DiffPickerLoader searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function DiffPickerLoader({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a: initialA, b: initialB } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("pairs")
    .select(
      `id, satisfaction, is_final_pick, iteration_count_cumulative, created_at,
       prompt:prompt_id ( id, prompt_text, tool, language, self_rating, reference_id )`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <p className="text-sm text-red-600">
        페어 로딩 실패: {error.message}
      </p>
    );
  }

  const pairs: DiffPickerPair[] = (data ?? []).map((row) => {
    const promptArr = row.prompt as unknown;
    const prompt = Array.isArray(promptArr)
      ? (promptArr[0] as DiffPickerPair["prompt"])
      : (promptArr as DiffPickerPair["prompt"]);
    return {
      id: row.id,
      satisfaction: row.satisfaction,
      is_final_pick: row.is_final_pick,
      iteration_count_cumulative: row.iteration_count_cumulative,
      created_at: row.created_at,
      prompt: prompt ?? null,
    };
  });

  return <DiffPicker pairs={pairs} initialA={initialA} initialB={initialB} />;
}
