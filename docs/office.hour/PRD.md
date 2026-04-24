# Prompt Studio v0.5 MVP PRD

## 핵심 정보

**목적**: 안나가 AI 이미지·영상 생성(Nano Banana Pro, Higgsfield, Midjourney) 시 **낮은 프롬프트 활용 능력을 Claude Code CLI가 보좌**하도록 도구가 워크플로우를 정돈한다. 제품은 외부 AI API를 호출하지 않고, 안나의 **Claude Code MAX 구독을 레버리지**해 Claude Code 세션에 붙여넣을 분석·리믹스 요청 프롬프트를 자동 조립하고, 대화 결과를 Zod 검증해 저장한다. **프롬프트 품질 향상 → 원하는 이미지·영상 추출 증가 → 수렴 이터레이션 감소 → 포스트당 2시간 병목 해소**의 3단 인과는 그대로 유지된다.

**사용자**: 안나 1인 (Instagram/YouTube 글로벌 디자인 큐레이터 채널, 단일 Supabase 계정, Claude MAX 구독자)

**아키텍처 포지셔닝 — Claude Code CLI 컴패니언 모델** (2026-04-24 확정):
- 제품은 **AI를 자체 호스팅하지 않는다**. Anthropic API·Voyage API 직접 호출 없음 → 월 $0 운영비
- 제품의 역할: (1) Claude Code에 붙여넣을 **완성된 분석·리믹스 요청 프롬프트** 생성 및 클립보드 제공, (2) 안나가 Claude Code에서 받은 응답을 제품의 paste 폼에 붙여넣으면 Zod로 **검증·구조화·저장**, (3) 레퍼런스·페어·태그·스니펫 축적 관리, (4) MJ/NBP 복붙 헬퍼
- Claude Code는 안나의 기존 툴스택에 이미 존재 → 학습 곡선 없음

**도구 사용 양상 (실사용 기반, 빈도: NBP > Higgsfield > MJ, 편집은 CapCut — 제품 scope 외)**:
- **Nano Banana Pro (주력)**: 실물 인접 이미지 작업. **한국어 프롬프트 기본**. NBP는 확률적 미감이 낮아 기존 이미지로 배경 빌드업 → 실제 제품 합성하는 패턴
- **Higgsfield (2순위)**: 이미지 생성도 지원하나 **영상 작업이 주**. **영어 프롬프트 기본** (공식 문서·모델 권장, 짧고 명령형, "dolly in / slow motion tracking shot" 같은 촬영 용어 중심). 이미지·모션·identity를 분리한 레이어드 프롬프트 방식
- **Midjourney (3순위)**: 추상 이미지. **영어 프롬프트 기본** (대화형 AI로 초안 생성 후 수정 반복). 사실적 제품 추가·미세 수정은 NBP로 보완
- **중요 — 언어 자유**: 모든 도구에서 `tool × language` 6개 조합(MJ·NBP·Higgsfield × en·ko) 중 원하는 걸 UI에서 선택·저장·리믹스 가능. 기본값은 위의 도구별 권장 언어이나 안나가 실험적으로 반대 언어 쓸 수 있도록 override 허용
- **자기진단 약점**: 단순 설명으로 이미지·영상을 마음에 들 때까지 반복 → 시간 소요 큼. 도구의 가장 직접적 가치는 **Claude Code에게 정확하게 질문하도록 프롬프트를 조립해주는 것**

**성공 기준 (2-tier)**:
- **1차 — 프롬프트 품질 uplift (핵심)**: 페어 저장 시 프롬프트 자체 만족도(1~5 self_rating) 평균이 T1~T3에서 T0 추정 대비 상향. F006 리믹스 도입 시 "Claude Code 제안 후보 중 채택한 비율"로 객관화
- **2차 — 시간·이터레이션 감축**: T0 추정치(포스트당 2시간) 대비 체감 시간 -60%, 이터레이션 -50%. Task 000(T0 실측)은 스킵 확정 → 페어 로그 `iteration_count_cumulative`가 유일한 객관 비교 지표
- 측정 절차·단계별 타겟은 `ROADMAP.md` Phase 3 Task 022-024(T1·T2·T3 실측) 참조

---

## 사용자 여정

