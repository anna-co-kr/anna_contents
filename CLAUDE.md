# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 정체성

- 이 레포는 겉은 Supabase Next.js 스타터킷이지만, 실제 만드는 제품은 **Prompt Studio v0.5** — 안나(유일 사용자 anna.han@havea.co.kr) 1인을 위한 **Claude Code CLI 컴패니언 도구**다. 첫 커밋이 "프로젝트 이관"이며, 아직 스타터 보일러플레이트와 기획 문서만 있는 상태다. 애플리케이션 코드는 Task 001 (Next.js 스켈레톤)부터 ROADMAP 순서대로 쌓는다.
- **아키텍처 포지셔닝 (2026-04-24 B 재설계 확정)**: 제품은 **외부 AI API를 호출하지 않는다**. Anthropic API Key·Voyage API Key 불필요, 월 운영비 $0. Claude는 안나가 이미 구독 중인 Claude Code CLI(MAX)를 통해 사용. 제품의 4가지 역할:
  1. URL/이미지 드롭 시 **Claude Code에 붙여넣을 6차원 분석 요청 프롬프트**를 클립보드로 제공 (F001 프론트)
  2. 안나가 Claude Code에서 받은 응답을 제품 paste 폼에 붙여넣으면 **Zod 검증·구조화·저장** (F001 백)
  3. 레퍼런스·페어 로그·태그·프롬프트 스니펫 **축적 관리** (F002/F003)
  4. F006 리믹스는 **클라이언트 템플릿 엔진**으로 Claude Code 요청 문장 조립 → 클립보드 (API 호출 0)
- **안나의 실사용 도구 3종 (빈도: NBP > Higgsfield > MJ, 편집 CapCut은 scope 외)**:
  - **Nano Banana Pro (주력)**: 실물 인접 이미지, 한국어 프롬프트 기본
  - **Higgsfield (2순위)**: 영상 작업 주, 영어 프롬프트 기본 (짧고 명령형, "dolly in/tracking shot" 촬영 용어)
  - **Midjourney (3순위)**: 추상 이미지, 영어 프롬프트 기본
  - **모든 도구에서 en/ko 둘 다 선택 가능** (기본값 연동하되 수동 override 허용 → 6 조합 자유). 안나 자기진단 약점은 "프롬프트 활용능력이 낮아 단순 설명 반복" → 도구의 1차 가치는 **Claude Code에 정확하게 질문하도록 도구별 베스트 프랙티스가 반영된 프롬프트 조립을 대신해주는 것**. Task 000(T0 실측) 스킵 확정으로 1차 성공 지표는 `prompts.self_rating` 평균 uplift, 2차는 시간·이터레이션 감축.
- 기획 단계는 gstack /office-hours + /autoplan 으로 수행됨 (산출물: PRD·ROADMAP·DESIGN 3개 문서). 구현 단계는 일반 Claude Code + /git:commit + /docs:update-roadmap. D10 게이트·D13 배포 시점에 /review·/qa·/ship 사용 여부 재판단.
- **배포 환경** (2026-04-25 Task 008-1 preview 리허설 완료): Production URL `https://anna-contents.vercel.app/` · Vercel 프로젝트 `anna-co-kr/anna_contents`에 GitHub main 브랜치 자동 배포. 환경변수 3종(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)만 Vercel에 세팅. `SLACK_WEBHOOK_URL`, `TEST_EMAIL`, `TEST_PASSWORD`는 로컬 전용. Supabase Auth Site URL은 아직 `http://localhost:3000` 유지(dev 작업 우선) — D13 당일 production URL로 전환 예정. 리허설 상세: `docs/baseline/preview-rehearsal.md`
- **자동 6차원 분석 셋업** (2026-04-25 Task 016-3, 2026-04-26 영구화): 안나가 라이브러리에 URL/이미지 드롭만 하면 분석은 Claude Code(=이 CLI 또는 Routines가 여는 자동 세션)가 담당. 흐름: `references` 테이블에 `reference_tokens`가 없는 카드를 SQL로 조회 → `scripts/sign-thumbnail.ts`로 1h signed URL 발급 → 이미지 다운로드/Read → 6차원 영어 JSON 생성 → Supabase MCP로 INSERT(`source='claude-code'`). **수동 호출**: `/auto-analyze` slash command 또는 자연어("분석 대기 카드 처리해줘"). **자동 호출**: 데스크탑 앱 Claude Code → Routines에 두 개 영구 등록 — `Prompt studio 1203 kst` (매일 12:03 KST), `Prompt studio 1833 kst` (매일 18:33 KST). 둘 다 로컬 루틴 / 폴더 `/Users/anna.han/workspace/anna_archiving/anna_contents` / 브랜치 main / 워크트리 OFF / 권한 "편집 수락". 맥북이 깨어 있어야 fire(컴퓨터 sleep 시 그 회차 skip, 다음 회차에서 같이 처리). 결과는 `docs/auto-analysis-log.md`에 누적. **운영비 0원 유지** (Anthropic·Voyage·Gemini 등 외부 API 호출 없음, 안나의 Claude Code MAX 자원만 사용).

