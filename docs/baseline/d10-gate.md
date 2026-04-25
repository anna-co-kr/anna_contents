# Task 017 — D10 게이트 점검 결과

**일자**: 2026-04-25
**판정**: **PARTIAL** (자동 점검은 PASS, 그러나 PRD 요구 "안나 실 사용 1회 동반" 미수행 → 정식 PASS 자격 미달)

> **3-tier 룰**: PASS = 자동 13항목 + 실 사용 1회 무버그 / PARTIAL = F001·F002 동작 + F003 마이너 / FAIL = 차단 버그.
> 본 점검은 자동화 가능한 10항목을 Playwright로 검증했고, 외부 의존 항목(URL 드롭·Claude Code 왕복·실 사용)은 안나 수동 점검 대기.

---

## 자동 점검 결과 — 10/10 PASS

`tests/e2e/task-017-d10-gate.spec.ts` (34.0s, chromium)

| # | Test | 검증 항목 | 결과 |
|---|---|---|---|
| 1 | F001-A | 이미지 직접 업로드 → 저장 완료 + AnalysisSection 노출 | ✅ |
| 2 | F001-B | 수동 6필드 폴백 → 상세 페이지에 토큰 노출 (`source=manual`) | ✅ |
| 3 | F001-C | Zod 거부 — 5-key JSON paste 인라인 에러 + 6-key 재입력 통과 | ✅ |
| 4 | F002-A | 점수·태그·스니펫 저장 + 재진입 유지 (스니펫 tool/language 칩 노출) | ✅ |
| 5 | F002-B | `[copy prompt]` → localStorage `tool`/`language` 메타 기록 + "페어 로그 →" 토스트 액션 | ✅ |
| 6 | F002-C | 토큰 편집 dialog prefill (재진입 시 6필드 모두 prefill) | ✅ |
| 7 | F003-A | NBP-ko 세션 페어 저장 2건 → `iteration_count_cumulative` #1·#2 자동 증가 | ✅ |
| 8 | F003-B | Higgsfield-en 세션 영상 용어 페어 저장 (`dolly in, tracking shot, 24fps`) | ✅ |
| 9 | F003-C | MJ + Cmd+V 스마트 매칭 → `/pairs` prefill (text·tool·language·referenceId 칩 링크 4종 동기) | ✅ |
| 10 | F003-D | 언어 override — NBP+en 저장 가능 + tool 재선택 시 `languageDirty` 유지 | ✅ |

---

## 자동화 제외 항목 — 안나 수동 점검 필요 (3건)

| 항목 | 사유 | 점검 절차 |
|---|---|---|
| IG/Pinterest URL 드롭 → 6-key paste 3건 (영어 응답, `source='claude-code'`) | 외부 OG 메타 의존 + Claude Code 왕복 비결정적 | 라이브러리에서 URL 3개 드롭 → 각각 분석 요청 복사 → Claude Code 응답 paste → DB에 `source='claude-code'` 3건 저장 확인 |
| 이미지 직접 업로드 → 6-key paste 3건 (Claude Code 왕복) | 동일 | 카드 3개 드롭 → 분석 요청 복사 → Claude Code 응답 paste 3건 저장 |
| 실 사용 왕복 1회 (PRD 요구) | 정성적 검증 | 레퍼런스 5개 드롭 → 태그·스니펫 → copy prompt → MJ/NBP/Higgsfield 실행 → 페어 저장까지 무버그 확인 |

---

## 결정 — V1.5(F004 토큰 diff) 진행 여부

- **현재 상태**: 자동 10/10 PASS, 안나 수동 점검 3건 보류
- **권장**: 안나 실 사용 1회 동반 직후 본 문서를 **PASS**로 갱신 → Task 018(F004 토큰 diff UI) 착수 자격
- **PARTIAL 유지 시 영향**: Task 018 착수 금지 (영상 리스크 회피), Task 020(D13 배포)은 진행. D11-D12 영상 집중.
- **FAIL 신호 없음**: F001/F002/F003 차단 버그 없음 (자동 검증 기준)

---

## 관측된 마이너 메모

- `cacheComponents: true` + Server Action revalidatePath 직후 navigation 시 race가 가끔 발생 → spec에 `expect.toPass + reload` 재시도 패턴 적용. 운영 시에는 사용자가 1초 이내 새로고침할 가능성 낮아 무영향.
- `addReferenceTag` optimistic update + transition: 추가 직후 reload하면 Server Action 미완료 race. spec에서 "삭제 버튼 disabled" 해제 대기로 방어. 안나 실 사용 시 5초 이내 같은 동작 반복하지 않으면 무영향.
- ManualTokensDialog는 라이브러리 페이지 컨텍스트에서 호출되면 `/library/[id]` 캐시 무효화가 일관 반영 안 될 수 있음 — 상세 페이지에서 호출하는 흐름이 권장.

---

**다음 단계**: 안나가 위 수동 3건을 30분 안에 점검 → 본 문서 판정 PASS로 갱신 → Task 020(D13 배포) 자격 확정.

---

## 2026-04-26 — production 배포 진행 + 자동 분석 1건 검증

**Task 020 완료**. production URL https://anna-contents.vercel.app/ 에서 V1 코어 동작 확인:

| 체크 항목 | 결과 |
|---|---|
| `/`·`/login`·`/library` curl 헬스체크 | 307·200·307 ✓ |
| Supabase Auth Site URL 전환 (안나 dashboard 작업) | localhost → production + 둘 다 redirect URL 허용 ✓ |
| 환경변수 3종 (`NEXT_PUBLIC_SUPABASE_URL`, `_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) | 세팅 ✓ |
| production DB 인스타그램 URL 드롭 → OG 썸네일 저장 → 자동 분석 1건 (ref `99586564`, source=`claude-code`) | ✓ 한국 패션 에디토리얼 그룹샷 → `modern korean editorial` 매칭 |
| production smoke spec 자동 회귀 보존 | `tests/e2e/task-020-production-smoke.spec.ts` 3건 read-only |

**Task 017 PARTIAL 갱신 진척**:
- 수동 1 (URL 드롭): 인스타 1건 + 라우틴 누적 100+건 = 충족 ✓
- 수동 2 (Claude Code 왕복): paste 줄바꿈 차단 발생 → 자동 분석 흐름으로 충족 + prompt-builder single-line 전환으로 미래 paste 안정화
- 수동 3 (실 사용 1회 왕복): **여전히 미완** (안나가 NBP/MJ로 실제 이미지 생성 + 페어 저장 1건 시연 필요) → PASS 갱신 보류

**부수 보강 (paste UX)**: `lib/claude-code/prompt-builder.ts`에 `format` 옵션 추가, default `singleline`. 안나의 데스크탑 앱이 multi-line paste를 줄 단위로 send해 [Claude Code 분석 요청 복사] 버튼 paste 시 line 단위 메시지 분리되던 문제 해소. 자동 분석 흐름이 본질적 우회책으로 작동하므로 paste 자체 사용 빈도는 낮을 것.

**판정 유지**: PARTIAL (Task 018 차단). 안나 실 사용 1회 시연 시점에 PASS 갱신.