```
1. 로그인 페이지
   ↓ Supabase Auth 인증 성공 (단일 계정)

2. 레퍼런스 라이브러리 페이지 (메인 허브)
   ↓ 진입 후 선택

   [URL/이미지 드롭] → 제품이 "6차원 분석 요청 프롬프트"를 클립보드에 복사
                    → (외부 툴) 안나가 Claude Code CLI에 이미지+프롬프트 붙여넣어 분석 요청
                    → 안나가 Claude Code 응답(6-key JSON)을 제품 paste 폼에 붙여넣음
                    → 제품이 Zod 검증 → reference_tokens 저장
                    → (폴백) 수동 6필드 입력도 지원
                       ↓
                    [좋아요 점수·태그·프롬프트 스니펫 입력]
                       - 스니펫은 tool(midjourney|nano-banana|higgsfield) + language(en|ko) 메타 포함
                       - 6개 조합 중 UI 토글로 자유 선택 (기본값 연동: MJ→en, NBP→ko, Higgsfield→en)
                       ↓
                    [copy prompt] 버튼 → 클립보드 → 선택한 도구(MJ·NBP·Higgsfield)에 붙여넣기

   [레퍼런스 카드 클릭] → 레퍼런스 상세 페이지

3. 레퍼런스 상세 페이지
   ↓ 프롬프트 스니펫 확인 (도구·언어별 필터링) + 토큰 수동 편집 가능

4. 프롬프트 페어 로그 페이지
   ↓ MJ · NBP · Higgsfield에서 실행한 프롬프트 + 결과 이미지/영상 프레임 pair 저장
   ↓ 도구·언어 구분 (tool 토글 3종 + language 토글 2종, 총 6 조합 자유 선택)

   [프롬프트 자체 만족도 1~5 입력] → 프롬프트 품질 uplift 지표 축적
   [이미지 결과 만족도 1~5 입력] → 이미지 품질 평가
   [만족 결과 마킹] → 성공 페어로 기록
   [페어 목록 클릭] → 토큰 diff 뷰 (V1.5)

5. 토큰 diff 페이지 (V1.5)
   ↓ 성공/실패 프롬프트 텍스트 diff 시각화 (추가/제거 단어 하이라이트, 동일 언어 내 비교)

6. 유사 레퍼런스 검색 페이지 (V1.5)
   ↓ 태그 다중 필터 + 프롬프트 텍스트 ILIKE 검색 (외부 임베딩 API 없이)

7. 리믹스 요청 프롬프트 생성 페이지 (V1.5)
   ↓ 기준 레퍼런스 + tool 선택(MJ·NBP·Higgsfield) + language 선택(en·ko) + 새 주제
      → 제품이 6 조합 템플릿 중 하나로 "완성된 요청 문장" 생성 (Higgsfield는 짧은 명령형·촬영 용어)
      (클라이언트 템플릿 엔진, API 호출 0)
   → (외부 툴) 안나가 Claude Code에서 후보 3개 받아 마음에 드는 것 복사
   → 4번(프롬프트 페어 로그 페이지)에서 붙여넣어 저장 (source='remix')
```

---

## 기능 명세

### 1. V1 코어 기능 (D13 출시 필수)

| ID | 기능명 | 설명 | MVP 필수 이유 | 관련 페이지 |
|----|--------|------|--------------|------------|
| **F001** | URL/이미지 드롭 + Claude Code 분석 연동 | IG/Pinterest/YouTube/Are.na URL 또는 이미지 파일을 드롭하면 제품이 **Claude Code CLI에 붙여넣을 6차원 분석 요청 프롬프트를 클립보드에 복사**. 안나가 Claude Code에서 이미지+프롬프트로 분석 후 6-key JSON 응답(subject/style/lighting/composition/medium/mood, **영어 고정**)을 제품의 paste 폼에 붙여넣으면 **Zod 검증 → reference_tokens 저장**. 수동 6필드 입력 폴백도 지원 | "이 레퍼런스 같은 결과를 **MJ·NBP·Higgsfield에서** 어떻게 뽑는가"의 역공학 반복이 2시간 병목의 근원. Claude Code가 언어 번역 gap을 메우되 **제품이 분석 요청을 정확하게 조립**해주는 것이 핵심 레버리지. 외부 API 직접 호출 없음 → 과금 0 | 레퍼런스 라이브러리 페이지 |
| **F002** | 좋아요·태그·프롬프트 스니펫 필드 | 레퍼런스에 1~10 점수, 수동 태그(카테고리/무드/색감/용도), 프롬프트 스니펫 저장 및 [copy prompt] 버튼으로 클립보드 복사. 스니펫 저장 시 **tool(midjourney\|nano-banana\|higgsfield)·language(en\|ko)** 메타 필수. **6 조합 전부 UI에서 선택·저장 가능** (기본값 연동: MJ→en, NBP→ko, Higgsfield→en, 수동 override 허용) | 취향 데이터 축적 없이는 반복 실험이 의미 없음. copy prompt → **선택한 도구(MJ·NBP·Higgsfield) 붙여넣기**가 실질 워크플로우 단축 핵심. 도구·언어 메타가 있어야 F005 필터·F006 리믹스에서 조합별 일관성 보장 | 레퍼런스 라이브러리 페이지, 레퍼런스 상세 페이지 |
| **F003** | 프롬프트 페어 로그 | **MJ·NBP·Higgsfield**에서 실행한 프롬프트 문구 + 결과 이미지/영상 프레임을 pair로 저장. "프롬프트 자체 만족도 1~5"(`self_rating`, 1차 성공 지표) + "이미지 결과 만족도 1~5"(`satisfaction`) 분리 입력. `is_final_pick` 최종 채택 마킹. 한 프롬프트에 여러 결과 파일(MJ variations · NBP 합성 iteration · Higgsfield 영상 세그먼트 또는 썸네일) 연결 | 반복 이터레이션 기록 없이는 무엇이 효과 있었는지 추적 불가. **프롬프트 품질(self_rating)과 결과 품질(satisfaction)을 분리 측정**해야 "프롬프트가 좋았는데 모델이 못 뽑았다" vs "프롬프트가 애초에 부족했다" 구분 가능 | 프롬프트 페어 로그 페이지 |

