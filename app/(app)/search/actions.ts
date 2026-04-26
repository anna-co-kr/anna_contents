"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getSignedThumbnailUrlsBatch,
  LIST_THUMBNAIL_TRANSFORM,
} from "@/lib/storage/signed-url";

/**
 * Task 026 (F005) — 태그·키워드 검색.
 *
 * 외부 임베딩 API 없음. Supabase ILIKE + JOIN.
 * 검색 대상:
 *  - references.notes ILIKE '%keyword%'
 *  - reference_tokens.tokens::text ILIKE '%keyword%' (6차원 JSON 전체)
 *  - prompts.prompt_text ILIKE '%keyword%'
 *
 * 추가 필터: tool 다중, language 다중, 태그 교집합(선택된 모든 tag 보유)
 * 결과: reference_tokens.is_active=true 인 references만.
 */

export type SearchParams = {
  keyword?: string | null;
  tools?: string[] | null; // ['midjourney', 'nano-banana', 'higgsfield']
  languages?: string[] | null; // ['en', 'ko']
  tagValues?: string[] | null; // 선택된 tags.value 들
};

export type SearchResultCard = {
  id: string;
  thumbnail_url: string | null;
  /** Storage path → 1h signed URL + 160px transform (서버에서 batch 발급). */
  signed_thumbnail_url: string | null;
  notes: string | null;
  uploaded_at: string;
  tokens: {
    subject: string;
    style: string;
    lighting: string;
    composition: string;
    medium: string;
    mood: string;
  };
  tags: { value: string; tag_kind: string }[];
  bestPrompt: {
    prompt_text: string;
    tool: string;
    language: string;
    self_rating: number | null;
  } | null;
};

export type SearchResult =
  | { ok: true; cards: SearchResultCard[]; total: number }
  | { ok: false; error: string };

