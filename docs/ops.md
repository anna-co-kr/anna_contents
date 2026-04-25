# Prompt Studio v0.5 — 운영 관측성 1p

> **목적**: D13 배포 후 안나가 "왜 이게 안 돼?"를 1분 안에 진단할 수 있도록 로그·쿼리 경로를 한 페이지에 정리. **OBS-1 CEO 리뷰 반영**.
> **B 재설계 전제**: Anthropic·Voyage API 미사용 → Vision/embedding 실패 항목 없음. 외부 의존성은 Supabase뿐.

---

## 1. 로그 접근 경로 (북마크 권장)

### Vercel Function Logs (Server Actions · API Route)
- 대시보드: https://vercel.com/anna-co-kr/anna_contents/logs
- 필터: `Function` 탭 → `app/(app)/library/actions` 또는 `app/(app)/pairs/actions` 검색
- 보존: Hobby 플랜 1시간 (D13 직후 1주는 매일 1회 점검 권장)
- 빌드 로그: 같은 프로젝트 → `Deployments` → 해당 deployment → `Logs`

### Supabase Project Logs
프로젝트: https://supabase.com/dashboard/project/nkdqaknfdnriywhynxop

| 탭 | 용도 |
|---|---|
| **Logs → Postgres** | 쿼리 실패, RLS 거부, constraint 위반, deadlock |
| **Logs → Auth** | 로그인 실패, 세션 갱신 오류, 토큰 만료 |
| **Logs → Storage** | thumbnail/pair-results 업로드 실패, signed URL 발급 거부 |
| **Logs → Realtime** | (V1.5 이후 사용 시) |
| **Database → Tables** | references / reference_tokens / tags / prompts / pairs row 직접 조회 |

### 로컬 개발 로그
- dev 서버: `npm run dev` → 터미널 출력 (Server Action 에러는 Next.js dev overlay에도 노출)
- Slack `#claude-code` 채널: `.claude/hooks/{notification,stop}-hook.sh` 알림 (`SLACK_WEBHOOK_URL` 필요)

---

## 2. Claude Code paste 응답 Zod 거부 디버깅 (B 재설계 핵심)

증상: 안나가 Claude Code 응답을 paste 폼에 붙여넣었는데 "검증 실패"가 뜬다.

진단 순서:
1. 브라우저 콘솔 → Server Action 응답 메시지에 `입력 검증 실패 [tokens.<key>]: <msg>` 형식이 있는지 확인 (`lib/schemas/tokens.ts`의 6 키 + 빈 문자열 거부)
2. paste 원문이 ```json 코드펜스로 감싸여 있는지 확인 — `lib/claude-code/paste-parser.ts`가 stripping
3. 6 키 중 누락 또는 빈 문자열이 있는지 확인 (`subject` / `style` / `lighting` / `composition` / `medium` / `mood`, 영어 고정)
4. 폴백: paste 폼 옆의 **수동 6필드 입력 Dialog** 사용 → `source='manual'` 저장

vitest 단위 테스트가 구조 보장의 1차 방어선:
```bash
npx vitest run lib/schemas/tokens.test.ts lib/schemas/prompt.test.ts
```

---

## 3. Supabase RLS 거부 로그 찾는 법

증상: 401/403, 또는 "권한이 없습니다" 메시지.

1. Supabase Dashboard → Logs → Postgres → 검색창에 `permission denied for table` 또는 `RLS policy violation`
2. 직전 30분 필터 + 본인 user_id로 좁히기
3. 흔한 원인:
   - `proxy.ts`(미들웨어)가 세션 쿠키 갱신 실패 — `supabase.auth.getClaims()` 호출 사이에 다른 코드 끼어든 경우
   - Storage 경로 첫 세그먼트가 `user_id`가 아닌 경우 (RLS 정책 `(storage.foldername(name))[1] = auth.uid()` 위반)
   - Server Action에서 `createClient()`를 모듈 스코프 캐싱한 경우 (Fluid Compute 환경에서 세션 꼬임)

---

## 4. 흔한 에러 3종 체크리스트

### 에러 A — "로그인이 필요합니다"
- `supabase.auth.getClaims()`가 null 반환 → middleware(proxy.ts)가 로그인 페이지로 보내야 정상
- `/login` 페이지가 떴는데 자동으로 다시 로그인 페이지면: 쿠키 차단·sameSite 문제, 시크릿 창에서 재시도

### 에러 B — "이미지 용량이 5MB를 초과합니다" / "리사이즈 실패"
- `lib/image/resize.ts`가 client-side에서 Canvas로 리사이즈 후 < 2MB 목표
- Safari: HEIC 파일은 Canvas 지원 X → JPEG로 사전 변환 필요
- 콘솔에서 `OffscreenCanvas` 미지원 환경이면 fallback path 확인

### 에러 C — "Cache Components" 빌드 실패
- Next.js 16 `cacheComponents: true` 환경에서 `cookies()` / `headers()` / `searchParams` 사용 시 `<Suspense>` 경계 누락
- 해결: 해당 컴포넌트를 `<Suspense fallback=...>`로 감싸기 (`app/page.tsx`, `app/(app)/library/page.tsx` 패턴 참고)

---

## 5. 운영 쿼리 (Supabase SQL Editor에서 실행)

### 페어 세션별 self_rating 평균 (Phase 3 T1·T2·T3 실측 자동 집계)
```sql
select
  pa.session_id,
  count(*) as pair_count,
  round(avg(pr.self_rating)::numeric, 2) as self_rating_avg,
  round(avg(pa.satisfaction)::numeric, 2) as satisfaction_avg,
  count(*) filter (where pa.is_final_pick) as final_pick_count,
  min(pa.created_at) as session_start,
  max(pa.created_at) as session_end
from pairs pa
join prompts pr on pr.id = pa.prompt_id
where pa.user_id = auth.uid()
group by pa.session_id
order by session_start desc;
```

### 도구별 사용 빈도 (NBP > Higgsfield > MJ 가설 검증)
```sql
select tool, language, count(*) as prompt_count
from prompts
where user_id = auth.uid()
group by tool, language
order by prompt_count desc;
```

### 토큰 분석 source 분포 (claude-code vs manual 폴백 비율)
```sql
select source, count(*) as token_count
from reference_tokens
where user_id = auth.uid() and is_active
group by source;
```

---

## 6. 에러 로그 표준 (코드 컨벤션)

- 모든 Server Action은 `{ ok: true, ... } | { ok: false, error: string }` 패턴
- 에러 메시지 prefix: `[<scope>]:` 예) `점수 저장 실패: {db error}`
- 사용자에게 노출되는 한국어 메시지 + `console.error` 추가는 운영 디버깅 시점에 필요한 곳에 한정 (현재 코드는 toast 메시지로 충분)
- `revalidatePath()`는 mutation 성공 직후 호출 — 실패 시 호출 안 함 (UI 일관성 유지)

---

**최종 갱신**: 2026-04-25 · D13 배포 전 마지막 점검 항목으로 사용