### 2. V1 필수 지원 기능

| ID | 기능명 | 설명 | MVP 필수 이유 | 관련 페이지 |
|----|--------|------|--------------|------------|
| **F010** | 기본 인증 | Supabase Auth 이메일 로그인/로그아웃. 단일 계정 전용 | 서비스 이용 최소 인증. 단일 사용자이므로 회원가입 플로우 불필요 (계정 사전 생성) | 로그인 페이지 |

### 3. V1.5 기능 (Week 3 추가, non-blocking)

| ID | 기능명 | 설명 | 추가 이유 | 관련 페이지 |
|----|--------|------|----------|------------|
| **F004** | 토큰 diff UI | 성공/실패 프롬프트 텍스트 간 단어 단위 diff 시각화 (jsdiff 등 클라이언트 라이브러리). 시간 순 나열 + 차이 단어 하이라이트(추가 초록·제거 빨강) | "muted 추가하니 결과 확 달라짐" 같은 패턴 추적으로 프롬프트 언어 학습 가속. 외부 API 없이 클라이언트 전용 동작 | 토큰 diff 페이지 |
| **F005** | 태그·키워드 필터 검색 | 태그 다중 필터(카테고리/무드/색감/용도 교집합) + 프롬프트 텍스트 ILIKE 검색 + 6차원 토큰 키워드 매칭. **외부 임베딩 API 없음 — 1인 사용 레퍼런스 수(~100-500건)에서 태그·키워드로 충분**. V1.5에서 pgvector 도입은 레퍼런스 1000건 넘어갈 때 재검토 | 레퍼런스 축적 후 "비슷한 무드였던 게 뭐였지" 재접근 필요. 태그 기반으로 이미 충분한 정확도 달성 가능. 과금·운영 복잡도 제로 유지 | 유사 레퍼런스 검색 페이지 |
| **F006** | 리믹스 요청 프롬프트 생성기 | 저장된 레퍼런스 선택 후 tool(MJ·NBP·Higgsfield) + language(en·ko) 선택 + "이 느낌 × 새 주제" 입력 시 제품이 **6 조합 중 하나의 템플릿으로 Claude Code 요청 문장을 클라이언트 템플릿 엔진으로 조립** → 클립보드 복사. **6 템플릿**: MJ-en(Midjourney syntax + --ar/--style), MJ-ko, NBP-en, NBP-ko("배경·피사체·조명·분위기 명시적 서술"), **Higgsfield-en("short imperative, dolly/tracking/shot 용어, 이미지·모션·identity 레이어 분리")**, Higgsfield-ko. 안나가 Claude Code에서 후보 3개 받아 마음에 드는 것 선택 후 페어 로그에 붙여넣음 (source='remix') | 프롬프트 언어 표현 속도를 Claude Code가 보조. 제품의 가치는 **"매번 같은 요청 템플릿 조립하는 수고"**를 없애고 **도구별 특성(Higgsfield는 촬영 용어, NBP는 한국어 서술)에 맞춘 베스트 프랙티스**를 캡슐화하는 것. **"프롬프트 활용능력이 낮다"는 안나의 1차 pain에 가장 직접 대응**. 외부 API 호출 없이 클라이언트 전용 동작 | 리믹스 요청 프롬프트 생성 페이지 |

### 4. MVP 이후 기능 (명시적 제외)