**루트 README.md는 업스트림 스타터 문서이므로 제품 맥락 참고 불가.** 제품 맥락은 아래 문서에서 가져올 것:

- `docs/office.hour/PRD.md` — 기능 명세 (F001~F006, F010), 페이지별 UX, 데이터 모델, 5-state UX 원칙
- `docs/office.hour/ROADMAP.md` — D0~D21 일자별 Task 리스트 (Task 001~024+). Phase 0 선행 → Phase 1 F001·F002 → Phase 2 F003 + D10 게이트 + D13 배포 → Phase 3 실측 + V1.5
- `docs/office.hour/PROMPT_STUDIO_DESIGN.md` — APPROVED 설계 문서 (영상 트랙 source of truth는 §9.4)
- `docs/office.hour/REEL_STUDIO_DESIGN.md` — superseded, 역사적 참고용만
- `docs/REEL_STUDIO_BRIEF.md` — 안나의 페인·감도 DNA·22단계 파이프라인 (제품 동기 이해용)

새로운 Task를 시작할 때는 ROADMAP의 Task ID를 직접 언급하며 진행한다. Task 간 의존성(예: Task 008은 Task 005+007 필요)이 명시돼 있으니 반드시 확인.

## 명령어

```bash
npm run dev          # localhost:3000
npm run build
npm start
npm run lint         # eslint flat config (next/core-web-vitals + next/typescript)
```

테스트 러너는 아직 미설치. Task 005에서 **vitest**를 도입 예정(`npm run test`, `npm run test:watch`). E2E는 Playwright MCP 서버 기반으로 수행(별도 CLI 러너 없음).

## 중요한 아키텍처 포인트

### Next.js 라우팅 미들웨어는 `proxy.ts`다 (`middleware.ts` 아님)
루트에 `/proxy.ts`가 있다. 이건 Next.js 15부터 도입된 `middleware.ts`의 새 파일명이며 현재 Next.js 16에서도 유효하다. 요청마다 `lib/supabase/proxy.ts`의 `updateSession()`이 돌아서 (1) Supabase 쿠키를 리프레시하고 (2) 비로그인 사용자를 `/auth/login`으로 리다이렉트한다. **새 미들웨어 로직을 추가할 때 `middleware.ts` 파일을 만들지 말고 `proxy.ts`를 수정한다.**

### `next.config.ts`의 `cacheComponents: true`
Next.js 15부터 도입된 기능으로 현재 Next.js 16에서 **기본 활성** (빌드 로그에 `Cache Components enabled`로 표시). Server Components 캐싱 동작을 바꾸므로 `Suspense` 경계와 `unstable_cache`를 사용할 때 동작 이해 필요. 이 플래그를 건드리기 전에 현재 페이지들(`app/page.tsx`, `app/protected/page.tsx`)이 `<Suspense>`를 어떻게 쓰고 있는지 확인.

### Supabase 클라이언트 3종류 — 용도별로 골라 쓸 것
- `lib/supabase/client.ts` — 브라우저용 (`"use client"` 컴포넌트)
- `lib/supabase/server.ts` — 서버 컴포넌트·Route Handler·Server Action용 (`next/headers`의 `cookies()` 사용)
- `lib/supabase/proxy.ts` — `proxy.ts` 미들웨어 전용 (request/response 쿠키 동기화)

**절대 전역 변수에 캐싱하지 말 것.** Fluid Compute 환경에서 세션 꼬임 원인. 매 함수 호출마다 `createClient()`로 새 인스턴스 만든다.

**`supabase.auth.getClaims()`와 `createServerClient()` 사이에 다른 코드를 끼우지 말 것.** `proxy.ts`의 주석이 경고하듯, 사용자가 랜덤 로그아웃되는 원인이 됨.

### 환경 변수
`.env.local`의 키는 새 포맷인 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`와 호환). 코드는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 읽는다. Roadmap이 예정한 추가 키: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`. 클라이언트 컴포넌트에서는 `NEXT_PUBLIC_` 접두사 붙은 것만 접근. `package.json` scripts에 추가될 `check:secrets` 가드가 `NEXT_PUBLIC_(ANTHROPIC|SUPABASE_SERVICE|VOYAGE)_API` 패턴을 차단할 예정(Task 001).

### 인증 플로우
- 단일 계정 전용 → 회원가입 UI 없음(사전 생성). `app/auth/sign-up*`는 스타터 잔재로 Task 006에서 정리될 수 있음
- `app/auth/confirm/route.ts`가 이메일 OTP 확인 엔드포인트
- `proxy.ts`는 `/`, `/login`, `/auth/*`만 비로그인 허용

