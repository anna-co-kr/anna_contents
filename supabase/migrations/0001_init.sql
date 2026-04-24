-- Prompt Studio v0.5 초기 스키마 (2026-04-24)
-- Claude Code CLI 컴패니언 모델 (외부 AI API 미사용):
--   - Anthropic·Voyage API 호출 없음
--   - pgvector extension 미활성
--   - reference_tokens.embedding 컬럼 없음
--   - vision_usage counter 테이블 없음
-- 참조: docs/office.hour/PRD.md, docs/office.hour/ROADMAP.md Task 003

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENUM 타입
-- ═══════════════════════════════════════════════════════════════════════════

-- 프롬프트 대상 이미지 생성 도구 (실사용 분기)
create type prompt_tool as enum ('midjourney', 'nano-banana');

-- 프롬프트 언어 (MJ=en, NBP=ko 기본 연동, 수동 override 허용)
create type prompt_language as enum ('en', 'ko');

-- 태그 구분 (PRD 4종 고정)
create type tag_kind as enum ('category', 'mood', 'color', 'purpose');

-- 프롬프트 출처 구분
create type prompt_source as enum ('copied', 'modified', 'remix');


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. references — 레퍼런스 원본
-- "references"는 PostgreSQL 예약어에 가까우므로 quoted identifier로 일관 사용
-- ═══════════════════════════════════════════════════════════════════════════

create table "references" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  thumbnail_url text,
  favorite_score smallint check (favorite_score is null or (favorite_score between 1 and 10)),
  notes text,
  uploaded_at timestamptz not null default now()
);

-- 중복 URL 드롭 방지 (이미지 직접 업로드는 source_url NULL 허용) — ARCH-1 CEO 리뷰
create unique index references_source_url_unique
  on "references" (user_id, source_url)
  where source_url is not null;

