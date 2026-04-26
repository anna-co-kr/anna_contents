import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import RemixComposer, {
  type RemixComposerReference,
} from "@/components/remix/remix-composer";
import type {
  RemixTool,
  SixDimTokens,
} from "@/lib/remix/template-engine";
import { PageGuide } from "@/components/common/page-guide";

/**
 * Task 028 (F006) — V1.5 리믹스 요청 프롬프트 생성기.
 *
 * 기준 레퍼런스 + tool/language 토글 + 새 주제 → Claude Code 붙여넣을 요청 문장 조립.
 * 외부 API 호출 0 (lib/remix/template-engine.ts pure function).
 *
 * proxy.ts 미들웨어가 비로그인 redirect 담당. cacheComponents: true 환경 → Suspense 경계.
 */
export default function RemixPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">리믹스 요청 생성</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-chip border border-border text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
            V1.5
          </span>
          <PageGuide
            title="리믹스 요청 생성"
            intro="이미 라이브러리에 쌓인 어떤 카드의 분위기를 살리면서 '주제만 바꾼' 새 프롬프트를 만들고 싶을 때 쓰는 곳이에요. 도구별·언어별로 알아서 잘 쓰는 문장으로 조립해줘요."
            steps={[
              "기준이 될 레퍼런스 카드를 한 개 골라요.",
              "도구를 골라요 (MJ·NBP·Higgsfield) — 카드의 베스트 도구가 있으면 자동 선택돼요.",
              "언어를 골라요 — 도구별 추천 언어(MJ·Higgsfield는 en, NBP는 ko)가 기본값.",
              "'새 주제'에 만들고 싶은 새로운 소재를 한국어 또는 영어로 짧게 적어요. (예: '럭셔리 호텔 조식 정물')",
              "오른쪽에 조립된 요청 문장이 실시간으로 보여요. '복사' 버튼 → Claude Code에 붙여넣기 → 진짜 생성용 프롬프트로 답이 와요.",
            ]}
            whenToUse="이미 만족스러웠던 카드 분위기를 다른 주제에 그대로 옮기고 싶을 때. 매번 빈 화면에서 프롬프트를 짜는 대신, 6가지 토큰 위에 주제만 갈아끼우는 방식이라 훨씬 빠르고 일관돼요."
            nextStep="Claude Code에서 받은 진짜 프롬프트로 도구에서 그림을 만들고, 결과는 /pairs 페이지에 페어로 기록해요."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          기준 레퍼런스의 6차원 토큰 + 새 주제 → Claude Code에 붙여넣을 요청 문장 조립 (클라이언트 템플릿 엔진, 외부 API 호출 0).
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">레퍼런스 목록 불러오는 중...</p>
        }
      >
        <RemixComposerLoader />
      </Suspense>
    </section>
  );
}

const ALLOWED_TOOLS: ReadonlyArray<RemixTool> = [
  "midjourney",
  "nano-banana",
  "higgsfield",
];

async function RemixComposerLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 토큰 보유 references + 각 ref의 best tool (self_rating ≥ 4 최근 prompt) 함께 fetch
  const { data, error } = await supabase
    .from("references")
    .select(
      `id, thumbnail_url, notes,
       reference_tokens!inner ( tokens, is_active ),
       prompts ( tool, self_rating, created_at )`,
    )
    .eq("user_id", user.id)
    .eq("reference_tokens.is_active", true)
    .order("uploaded_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <p className="text-sm text-red-600">
        레퍼런스 로딩 실패: {error.message}
      </p>
    );
  }

  type RawRow = {
    id: string;
    thumbnail_url: string | null;
    notes: string | null;
    reference_tokens: { tokens: SixDimTokens; is_active: boolean }[];
    prompts:
      | { tool: string; self_rating: number | null; created_at: string }[]
      | null;
  };

  const references: RemixComposerReference[] = ((data ?? []) as RawRow[])
    .map((row): RemixComposerReference | null => {
      const tokens = row.reference_tokens?.[0]?.tokens;
      if (!tokens) return null;
      // best tool: self_rating ≥ 4 중 가장 최근. 없으면 null.
      const successful = (row.prompts ?? [])
        .filter(
          (p): p is { tool: RemixTool; self_rating: number; created_at: string } =>
            !!p && (p.self_rating ?? 0) >= 4 && ALLOWED_TOOLS.includes(p.tool as RemixTool),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const bestTool: RemixTool | null = successful[0]?.tool ?? null;
      return {
        id: row.id,
        thumbnail_url: row.thumbnail_url,
        notes: row.notes,
        tokens,
        bestTool,
      };
    })
    .filter((r): r is RemixComposerReference => r !== null);

  return <RemixComposer references={references} />;
}