export async function searchReferences(
  params: SearchParams,
): Promise<SearchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const keyword = params.keyword?.trim() ?? "";
  const tools = (params.tools ?? []).filter(Boolean);
  const langs = (params.languages ?? []).filter(Boolean);
  const tagValues = (params.tagValues ?? []).filter(Boolean);

  // 1. 태그 교집합 — 선택된 모든 tag 값 보유한 reference_id 집합 미리 SQL로 계산
  let tagFilteredIds: string[] | null = null;
  if (tagValues.length > 0) {
    const { data: tagRows, error: tagErr } = await supabase
      .from("tags")
      .select("reference_id, tag")
      .eq("user_id", user.id)
      .in("tag", tagValues);
    if (tagErr) return { ok: false, error: `태그 조회 실패: ${tagErr.message}` };
    // 모든 tag 보유한 ref만 (count = tagValues.length)
    const counter = new Map<string, number>();
    for (const row of tagRows ?? []) {
      counter.set(row.reference_id, (counter.get(row.reference_id) ?? 0) + 1);
    }
    tagFilteredIds = [...counter.entries()]
      .filter(([, c]) => c >= tagValues.length)
      .map(([refId]) => refId);
    if (tagFilteredIds.length === 0) {
      return { ok: true, cards: [], total: 0 };
    }
  }

  // 2. references + reference_tokens JOIN, ILIKE 조건
  let query = supabase
    .from("references")
    .select(
      `id, thumbnail_url, notes, uploaded_at,
       reference_tokens!inner ( tokens, is_active ),
       tags ( tag, tag_kind ),
       prompts ( prompt_text, tool, language, self_rating, created_at )`,
    )
    .eq("user_id", user.id)
    .eq("reference_tokens.is_active", true)
    .order("uploaded_at", { ascending: false })
    .limit(50);

  if (tagFilteredIds) {
    query = query.in("id", tagFilteredIds);
  }

  // 키워드 ILIKE는 클라이언트 후처리 (jsonb ::text는 PostgREST .or() 표현이 까다로워
  //   — 50건 limit 안에서 notes·tokens text·prompts text 모두 후처리하는 비용이 충분히 낮음)

  const { data, error } = await query;
  if (error) return { ok: false, error: `검색 실패: ${error.message}` };

  type RawRow = {
    id: string;
    thumbnail_url: string | null;
    notes: string | null;
    uploaded_at: string;
    reference_tokens: { tokens: SearchResultCard["tokens"]; is_active: boolean }[];
    tags: { tag: string; tag_kind: string }[] | null;
    prompts:
      | {
          prompt_text: string;
          tool: string;
          language: string;
          self_rating: number | null;
          created_at: string;
        }[]
      | null;
  };

  const lower = keyword.toLowerCase();
  const cards: SearchResultCard[] = ((data ?? []) as RawRow[])
    .map((row) => {
      const tokens = row.reference_tokens?.[0]?.tokens;
      if (!tokens) return null;

      // tool / language 필터 (해당 reference에 묶인 prompt 중 매치 있는 것만 통과)
      const promptList = row.prompts ?? [];
      const matchedPrompts = promptList.filter((p) => {
        if (tools.length > 0 && !tools.includes(p.tool)) return false;
        if (langs.length > 0 && !langs.includes(p.language)) return false;
        return true;
      });
      if ((tools.length > 0 || langs.length > 0) && matchedPrompts.length === 0) {
        return null;
      }

      // 키워드 후처리: notes·tokens text·prompts text 중 하나라도 매칭이면 통과
      if (lower) {
        const tokensText = JSON.stringify(tokens).toLowerCase();
        const promptsText = (matchedPrompts.length > 0
          ? matchedPrompts
          : promptList
        )
          .map((p) => p.prompt_text)
          .join(" ")
          .toLowerCase();
        const notesText = (row.notes ?? "").toLowerCase();
        const hit =
          notesText.includes(lower) ||
          tokensText.includes(lower) ||
          promptsText.includes(lower);
        if (!hit) return null;
      }

      // best prompt: filtered 또는 전체 중 self_rating ≥ 4 가장 최근
      const candidates = matchedPrompts.length > 0 ? matchedPrompts : promptList;
      const successful = candidates
        .filter((p) => (p.self_rating ?? 0) >= 4)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const bestPrompt = successful[0]
        ? {
            prompt_text: successful[0].prompt_text,
            tool: successful[0].tool,
            language: successful[0].language,
            self_rating: successful[0].self_rating,
          }
        : null;

      const card: SearchResultCard = {
        id: row.id,
        thumbnail_url: row.thumbnail_url,
        signed_thumbnail_url: null,
        notes: row.notes,
        uploaded_at: row.uploaded_at,
        tokens,
        tags: (row.tags ?? []).map((t) => ({ value: t.tag, tag_kind: t.tag_kind })),
        bestPrompt,
      };
      return card;
    })
    .filter((c): c is SearchResultCard => c !== null);

  // 결과 N개의 thumbnail signed URL을 1번 호출로 batch 발급 + 160px 작은 미리보기 변환.
  const thumbPaths = cards
    .map((c) => c.thumbnail_url)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  const signedMap = await getSignedThumbnailUrlsBatch(thumbPaths, {
    transform: LIST_THUMBNAIL_TRANSFORM,
  });
  for (const c of cards) {
    if (c.thumbnail_url) c.signed_thumbnail_url = signedMap.get(c.thumbnail_url) ?? null;
  }

  return { ok: true, cards, total: cards.length };
}

export type ListAllTagsResult =
  | { ok: true; tags: { value: string; tag_kind: string; count: number }[] }
  | { ok: false; error: string };

/** 검색 폼의 태그 multi-select 옵션. tag_kind별 그룹용. */
export async function listAllTags(): Promise<ListAllTagsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("tags")
    .select("tag, tag_kind")
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  // 같은 (tag, tag_kind) 빈도 집계 — 외부 인터페이스는 'value'로 normalize
  const counter = new Map<string, { value: string; tag_kind: string; count: number }>();
  for (const row of data ?? []) {
    const key = `${row.tag_kind}:${row.tag}`;
    const prev = counter.get(key);
    if (prev) prev.count++;
    else counter.set(key, { value: row.tag, tag_kind: row.tag_kind, count: 1 });
  }
  const tags = [...counter.values()].sort(
    (a, b) =>
      a.tag_kind.localeCompare(b.tag_kind) || b.count - a.count,
  );
  return { ok: true, tags };
}
