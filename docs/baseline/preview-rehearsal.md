# Task 008-1 · Vercel Preview 첫 배포 리허설

> **목적**: D13 영상 출시 **전**에 환경변수·CORS·Supabase Auth redirect URL 실수를 미리 발견 (DEP-1 CEO 리뷰 반영).
> **시점**: D3 말 Task 008 완료 직후 (이번 세션에서 수행). 실제 출시 배포는 D13.
> **원칙**: Anthropic·Voyage API 키 불필요 (B 재설계, 월 운영비 $0). Supabase만 세팅.

---

## 📋 체크리스트 (순서대로)

### 1. GitHub push

- [ ] 현재 브랜치 `main`의 로컬 커밋을 remote로 push
  ```bash
  git push origin main
  ```
- [ ] `https://github.com/anna-co-kr/anna_contents`에서 최신 커밋 확인

### 2. Vercel 프로젝트 생성

- [ ] https://vercel.com/new 에서 `anna-co-kr/anna_contents` 레포 Import
- [ ] Framework Preset: **Next.js** 자동 감지 확인
- [ ] Build Command: 기본값 `next build` 유지 (Vercel이 자동 감지)
- [ ] Output Directory: 기본값 `.next` 유지
- [ ] Node.js Version: **22.x** (Next.js 16 요구사항 — `package.json`의 `engines` 없으므로 Vercel 기본값 확인 필요)
- [ ] **아직 Deploy 버튼 누르지 말 것** — 먼저 환경변수 세팅

### 3. Vercel 환경변수 세팅 (Production + Preview + Development 전부 체크)

| Key | Value 출처 | Sensitive |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | ❌ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → API → Project API keys → `publishable` (레거시 `anon` 대체) | ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API → Project API keys → `service_role` | ✅ **Sensitive 체크 필수** |

**금지 환경변수** (실수 방지용):
- ~~`ANTHROPIC_API_KEY`~~ — B 재설계로 제거됨
- ~~`VOYAGE_API_KEY`~~ — 제거됨
- ~~`SLACK_WEBHOOK_URL`~~ — Claude Code 훅(로컬)만 사용, Vercel 불필요
- ~~`TEST_EMAIL` / `TEST_PASSWORD`~~ — Playwright 로컬 실행 전용

### 4. Supabase Auth Redirect URL 추가

- [ ] https://supabase.com/dashboard/project/nkdqaknfdnriywhynxop/auth/url-configuration
- [ ] **Site URL**: 현재 `http://localhost:3000` 유지 (dev 작업 계속)
- [ ] **Additional Redirect URLs**에 Vercel preview 도메인 추가:
  - `https://anna-contents-*.vercel.app/**` (와일드카드 branch preview 대응)
  - `https://anna-contents.vercel.app/**` (production 프로덕션 도메인)
  - `https://anna-contents-git-main-*.vercel.app/**` (git branch 자동 배포)
  - (실제 할당된 도메인에 맞춰 조정)

### 5. Vercel Deploy 실행

- [ ] "Deploy" 버튼 클릭
- [ ] 빌드 로그에서 `Cache Components enabled` 확인
- [ ] 빌드 성공 후 preview URL 확보 (예: `https://anna-contents-xxxx-anna-co-kr.vercel.app`)

### 6. 스모크 테스트 (preview URL에서 수동)

- [ ] preview URL로 이동 → `/` → middleware가 `/login`으로 리다이렉트 확인
- [ ] `anna.han@havea.co.kr` + 패스워드로 로그인 → `/library` 이동 확인
- [ ] 샘플 이미지 드롭 → "저장 완료" + AnalysisSection 노출 확인
- [ ] "Claude Code 분석 요청 복사" 클릭 → 클립보드 복사 성공 확인
- [ ] 6-key JSON paste 폼에 샘플 JSON 붙여넣기 → "검증 + 저장" → "6차원 토큰이 저장되었습니다" 토스트 노출
- [ ] `/library` 그리드에 방금 드롭한 카드 노출 + 토큰 칩 6개 렌더링 확인
- [ ] 카드 우상단 [🏷] / [✏️] 버튼 동작 확인 (Popover, Dialog)
- [ ] 카드 클릭 → `/library/[id]` 상세 페이지 진입 확인
- [ ] 상세 페이지에서 스니펫 1개 추가 → [copy] 버튼 → 클립보드·토스트 확인
- [ ] 로그아웃 → `/login` 복귀 확인

### 7. 리허설 결과 기록 (2026-04-25 실행)

```
일자: 2026-04-25
preview URL: https://anna-contents.vercel.app
빌드 결과: 성공 (첫 배포)
/login TTFB 측정(외부 curl, edge icn1): 335ms · total 336ms · HTTP 200
middleware 동작: / → 307 /login 정상 (cache-control public max-age=0)

[환경변수]
- 세팅 완료: ✅ (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY)
- 금지 키 미포함 확인: ANTHROPIC_API_KEY / VOYAGE_API_KEY / SLACK_WEBHOOK_URL / TEST_* 모두 Vercel에 없음

[Auth redirect]
- Supabase Auth Additional Redirect URLs에 Vercel 도메인 추가 완료
- 로그인 성공 확인 (안나 리허설 수행)

[빌드 경고]
- 특이사항 없음 (안나 확인)

[기능 스모크]
- Production URL 기본 라우팅: ✅ (curl 검증: / → 307 /login, /login → 200)
- 이미지 드롭 / URL 드롭 / paste 토큰 저장 / 카드 그리드 / 태그 Popover / 점수·스니펫 Dialog / [copy] 클립보드 / 상세 페이지 / cascade 삭제: **ok (안나 리허설 수행, "성공했어" 확인)**
- HTTPS 환경에서 navigator.clipboard 정상 동작 예상 (로컬 localhost에서도 이미 동작 확인됨)

[Next.js 16 주의사항]
- cacheComponents: true — Vercel 빌드 성공 = Partial Prerender 정상 처리됨
- middleware(proxy.ts)가 307로 정상 redirect 응답 (cache-control max-age=0 반환)

[종합]
- D13 배포 가능 여부: ✅ Yes — production URL 확보, 스모크 전 항목 통과, 환경변수·redirect 실수 0건
- 후속 조치:
  - Production 도메인 `anna-contents.vercel.app` 자동 할당 유지 결정 (커스텀 도메인은 필요 시 D13 전에 추가)
  - D13 당일 Supabase Site URL을 `https://anna-contents.vercel.app`으로 변경 (현재는 localhost 유지)
  - Task 017 D10 게이트에서 preview URL을 실측 대상으로 사용
```

---

## 🔁 롤백 시나리오

리허설 실패 시:
- **환경변수 문제**: Vercel Project Settings에서 수정 → Redeploy
- **Supabase redirect 문제**: 대시보드에서 URL 추가 후 로그인 재시도
- **빌드 실패**: 로그 확인 → 로컬 `npm run build`로 재현 → 수정 후 push → 자동 redeploy
- **심각한 런타임 오류**: Vercel "Rollback" 버튼으로 직전 deployment로 복구 (첫 배포라면 해당 없음)

## 🧭 D13 본 배포 전까지 TODO

- [ ] Production 도메인 결정 (현재 `anna-contents.vercel.app` 자동 할당 vs 커스텀)
- [ ] Supabase Site URL을 production URL로 변경 (D13 당일)
- [ ] 첫 배포 이후 성능 체감 측정 (카드 47개+ 목록 조회 signed URL 병렬 발급 TTFB)