### 패스 별칭
`@/*` → 프로젝트 루트 (tsconfig.json). shadcn `components.json` 별칭은 `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.

## 기술 스택 불변 제약 (`docs/office.hour/PRD.md`·`docs/office.hour/ROADMAP.md` 문서 근거)

이 제약들은 Claude가 임의로 바꾸지 말 것 — 각각 `docs/office.hour/PRD.md` · `docs/office.hour/ROADMAP.md` 문서에 근거 있음:

- **Next.js 16 + 의존성 메이저 버전 pin 원칙**: 현재 Next.js 16.2.4 (Task 001 시점 `"next": "latest"`가 자동으로 16으로 올라갔음 → Task 001 말미에 `"^16.2.4"` pin 조치). **메이저 버전 업그레이드는 breaking change 리스크로 계획된 별도 Task에서만 수행.** Task 001 교훈: `"latest"` 또는 semver 미고정된 의존성(`@supabase/ssr`, `@supabase/supabase-js` 등)은 향후 점진적으로 pin 전환 고려. 의존성 추가 시 `^X.Y.Z` 포맷(major 고정, minor/patch 허용)을 기본으로 한다.
- **Tailwind v3.4 고정 (v4로 마이그레이션 금지)**: Supabase Next.js 공식 스타터킷이 v3 기반으로 구성돼 있음(`tailwindcss ^3.4.1` + `tailwind.config.ts` + `@tailwind base/components/utilities` + `hsl(var(--*))` 포맷). shadcn/ui `components.json`은 v4 포맷 필드(`config: ""`)가 있지만 `cssVariables: true` + v3 호환 설정으로 현상태에서 정상 동작. v4 전환은 globals.css 재작성·config 삭제·tailwindcss-animate 대체 등 대규모 변경으로 "오류 없음" 목표에 반함.
- **Supabase 환경변수 키 이름**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (신규 키 이름, legacy `ANON_KEY`와 호환). `lib/supabase/{client,server,proxy}.ts` 3개 파일 모두 `PUBLISHABLE_KEY`를 참조하므로 **절대 `ANON_KEY`로 되돌리지 말 것**. 추가 예정 키: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`.
- **`cacheComponents: true` 유지 + Suspense 경계 의무**: `next.config.ts` 기본값 유지(Supabase 공식 스타터 설정). 새 페이지에서 `cookies()`/`headers()`/`searchParams`/`params` 같은 dynamic API 사용 시 반드시 `<Suspense>` 경계로 감쌀 것. `app/page.tsx` 기존 Suspense 패턴 참고. 이 규칙 위반 시 빌드·런타임 오류 발생.
- **6차원 토큰 스키마 엄격 고정**: `subject` / `style` / `lighting` / `composition` / `medium` / `mood` (영어 고정). **Zod `tokenSchema.parse()`가 유일한 방어선** — Claude Code CLI 응답을 paste 폼으로 받으므로 외부 API의 `tool_use`/JSON mode 구조 강제가 없음. 따라서 Zod는 `.strict()` + 빈 문자열 거부 + 6-key required를 엄격하게 설정. `lib/claude-code/paste-parser.ts`가 ```json 코드펜스 stripping 후 parse.
- **prompts 테이블 3필드 고정** (2026-04-24 실사용 반영): `tool prompt_tool NOT NULL` (enum: midjourney/nano-banana/**higgsfield**, migration 0003에서 확장됨), `language prompt_language NOT NULL` (enum: en/ko), `self_rating smallint CHECK(1-5)` (1차 성공 지표 — 프롬프트 자체 만족도). 이미지·영상 결과 만족도는 `pairs.satisfaction`으로 분리 측정. **6 조합 (tool × language) 전부 UI·Zod 레벨에서 지원**. 기본값 연동(MJ→en, NBP→ko, Higgsfield→en)은 UI default, Zod는 모든 조합 허용.
- **reference_tokens.source 필드**: `text NOT NULL DEFAULT 'claude-code' CHECK (source IN ('claude-code','manual'))` — Claude Code 응답 paste인지 수동 6필드 입력인지 구분. 이전 `vision_model_version` 필드 폐기·교체.
- **외부 AI API 미사용** (2026-04-24 B 재설계): Anthropic API·Voyage API 모두 호출하지 않음. `ANTHROPIC_API_KEY`·`VOYAGE_API_KEY` 환경변수 불필요. `vision_usage` counter 테이블 없음. `reference_tokens.embedding` 컬럼 없음. pgvector extension 미활성. 이 원칙 위반 시 월 운영비 발생하므로 PR 리뷰에서 차단.
- **Claude Code 컴패니언 모델 구현 지점**: (1) `lib/claude-code/prompt-builder.ts` — 6차원 분석 요청 조립, (2) `lib/claude-code/paste-parser.ts` — 응답 JSON 추출·Zod 검증, (3) `lib/remix/template-engine.ts` — 리믹스 요청 템플릿. 셋 다 **클라이언트·서버 공용 pure function**, 외부 네트워크 호출 없음.
- **`tag_kind` enum 4종**: `category` / `mood` / `color` / `purpose` (PRD가 source of truth).
- **Supabase Storage 버킷 2개 모두 private**: `references-thumbnails`, `pair-results`. 렌더링 시 `createSignedUrl(path, 3600)`로 1시간 TTL signed URL 발급. Public URL 사용 금지 (ENG-15).
- **ROADMAP의 하드 데드라인**: D10은 F001·F002·F003 게이트 (PASS/PARTIAL/FAIL 3-tier 판정), D13은 배포. D10이 PARTIAL/FAIL이면 Task 018(V1.5) 착수 금지 → 영상 트랙으로 스위치(Task 019).

## `.claude/` 디렉터리

### 서브에이전트 (`.claude/agents/`)
- `dev/`: `code-reviewer`, `development-planner` (ROADMAP 유지보수), `nextjs-app-developer`, `starter-cleaner` (스타터킷 정리용 — 초기 Task에서 사용 예상), `ui-markup-specialist`
- `docs/`: `prd-generator`, `prd-validator`
- 루트: `nextjs-supabase-expert` (Next.js + Supabase 전반 가이드), `notion-api-database-expert`

### 슬래시 커맨드 (`.claude/commands/`)
- `/git:commit` — **이모지 + 컨벤셔널 커밋**. 커밋에 Claude 서명 절대 추가 금지(명령어 파일 명시). 한국어 본문, 이모지 맵은 `.claude/commands/git/commit.md` 참조.
- `/git:pr`, `/git:branch`, `/git:merge` — GitHub CLI 기반 워크플로우
- `/docs:update-roadmap` — ROADMAP.md의 Task 체크박스·Phase 진행률 자동 갱신. ROADMAP 수정 시 이 커맨드 권장.

### 훅 (`.claude/hooks/`)
`notification-hook.sh`와 `stop-hook.sh`는 Slack `#claude-code` 채널로 알림을 쏜다. 둘 다 `.env.local`의 `SLACK_WEBHOOK_URL`을 요구. 이 값이 비어있으면 훅이 실패로 빠지니 로컬 개발 시 세팅하거나 훅 비활성화.

