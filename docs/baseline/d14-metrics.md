# Task 021 — D14 48h 반응 데이터 + 도구 사용 기록

> **D13 영상 출시** 시점부터 **+48h** 시점에 영상 반응(IG 도달·저장·DM·팔로워) + Prompt Studio 사용 로그를 한 번에 캡처.
> 영상 미출시 상태에서도 도구 사용 기록은 누적 가능 — 영상 트랙은 안나 결정 시점에 갱신.

---

## D-1 베이스라인 스냅샷 (2026-04-26 04:50 KST · 영상 출시 직전 시점)

Task 020 완료 직후, 자동 분석 라우틴 round #6 직후, 잔여 큐 32건 시점.

### Prompt Studio 누적 자산

| 항목 | 값 |
|---|---|
| references (총 카드) | **274** |
| reference_tokens (active) | **242** (auto-claude-code 211 / manual 31) |
| 분석 대기 큐 | 32건 (다음 라우틴에서 자연 소진) |
| tags | 4종 |
| prompts (스니펫 + 페어 프롬프트) | 39 |
| pairs (페어 로그) | 24 |
| max iteration_count_cumulative | 3 |

### 1차 지표 — `prompts.self_rating` 평균

- **현재 4.44 / 5** (`SELECT AVG(self_rating)`)
- T0 대비 uplift는 PRD §11 의도. T0 베이스라인 스킵 결정(2026-04-25 메모리 `project_t0_baseline_skip.md`)으로 정량 비교 불가 → **D14 시점 self_rating 평균 + tool별 분포가 절대 지표**.

### 도구별 prompt 분포 (실사용 가설 검증)

| tool | language | count | 가설 대비 |
|---|---|---|---|
| nano-banana | ko | **19** | NBP 주력 + 한국어 ✓ (1순위) |
| midjourney | en | 12 | MJ 추상·영어 ✓ (3순위인데 자주 사용) |
| nano-banana | en | 4 | NBP override |
| higgsfield | en | 4 | Higgsfield 영상·영어 ✓ (2순위) |

**관찰**:
- NBP-ko 19건 = 실사용 1순위 가설 정량 확인
- Higgsfield(영상) 4건 = 영상 작업 비중 측정 시점 이전이라 적음. 영상 출시 후 증가 예상
- MJ-en 12건 = 추상 워크 또는 도구 친숙도

### 자동 분석 라우틴 운영 통계

| 라운드 | 처리 | 비고 |
|---|---|---|
| #0 (시연) | 5 | 2026-04-25 23:55 |
| #1 | 30 | 2026-04-26 01:06, 동일 stock 30건 |
| #2 | 30 | 2026-04-26 18:33, 다양 30건 (테스트 데이터) |
| #3 | 30 | 2026-04-26 01:56, 동일 stock 30건 |
| #4 | 30 | 2026-04-26 12:03, 동일 stock 30건 (lexicon 도입) |
| #5 | 30 | 2026-04-26 18:33, 안나 큐레이션 30건 (Pinterest 다양체) |
| #6 | 30 | 2026-04-26 03:12, 11그룹 (다양 + 동일 dedup) |
| 인스타 1건 | 1 | 2026-04-26 04:40 (Task 020 검증, 한국 패션 에디토리얼 그룹샷) |
| **합계** | **186** | 운영비 0원 (Claude Code MAX 자원만) |

자동 분석 품질 평가: 라운드 #6 시점 lexicon anchor + specific 디테일 + 시네마토그래피 모션·각도·렌즈·DOF 일관 적용. `mysterious enigmatic` fallback 자제(2/10), motion 6+종 다양화. 도메인 라벨(`modern korean editorial`, `K-beauty editorial`, `quiet luxury`) 정확 발동.

---

## D14 (영상 출시 +48h) — 안나가 채울 양식

> 영상 출시 시점에 본 섹션을 갱신. 출시 안 한 경우 "도구 사용만" 갱신.

### 영상 반응 (IG 인사이트)

| 지표 | D13 출시 직후 | D14 (+48h) | 변동 |
|---|---|---|---|
| 도달 (Reach) | | | |
| 저장 (Saves) | | | |
| DM 수신 | | | |
| 팔로워 변화 | | | |
| 댓글 수 | | | |

### Prompt Studio 누적 자산 (D-1 → D14 변동)

| 항목 | D-1 (2026-04-26) | D14 | 변동 |
|---|---|---|---|
| references | 274 | | |
| reference_tokens active | 242 | | |
| pairs | 24 | | |
| prompts | 39 | | |
| avg self_rating | 4.44 | | |
| max iteration | 3 | | |

### 도구별 변동

| tool/language | D-1 | D14 | 변동 |
|---|---|---|---|
| NBP-ko | 19 | | |
| MJ-en | 12 | | |
| NBP-en | 4 | | |
| Higgsfield-en | 4 | | |

### 정성 메모

- 영상 → 사이트/IG 트래픽 비중:
- 도구별 재방문 빈도:
- 안나 페인 포인트 (자동 분석 vs 수동 paste 비율):
- F006 리믹스 본 기능 ROI 평가 (Task 028 착수 여부 결정):

---

## 갱신 절차

1. D13 영상 출시 시각을 `최종 갱신` 라인에 기록
2. +48h 시점에 위 양식 모든 셀 채움 (안나 IG 인사이트 + 위 SQL 재실행)
3. SQL 재실행: `docs/ops.md` §5 또는 아래

```sql
-- D14 measurement re-run
SELECT
  (SELECT COUNT(*) FROM public.references WHERE user_id = '<UID>') AS references_total,
  (SELECT COUNT(*) FROM public.reference_tokens WHERE user_id = '<UID>' AND is_active) AS tokens_active,
  (SELECT COUNT(*) FROM public.prompts WHERE user_id = '<UID>') AS prompts_total,
  (SELECT COUNT(*) FROM public.pairs WHERE user_id = '<UID>') AS pairs_total,
  (SELECT ROUND(AVG(self_rating)::numeric, 2) FROM public.prompts WHERE user_id = '<UID>' AND self_rating IS NOT NULL) AS avg_self_rating;

SELECT tool, language, COUNT(*) FROM public.prompts WHERE user_id = '<UID>' GROUP BY tool, language ORDER BY 3 DESC;
```

---

**최종 갱신**: 2026-04-26 04:50 KST · D-1 베이스라인 스냅샷. D13 영상 출시 후 갱신 예정.
