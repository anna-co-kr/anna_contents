import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import DiffPicker, {
  type DiffPickerPair,
} from "@/components/diff/diff-picker";

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
export default async function DiffPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">토큰 diff</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-chip border border-border text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
            V1.5
          </span>
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
        <DiffPickerLoader initialA={a} initialB={b} />
      </Suspense>
    </section>
  );
}

async function DiffPickerLoader({
  initialA,
  initialB,
}: {
  initialA?: string;
  initialB?: string;
}) {
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