### MCP 서버 (`.mcp.json`, `.claude/settings.local.json`)
enabled: `supabase`(project ID `nkdqaknfdnriywhynxop` 고정), `playwright`, `context7`, `sequential-thinking`, `shadcn`

## 개발 관례

- **언어**: 이 프로젝트의 모든 문서·커밋 메시지·UI 카피는 한국어. 코드 식별자는 영어. **생성 프롬프트 언어는 도구별 기본값 + 사용자 override 지원**:
  - **F001 6차원 토큰 영어 고정**: 도구 독립적 의미 단위, F006가 도구별 언어로 변환
  - **MJ 기본 en / 옵션 ko**: 추상 이미지 · 대화형 AI로 영어 초안 생성 후 수정이 실사용 패턴
  - **NBP 기본 ko / 옵션 en**: 실물 제품 주력 · 한국어로 배경 빌드업 + 제품 합성
  - **Higgsfield 기본 en / 옵션 ko**: 영상 작업 주 · 공식 권장 영어 · 짧고 명령형 · 촬영 용어 그대로 유지
  - **F006 리믹스**: `(tool, language)` 키로 6 템플릿 중 하나 선택 (MJ-en, MJ-ko, NBP-en, NBP-ko, Higgsfield-en, Higgsfield-ko)
- **커밋**: `/git:commit` 사용. Claude 서명 금지(명령어 파일 명시). `Co-Authored-By` 태그도 이 프로젝트에서는 관례상 붙이지 않음(commit.md 규칙 우선).
- **ROADMAP Task 추적**: 구현 시작 전 해당 Task의 "완료 기준" 전부 확인. Playwright MCP 테스트 체크리스트가 있는 Task는 구현 후 체크 필수. 완료 후 `/docs:update-roadmap` 또는 수동으로 `[x]` 체크.
- **"기능 완성도 ≠ 영상 출시"**: ROADMAP의 크리티컬 패스는 D13 영상 출시. 도구는 레버리지일 뿐. D10 게이트가 PARTIAL/FAIL이면 새 기능 착수 금지.
- **세션 시작 시 자동 브리핑**: 새 세션이 시작되면 먼저 `docs/office.hour/ROADMAP.md`를 읽어 완료된 Task 수·진행 중 Task·다음 착수 Task·Phase 진행률을 1-2문장으로 요약해서 보고할 것. 이후 안나의 지시 대기.