create index references_user_uploaded_idx on "references" (user_id, uploaded_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. reference_tokens — 6차원 토큰 분석 결과 (Claude Code CLI 응답 또는 수동)
-- 1 reference : N reference_tokens 이력 보존 구조, 활성 레코드는 is_active=true 하나만
-- ═══════════════════════════════════════════════════════════════════════════

create table reference_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_id uuid not null references "references"(id) on delete cascade,
  tokens jsonb not null check (
    tokens ?& array['subject','style','lighting','composition','medium','mood']
    and jsonb_typeof(tokens->'subject') = 'string'     and length(tokens->>'subject') > 0
    and jsonb_typeof(tokens->'style') = 'string'       and length(tokens->>'style') > 0
    and jsonb_typeof(tokens->'lighting') = 'string'    and length(tokens->>'lighting') > 0
    and jsonb_typeof(tokens->'composition') = 'string' and length(tokens->>'composition') > 0
    and jsonb_typeof(tokens->'medium') = 'string'      and length(tokens->>'medium') > 0
    and jsonb_typeof(tokens->'mood') = 'string'        and length(tokens->>'mood') > 0
  ),
  source text not null default 'claude-code' check (source in ('claude-code', 'manual')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 활성 레코드 1개만 유지 (재분석 시 이전 레코드 is_active=false로 전환) — ENG-1 autoplan
create unique index reference_tokens_active_unique
  on reference_tokens (reference_id)
  where is_active = true;

create index reference_tokens_reference_idx on reference_tokens (reference_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. tags — 수동 태그 (category/mood/color/purpose 4종)
-- ═══════════════════════════════════════════════════════════════════════════

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_id uuid not null references "references"(id) on delete cascade,
  tag text not null check (length(tag) > 0),
  tag_kind tag_kind not null,
  created_at timestamptz not null default now()
);

create index tags_reference_idx on tags (reference_id);
create index tags_user_kind_tag_idx on tags (user_id, tag_kind, tag);


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. prompts — 프롬프트 스니펫
-- tool·language·self_rating 3필드가 B 재설계 핵심 (2026-04-24)
-- ═══════════════════════════════════════════════════════════════════════════

create table prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_id uuid references "references"(id) on delete set null,
  prompt_text text not null check (length(prompt_text) > 0),
  tool prompt_tool not null,
  language prompt_language not null,
  -- 1차 성공 지표: 프롬프트 자체 만족도 ("머릿속 의도를 얼마나 담았나")
  self_rating smallint check (self_rating is null or (self_rating between 1 and 5)),
  source prompt_source not null default 'copied',
  created_at timestamptz not null default now()
);

create index prompts_tool_language_idx on prompts (user_id, tool, language);
create index prompts_reference_idx on prompts (reference_id);
create index prompts_user_created_idx on prompts (user_id, created_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. pairs — 프롬프트 페어 로그 (iteration count + 이미지 결과 만족도)
-- ═══════════════════════════════════════════════════════════════════════════

create table pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid not null references prompts(id) on delete cascade,
  result_image_url text,
  -- 2차 지표: 이미지 결과 만족도 (프롬프트 자체 만족도는 prompts.self_rating)
  satisfaction smallint check (satisfaction is null or (satisfaction between 1 and 5)),
  is_final_pick boolean not null default false,
  iteration_count_cumulative integer not null default 1 check (iteration_count_cumulative >= 1),
  session_id text not null,
  created_at timestamptz not null default now()
);

-- iteration count 쿼리 최적화 — ENG-5 autoplan
create index pairs_session_idx on pairs (user_id, session_id, created_at);
create index pairs_prompt_idx on pairs (prompt_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS (Row Level Security) 활성화 + 정책
-- 단일 계정 전용이나 Supabase 표준 준수 (미래 멀티유저 확장 대비)
-- ═══════════════════════════════════════════════════════════════════════════

alter table "references" enable row level security;
alter table reference_tokens enable row level security;
alter table tags enable row level security;
alter table prompts enable row level security;
alter table pairs enable row level security;

-- references
create policy "refs_select_own" on "references" for select using (auth.uid() = user_id);
create policy "refs_insert_own" on "references" for insert with check (auth.uid() = user_id);
create policy "refs_update_own" on "references" for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "refs_delete_own" on "references" for delete using (auth.uid() = user_id);

-- reference_tokens
create policy "reftokens_select_own" on reference_tokens for select using (auth.uid() = user_id);
create policy "reftokens_insert_own" on reference_tokens for insert with check (auth.uid() = user_id);
create policy "reftokens_update_own" on reference_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reftokens_delete_own" on reference_tokens for delete using (auth.uid() = user_id);

-- tags
create policy "tags_select_own" on tags for select using (auth.uid() = user_id);
create policy "tags_insert_own" on tags for insert with check (auth.uid() = user_id);
create policy "tags_update_own" on tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tags_delete_own" on tags for delete using (auth.uid() = user_id);

-- prompts
create policy "prompts_select_own" on prompts for select using (auth.uid() = user_id);
create policy "prompts_insert_own" on prompts for insert with check (auth.uid() = user_id);
create policy "prompts_update_own" on prompts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prompts_delete_own" on prompts for delete using (auth.uid() = user_id);

-- pairs
create policy "pairs_select_own" on pairs for select using (auth.uid() = user_id);
create policy "pairs_insert_own" on pairs for insert with check (auth.uid() = user_id);
create policy "pairs_update_own" on pairs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pairs_delete_own" on pairs for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Storage 버킷 RLS 정책
-- 콘솔에서 이미 생성된 references-thumbnails, pair-results (둘 다 private)
-- 업로드 경로 컨벤션: {user_id}/{uuid}.{ext}
-- 이 컨벤션이 RLS 정책의 (storage.foldername(name))[1] = user_id 체크를 통과시킴
-- ═══════════════════════════════════════════════════════════════════════════

-- references-thumbnails 버킷
create policy "ref_thumb_select_own" on storage.objects for select
  using (bucket_id = 'references-thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "ref_thumb_insert_own" on storage.objects for insert
  with check (bucket_id = 'references-thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "ref_thumb_update_own" on storage.objects for update
  using (bucket_id = 'references-thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "ref_thumb_delete_own" on storage.objects for delete
  using (bucket_id = 'references-thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);

-- pair-results 버킷
create policy "pair_res_select_own" on storage.objects for select
  using (bucket_id = 'pair-results' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "pair_res_insert_own" on storage.objects for insert
  with check (bucket_id = 'pair-results' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "pair_res_update_own" on storage.objects for update
  using (bucket_id = 'pair-results' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "pair_res_delete_own" on storage.objects for delete
  using (bucket_id = 'pair-results' and auth.uid()::text = (storage.foldername(name))[1]);


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. 유용한 주석
-- ═══════════════════════════════════════════════════════════════════════════

comment on table "references" is 'Prompt Studio v0.5 레퍼런스 원본 (URL 또는 업로드 이미지). thumbnail_url은 Supabase Storage path, 렌더링 시 createSignedUrl(path, 3600)로 1시간 TTL signed URL 발급';

comment on table reference_tokens is 'Claude Code CLI 응답 또는 수동 입력 6차원 토큰. is_active=true 레코드 1개만 검색 대상. source=''claude-code''|''manual''';

comment on table prompts is '프롬프트 스니펫. tool·language·self_rating 3필드가 B 재설계(2026-04-24) 핵심. self_rating은 프롬프트 자체 만족도(1차 지표)';

comment on table pairs is '프롬프트-결과 페어 로그. satisfaction은 이미지 결과 만족도(2차 지표). iteration_count_cumulative는 session 내 누적 카운트';

comment on column prompts.self_rating is '프롬프트 자체 만족도 (1-5, null 허용). "이 프롬프트가 머릿속 의도를 얼마나 담았나". Phase 3 T1-T3 실측의 1차 성공 지표';
comment on column pairs.satisfaction is '이미지 결과 만족도 (1-5, null 허용). 프롬프트가 좋았는데 모델이 못 뽑은 경우를 self_rating과 분리해 식별';
comment on column reference_tokens.source is 'claude-code=Claude Code CLI 응답 paste, manual=수동 6필드 입력';


-- 주의: 이 마이그레이션은 roll-forward only. 롤백 시 drop & recreate 필요 (solo 운영 수용)