- 이미지·영상 직접 생성 (생성은 Midjourney·Nano Banana 수동 사용)
- Midjourney API 호출 자동화
- Taste Graph 추천 엔진 (데이터 축적 후 Phase 2)
- 자동 자막 생성 (캡컷 기본 기능 사용)
- 성과 측정 대시보드 (플랫폼 네이티브 인사이트 사용)
- A/B 실험 플랫폼
- 웹서핑 레퍼런스 에이전트 (M5 자동 모니터링)
- Pinterest API 연동
- 훅 생성기·스크립트 공장·투표 UI

---

## 메뉴 구조

```
Prompt Studio v0.5 내비게이션

[상단 헤더 - 로그인 후 상시 노출]
├── 레퍼런스 라이브러리 - F001, F002 (레퍼런스 드롭·태그·스니펫)
├── 프롬프트 페어 로그 - F003 (프롬프트 + 결과 이미지 pair 기록)
├── 토큰 diff - F004 [V1.5] (성공/실패 토큰 차이 시각화)
├── 태그·키워드 검색 - F005 [V1.5] (태그 필터 + ILIKE, 외부 API 없음)
├── 리믹스 요청 생성 - F006 [V1.5] (Claude Code에 붙여넣을 요청 프롬프트 조립)
└── 로그아웃 - F010

[비로그인 상태]
└── 로그인 - F010
```

---

## 페이지별 상세 기능

> **5-state UX 원칙** (DESIGN-3 autoplan 반영 — 모든 페이지에 공통 적용):
> 각 페이지는 **idle / loading / empty / error / success** 5가지 상태 UI를 구현 시 모두 고려해야 한다. 아래 주요 상태를 간단히 명시하고, 구현 시 누락된 상태는 ROADMAP의 해당 Task에서 세부 처리.
>
> | 페이지 | loading | empty | error | partial |
> |---|---|---|---|---|
> | 로그인 | 버튼 스피너 | N/A | 인라인 에러 메시지 | N/A |
> | 레퍼런스 라이브러리 | 업로드·paste 진행 단계 표시 | 온보딩 카드(URL 예시 + "Claude Code 분석 복사→paste 흐름" 안내) | Zod 검증 실패 시 "6-key JSON 형식이 아닙니다" 인라인 에러 + 재시도 | Claude Code 분석 요청 복사 완료 / paste 대기 중 상태 표시 |
> | 레퍼런스 상세 | 상세 skeleton | N/A (진입 전제) | "레퍼런스를 찾을 수 없습니다" | 토큰 편집 중 자동 저장 인디케이터 |
> | 프롬프트 페어 로그 | 페어 저장 중 스피너 | "첫 페어를 저장해보세요" 힌트 + Cmd+V 안내 | 업로드 실패 재시도 버튼 | 일부 이미지만 업로드 성공 시 재시도 |
> | 토큰 diff (V1.5) | diff 계산 중 스피너 (클라이언트) | "비교할 페어 2개를 선택하세요" | N/A | N/A |
> | 태그·키워드 검색 (V1.5) | 검색 중 skeleton | "0 결과. 다른 키워드·태그 시도" | DB 쿼리 오류 시 재시도 | — |
> | 리믹스 요청 생성 (V1.5) | 템플릿 조립 (즉시) | "기준 레퍼런스 선택 안내" | 클립보드 복사 실패 시 textarea 폴백 | N/A (클라이언트 생성이라 부분 실패 없음) |

### 로그인 페이지

> **구현 기능:** `F010` | **인증:** 불필요 (인증 전 유일 접근 가능 페이지)

| 항목 | 내용 |
|------|------|
| **역할** | Supabase Auth 이메일 로그인 진입점. 단일 계정 전용이므로 회원가입 UI 없음 |
| **진입 경로** | 앱 최초 접근 시 자동 리디렉션, 또는 로그아웃 후 자동 이동 |
| **사용자 행동** | 이메일·비밀번호 입력 후 로그인 버튼 클릭 |
| **주요 기능** | - 이메일·비밀번호 입력 폼<br>- Supabase Auth 인증 처리<br>- 인증 실패 시 에러 메시지 표시<br>- **로그인** 버튼 |
| **다음 이동** | 성공 → 레퍼런스 라이브러리 페이지 자동 이동, 실패 → 에러 메시지 인라인 표시 |

---

### 레퍼런스 라이브러리 페이지

> **구현 기능:** `F001`, `F002` | **메뉴 위치:** 헤더 최상단, 앱의 메인 허브

