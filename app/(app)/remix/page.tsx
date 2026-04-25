import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import RemixComposer, {
  type RemixComposerReference,
} from "@/components/remix/remix-composer";
import type {
  RemixTool,
  SixDimTokens,
} from "@/lib/remix/template-engine";

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