| 항목 | 내용 |
|------|------|
| **역할** | URL/이미지 드롭으로 레퍼런스를 수집하고, Claude Code 분석 요청을 조립·전달·결과 수집하며, 태그·점수·프롬프트 스니펫을 축적하는 메인 작업 공간 |
| **진입 경로** | 로그인 성공 후 자동 이동, 헤더 "레퍼런스 라이브러리" 클릭 |
| **사용자 행동** | URL 붙여넣기 또는 이미지 파일 드래그 드롭 → 제품이 "Claude Code 분석 요청 프롬프트" 자동 조립·클립보드 복사 → 안나가 Claude Code CLI로 이동해 이미지+프롬프트 함께 붙여넣어 분석 요청 → 응답(6-key JSON) 복사 → 제품의 paste 폼에 붙여넣음 → Zod 검증·저장 → 점수/태그/스니펫 입력(tool 3종 · language 2종 메타 지정) → [copy prompt]로 선택 도구(MJ·NBP·Higgsfield)에 붙여넣기 |
| **주요 기능** | - IG/Pinterest/YouTube/Are.na URL 입력 + 이미지 drag-drop 영역<br>- **[Claude Code 분석 요청 복사]** 버튼: 드롭 즉시 제품이 6차원 분석용 system/user 프롬프트 템플릿을 조립해 클립보드로 복사 + "Claude Code에 이미지와 함께 붙여넣으세요" 가이드 표시<br>- **Claude Code 응답 paste 폼**: 6-key JSON 응답 붙여넣기 전용 textarea. Zod `tokenSchema.parse()` 검증 → 통과 시 `reference_tokens` 저장(`source='claude-code'`), 실패 시 인라인 에러 + 재입력<br>- **수동 6필드 입력 폴백**: Claude Code 쓰지 않고 직접 채우기 원할 때(6개 textarea, `source='manual'`)<br>- 레퍼런스 카드 그리드 (썸네일·토큰·점수·태그 요약)<br>- 1~10 점수 입력, 카테고리/무드/색감/용도 태그 추가<br>- 프롬프트 스니펫 텍스트 필드 (여러 버전 저장 가능, 각 스니펫에 **tool(midjourney\|nano-banana\|higgsfield)·language(en\|ko)** 필수 선택 — 6 조합 자유 선택, 기본값 연동 후 override 허용)<br>- **[copy prompt]** 버튼 (클립보드 복사, 스니펫의 tool·language가 헤더 배지로 노출)<br>- 레퍼런스 카드 클릭 시 레퍼런스 상세 페이지 이동 |
| **다음 이동** | 레퍼런스 카드 클릭 → 레퍼런스 상세 페이지, [copy prompt] → 클립보드 복사 완료 토스트 |

---

### 레퍼런스 상세 페이지

> **구현 기능:** `F002` | **메뉴 위치:** 레퍼런스 라이브러리 페이지 카드 클릭으로 진입

| 항목 | 내용 |
|------|------|
| **역할** | 개별 레퍼런스의 토큰 분해 결과, 점수, 태그, 프롬프트 스니펫 전체를 확인하고 편집하는 상세 뷰 |
| **진입 경로** | 레퍼런스 라이브러리 페이지의 레퍼런스 카드 클릭 |
| **사용자 행동** | 토큰 분해 결과 확인·수정, 태그 추가·삭제, 프롬프트 스니펫 편집, [copy prompt] 실행 |
| **주요 기능** | - 원본 이미지/썸네일 전체 크기 표시<br>- 6차원 토큰 값 확인 및 수동 편집<br>- 점수(1~10) 및 태그 편집<br>- 프롬프트 스니펫 목록 (버전별 나열, 추가·삭제)<br>- **[copy prompt]** 버튼 (스니펫별)<br>- 레퍼런스 삭제 |
| **다음 이동** | 뒤로가기 → 레퍼런스 라이브러리 페이지 |

---

### 프롬프트 페어 로그 페이지

> **구현 기능:** `F003` | **메뉴 위치:** 헤더 "프롬프트 페어 로그"

| 항목 | 내용 |
|------|------|
| **역할** | **MJ · NBP · Higgsfield**에서 실제 실행한 프롬프트와 결과 이미지/영상 프레임을 pair로 기록하고, 프롬프트 품질(self_rating)·결과 품질(satisfaction)을 분리 측정해 성공 패턴을 축적하는 페이지 |
| **진입 경로** | 헤더 "프롬프트 페어 로그" 클릭, 또는 레퍼런스 상세 페이지에서 [copy prompt] 후 이동 (Cmd+V 스마트 매칭으로 tool·language 자동 prefill) |
| **사용자 행동** | tool 선택(MJ·NBP·Higgsfield 3-way 토글) + language 선택(en·ko 2-way 토글) → 프롬프트 문구 입력 → 결과 파일 업로드 → 프롬프트 자체 만족도(self_rating) + 결과 만족도(satisfaction) 입력 → pair 저장. 기존 페어 목록에서 만족도·채택 수정 |
| **주요 기능** | - **tool 토글** (Midjourney · Nano Banana Pro · Higgsfield, 세션별 기본값 localStorage 기억)<br>- **language 토글** (en · ko, tool 선택 시 기본값 연동: MJ→en, NBP→ko, Higgsfield→en, 수동 override 가능 — 6 조합 전부 저장 가능)<br>- 프롬프트 텍스트 입력 필드 (tool·language에 맞춰 placeholder 분기 — Higgsfield면 "dolly in, tracking shot 등 영상 용어 사용 권장" 힌트)<br>- 결과 파일 업로드 (drag-drop, 한 프롬프트에 여러 파일 연결 — MJ variations · NBP iteration · Higgsfield 영상 세그먼트/썸네일)<br>- **프롬프트 자체 만족도** (1~5, `self_rating`, "이 프롬프트가 내 머릿속 의도를 얼마나 담았나")<br>- **결과 만족도** (1~5, `satisfaction`)<br>- is_final_pick pinned toggle (최종 채택 여부)<br>- 세션별 이터레이션 누적 카운트 자동 기록<br>- 저장된 페어 목록 (시간 역순, tool 3종 + language 2종 + 최종채택 + 만족도 다중 필터)<br>- **[페어 저장]** 버튼 |
| **다음 이동** | 저장 완료 → 목록 갱신. 페어 클릭 → 토큰 diff 페이지 (V1.5 연결) |

---

### 토큰 diff 페이지 (V1.5)

> **구현 기능:** `F004` | **메뉴 위치:** 헤더 "토큰 diff"

| 항목 | 내용 |
|------|------|
| **역할** | 성공 프롬프트와 실패 프롬프트 간 토큰 차이를 시각화해 "어떤 단어를 추가/제거했을 때 결과가 바뀌었는가"를 추적하는 분석 뷰 |
| **진입 경로** | 헤더 "토큰 diff" 클릭, 또는 프롬프트 페어 로그 페이지에서 페어 클릭 |
| **사용자 행동** | 비교할 프롬프트 2개 선택 → 차이 단어 하이라이트 확인 → 패턴 학습 |
| **주요 기능** | - 시간 순 페어 목록에서 비교 대상 2개 선택<br>- 프롬프트 텍스트 나란히 표시 (추가 단어 초록, 제거 단어 빨강 하이라이트)<br>- 만족/불만족 마킹 여부 표시<br>- **[비교 보기]** 버튼 |
| **다음 이동** | 결과 확인 후 레퍼런스 라이브러리 또는 프롬프트 페어 로그 페이지로 이동 |

---

### 태그·키워드 검색 페이지 (V1.5)

> **구현 기능:** `F005` | **메뉴 위치:** 헤더 "태그·키워드 검색"

| 항목 | 내용 |
|------|------|
| **역할** | 태그 다중 필터 + 프롬프트 텍스트 키워드 검색으로 축적된 레퍼런스 중 유사한 것을 재접근하는 검색 허브. 외부 임베딩 API 없음 |
| **진입 경로** | 헤더 "태그·키워드 검색" 클릭 |
| **사용자 행동** | 키워드 입력 + 태그 다중 선택 → 교집합 결과 확인 → 연결된 성공 프롬프트 확인 → [copy prompt] 실행 |
| **주요 기능** | - **키워드 검색 입력**: 프롬프트 텍스트·6차원 토큰 값·레퍼런스 notes 대상 ILIKE `%keyword%` 매칭<br>- **태그 필터**: 카테고리/무드/색감/용도 다중 선택(교집합), tag_kind별 그룹 노출<br>- **tool·language 필터**: MJ/NBP, en/ko 추가 좁히기<br>- 결과 목록 (썸네일 + 매칭 토큰 하이라이트)<br>- 각 레퍼런스에 연결된 성공 프롬프트 스니펫(self_rating ≥ 4) 표시<br>- **[copy prompt]** 버튼<br>- **스코프 주의**: 레퍼런스 1000건 넘어갈 경우 pgvector 재도입 재검토 |
| **다음 이동** | 레퍼런스 클릭 → 레퍼런스 상세 페이지, [copy prompt] → 클립보드 복사 |

---

### 리믹스 요청 생성 페이지 (V1.5)

> **구현 기능:** `F006` | **메뉴 위치:** 헤더 "리믹스 요청 생성"

| 항목 | 내용 |
|------|------|
| **역할** | 저장된 레퍼런스의 스타일/감도를 새 주제에 적용한 **Claude Code 요청 문장을 클라이언트 템플릿 엔진으로 조립**해 클립보드에 제공. 안나가 Claude Code CLI에서 후보 3개를 받아 페어 로그로 가져가는 창작 보조 페이지 |
| **진입 경로** | 헤더 "리믹스 요청 생성" 클릭, 또는 레퍼런스 상세 페이지의 "리믹스" 버튼 클릭 |
| **사용자 행동** | 기준 레퍼런스 선택 → tool 확인/변경(MJ·NBP·Higgsfield, 기본은 레퍼런스의 최근 프롬프트 tool) → language 확인/변경(en·ko, 기본은 tool 연동) → 새 주제/주요 변경 사항 입력 → 제품이 조립한 요청 문장 확인 → **[Claude Code로 요청 복사]** → 안나가 Claude Code에서 후보 3개 받아 마음에 드는 것 복사 → 페어 로그에 붙여넣기 (source='remix'로 저장) |
| **주요 기능** | - 기준 레퍼런스 선택 (라이브러리에서 검색·선택)<br>- **tool 3-way 토글** (Midjourney · Nano Banana Pro · Higgsfield, 기준 레퍼런스의 최근 성공 프롬프트 tool을 기본값으로 제안)<br>- **language 2-way 토글** (en · ko, tool 선택 시 기본값 연동, 수동 override 가능 → 6 조합 자유)<br>- "이 느낌 × 새 주제" 자연어 입력 필드<br>- **요청 문장 실시간 프리뷰**: 기준 레퍼런스의 6차원 토큰(영어) + 새 주제 + `tool×language` 6 템플릿 중 선택 조합 결과를 실시간 표시<br>  - **MJ-en**: "Generate 3 Midjourney prompts in English based on these dimensions: {tokens}. New subject: {theme}. Use Midjourney syntax (`--ar`, `--style raw`, etc.). Return 3 numbered options."<br>  - **MJ-ko**: "다음 6차원을 토대로 Midjourney 프롬프트 후보 3개를 한국어로 제시: {tokens}. 새 주제: {theme}. 각 후보에 `--ar` 등 MJ 파라미터 영어로 병기."<br>  - **NBP-ko**: "다음 6차원 분석을 토대로 나노바나나 프롬프트 3개를 한국어로 생성해주세요: {tokens}. 새 주제: {theme}. 배경·피사체·조명·분위기를 명시적으로 서술."<br>  - **NBP-en**: "Generate 3 Nano Banana Pro prompts in English based on these dimensions: {tokens}. New subject: {theme}. Describe background, subject, lighting, mood explicitly."<br>  - **Higgsfield-en** (영상 우선): "Generate 3 Higgsfield prompts in English for video/motion generation. Base dimensions: {tokens}. New subject: {theme}. Use short imperative commands. Separate image layout from motion — specify camera move (e.g., dolly in, tracking shot, slow motion), subject action, and verb per beat. Avoid descriptive paragraphs."<br>  - **Higgsfield-ko**: "Higgsfield 프롬프트 3개를 한국어로 생성. 영어 촬영 용어(dolly in, tracking shot, slow motion 등)는 그대로 유지. 6차원: {tokens}. 새 주제: {theme}. 카메라 무브·주체 동작·강한 동사를 각 비트에 명시. 설명적 문단 지양."<br>- **[Claude Code로 요청 복사]** 버튼 (클립보드)<br>- 안나가 페어 로그로 돌아와 붙여넣을 때 `source='remix'` 자동 태깅 |
| **다음 이동** | 복사 후 프롬프트 페어 로그 페이지로 이동 유도 (tool·language·기준 레퍼런스 ID prefill) |

---

## 데이터 모델

### references (레퍼런스 원본)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID |
| source_url | IG/Pinterest/YouTube/Are.na 원본 URL | text |
| thumbnail_url | 썸네일 이미지 URL (스크래핑 또는 업로드) | text |
| favorite_score | 좋아요 점수 (1~10) | int |
| notes | 메모 | text |
| user_id | 사용자 식별자 | → auth.users.id |
| uploaded_at | 등록 일시 | timestamp |

### reference_tokens (6차원 토큰 분석 결과)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID |
| reference_id | 레퍼런스 참조 | → references.id |
| tokens | 6차원 구조화 토큰 JSONB (subject/style/lighting/composition/medium/mood, 영어 고정) | jsonb |
| source | 분석 출처 (`claude-code` / `manual`) — Claude Code CLI 응답 붙여넣기였는지 수동 입력이었는지 구분 | text (또는 enum) |
| is_active | 활성 분석 레코드 여부 (1 reference : N reference_tokens 이력 보존 구조, 재분석 시 이전 레코드 `is_active=false`) | bool DEFAULT true |
| created_at | 생성 일시 | timestamp |

### tags (수동 태그)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID |
| reference_id | 레퍼런스 참조 | → references.id |
| tag | 태그 텍스트 | text |
| tag_kind | 태그 유형 (category/mood/color/purpose) | enum |

### prompts (프롬프트 스니펫)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID |
| reference_id | 연결 레퍼런스 (nullable — pair에서 직접 입력 시) | → references.id |
| prompt_text | 프롬프트 전체 문구 | text |
| tool | 생성 대상 도구 (`midjourney` / `nano-banana`) | enum NOT NULL |
| language | 프롬프트 언어 (`en` / `ko`) — 기본값 tool 연동(MJ→en, NBP→ko)이나 수동 override 허용 | enum NOT NULL |
| self_rating | 프롬프트 자체 만족도 (null/1~5) — "이 프롬프트가 의도를 담았는가", 1차 성공 지표 | int |
| source | 출처 구분 (copied/modified/remix) | enum |
| created_at | 생성 일시 | timestamp |

### pairs (프롬프트 페어 로그)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID |
| prompt_id | 연결 프롬프트 (prompts.tool·language·self_rating 조인으로 확인) | → prompts.id |
| result_image_url | MJ 결과 이미지 또는 NBP 합성 결과 이미지 URL | text |
| satisfaction | 이미지 결과 만족도 (null/1~5) | int |
| is_final_pick | 최종 채택 여부 | bool |
| iteration_count_cumulative | 세션 내 누적 이터레이션 수 | int |
| session_id | 작업 세션 구분자 | text |
| created_at | 생성 일시 | timestamp |

---

## 기술 스택 (최신 버전)

### 프론트엔드 프레임워크

- **Next.js 16** (App Router, Turbopack 기본) — React 풀스택 프레임워크. 서버 컴포넌트로 Vision API 호출 처리. `cacheComponents` 활성 기본
- **TypeScript 5.6+** — 타입 안전성 보장. any 타입 사용 금지
- **React 19** — UI 라이브러리 (최신 동시성 기능 활용)

### 스타일링 & UI

- **TailwindCSS v3.4** (Supabase Next.js 공식 스타터킷 기본 구성, `tailwind.config.ts` + `@tailwind` directives + HSL CSS 변수) — 유틸리티 CSS 프레임워크
- **shadcn/ui** (style: new-york, baseColor: neutral, cssVariables: true) — 고품질 React 컴포넌트 라이브러리 (드래그 드롭, 카드, 배지 등)
- **tailwindcss-animate** — shadcn/ui 애니메이션 플러그인 (스타터킷 기본 포함)
- **Lucide React** — 아이콘 라이브러리

### 폼 & 검증

- **React Hook Form 7.x** — 폼 상태 관리 (프롬프트 스니펫 입력, 태그 입력)
- **Zod** — 스키마 검증 (6차원 토큰 JSONB 구조 검증)

### AI 연동 — 외부 호스팅 없음

- **Claude Code CLI** (안나의 MAX 구독) — 제품 외부 툴. 제품은 Claude Code에 붙여넣을 분석·리믹스 요청 프롬프트를 조립할 뿐이고, 실제 Claude 호출은 안나의 CLI 세션에서 안나가 직접 수행. 응답(6-key JSON 등)은 제품의 paste 폼에 복사 후 Zod 검증으로 구조화
- **외부 AI API 미사용**: Anthropic API Key, Voyage API Key 모두 불필요. 월 운영비 $0 (Supabase/Vercel 무료 티어만 사용)
- **Zod** 검증이 Claude Code 응답의 6-key 스키마 드리프트 방어선

### 백엔드 & 데이터베이스

- **Supabase** — BaaS (Auth 단일 계정, PostgreSQL, Storage). pgvector 확장은 V1.5 현재 미사용(레퍼런스 1000건 초과 시 재검토)
- **PostgreSQL** — 관계형 DB. V1.5 F005는 태그 필터 + ILIKE 검색만 사용

### 배포 & 호스팅

- **Vercel** — Next.js 16 최적화 배포. git push → 자동 preview 배포

### 패키지 관리

- **npm** — 의존성 관리
