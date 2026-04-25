---
description: 분석 대기 카드를 자동 6차원 분석해 reference_tokens INSERT (cron 12:03/18:33 KST + 수동 호출 둘 다 사용)
---

# /auto-analyze

안나의 라이브러리에서 `is_active=true`인 `reference_tokens`가 없는 카드(즉 "분석 대기" 상태)를 한 번에 최대 30건 처리합니다. 운영비 0원: 안나의 Claude Code MAX 자원이 분석을 담당하고 Supabase MCP가 저장.

## 절차 (이 순서 그대로 실행)

### 1. 분석 대기 카드 조회

`mcp__supabase__execute_sql` 도구 사용. project_id = `nkdqaknfdnriywhynxop`.

```sql
SELECT r.id, r.thumbnail_url, r.source_url, r.notes
FROM public.references r
WHERE r.user_id = '5aeaac31-9793-45fa-b276-d5f71304a530'
  AND NOT EXISTS (
    SELECT 1 FROM public.reference_tokens t
    WHERE t.reference_id = r.id AND t.is_active
  )
  AND r.thumbnail_url IS NOT NULL
ORDER BY r.uploaded_at DESC
LIMIT 30;
```

결과 **0건**이면: 단계 5(로그)로 건너뛰고 "처리 대상 없음" 메시지로 종료.

### 2. batch 처리 (각 카드 직렬 처리 금지 — 시간 폭증)

라운드 #1 vs #2 비교: 같은 30건 동일 이미지에서 round #1은 batch INSERT 1번으로 끝났는데 round #2는 per-card Read·INSERT로 30번 직렬 → 시간 ~10배. **반드시 아래 4단계 batch 워크플로우 그대로 따를 것**.

#### 2a. batch signed URL 발급 + 다운로드 (Bash, 2~3회)

라우틴은 이미 cwd가 anna_contents이므로 `cd` 불필요. **`&&` 결합 금지** (권한 prefix 매칭 깨짐).

```bash
mkdir -p /tmp/anna_analyze
```

```bash
npx tsx scripts/sign-thumbnail.ts "<path1>" "<path2>" ... "<pathN>"
```
N개 path를 한 번에. tsx cold start 1번 → N배 빠름. **출력 N줄(입력 순서)이 signed URL 또는 `ERR:...`**.

다운로드는 단일 Bash 호출로 묶기 (`curl × N 라인` 한 셸 호출):

```bash
curl -sS -o "/tmp/anna_analyze/<refId1>.jpg" "<URL1>"
curl -sS -o "/tmp/anna_analyze/<refId2>.jpg" "<URL2>"
... (N줄)
```

#### 2b. MD5 dedup으로 이미지 그룹화

```bash
md5 /tmp/anna_analyze/*.jpg
```
→ 해시별 refId 그룹화. **같은 해시 = 같은 이미지 = Read 1번**. 다른 해시는 별도 그룹.

#### 2c. 이미지 시각 분석 (Read 도구) — **그룹당 1회**

각 그룹의 첫 카드 `Read /tmp/anna_analyze/<refId>.jpg` → 아래 **6차원 어휘 사전**에서 각 키마다 1~2개 항목 선택. 어휘 사전에 명시되지 않은 표현은 사전 항목에 가까운 보충 단어 1개까지 허용. **즉흥 영어 생성 금지** — 라운드별 어휘 일관성을 위해.

##### 6차원 어휘 사전 (도메인 + 시네마토그래피 lexicon)

안나 도메인 맥락: **에디토리얼 한국 패션·미니멀 · 실물 제품 lifestyle (NBP 주력)·MJ 추상·Higgsfield 영상**.

###### `subject` — 피사체·주체
`editorial portrait`, `editorial fashion model`, `lifestyle subject`, `product hero shot`, `still-life arrangement`, `culinary still-life`, `textile still-life`, `jewelry close-up`, `cosmetics product`, `fashion accessory`, `architectural scene`, `interior vignette`, `environmental portrait`, `candid lifestyle moment`, `street fashion`, `studio model pose`, `flat lay arrangement`, `food editorial`

###### `style` — 시각 DNA (안나 도메인 우선)
**한국·아시아 에디토리얼**: `modern korean editorial`, `seoul minimal aesthetic`, `K-beauty editorial`
**미니멀 계열**: `minimalist scandinavian`, `scandinavian minimal`, `japandi`, `wabi-sabi`, `new nordic`, `quiet luxury`, `discreet luxury`, `brutalist minimal`
**럭셔리·패션**: `editorial fashion still-life`, `editorial fashion campaign`, `high fashion editorial`, `luxury product photography`, `surreal indulgent`, `dark academia`
**lifestyle·문화**: `lifestyle product photography`, `hyper-realistic studio`, `cinematic editorial`, `retro film aesthetic`, `y2k revival`, `cottagecore`, `90s grunge editorial`

###### `lighting` — 빛 방향·질감·색온도
**자연광**: `soft window light` (=north light), `golden hour ambient`, `dusk warm interior`, `harsh midday sun`, `overcast diffuse`, `muted overcast`, `dappled sunlight through foliage`, `blue hour twilight`
**스튜디오**: `three-point studio`, `dramatic single key (chiaroscuro)`, `rim light separation`, `volumetric haze`, `atmospheric backlight`, `silhouette backlight`, `bounced fill`, `gel-colored accent`, `softbox key`, `top-lit overhead`
**무드**: `candlelit warm`, `practical lights`, `high-key bright`, `low-key shadow`, `side-lit dramatic`, `split lighting`, `loop lighting`, `butterfly lighting`

###### `composition` — 구도·프레이밍·카메라 각도·움직임
**shot size** (피사체 크기): `extreme close-up (ECU)`, `close-up`, `medium close-up`, `medium shot`, `medium long shot (cowboy)`, `wide shot`, `extreme wide shot`, `establishing shot`
**angle** (시점): `eye-level`, `low angle (heroic)`, `high angle (vulnerable)`, `dutch angle (editorial edgy)`, `over-the-shoulder`, `POV first-person`, `bird's eye view top-down`, `worm's eye view`
**framing** (프레이밍): `tight medium shot generous negative space`, `centered symmetric`, `rule of thirds off-center`, `layered depth foreground midground background`, `within-frame frame (door/window)`, `leading lines diagonal`, `golden ratio spiral`, `vignette dark edges`
**motion · 영상용** (Higgsfield/Sora 토큰): `dolly in`, `dolly out`, `dolly left`, `dolly right`, `tracking shot`, `crane up`, `crane down`, `handheld documentary`, `steadicam smooth`, `bullet time spin`, `whip pan`, `tilt up`, `tilt down`, `push in`, `pull out`, `through-object reveal`, `FPV drone sweep`, `static locked-off`

###### `medium` — 매체·재질감·렌즈·DOF
**type**: `editorial photography`, `studio still-life`, `35mm film photography`, `medium format crispness (hasselblad/phase one)`, `digital cinema`, `polaroid soft`, `cinematic anamorphic widescreen`, `3D render hyperreal`, `painterly illustration`, `risograph print`
**lens** (초점거리): `wide-angle 24mm`, `standard 35mm`, `standard 50mm portrait`, `short telephoto 85mm compression`, `telephoto 135mm isolation`, `macro 100mm texture detail`, `tilt-shift miniature`, `fish-eye distortion`
**DOF** (피사계 심도): `shallow depth f/1.4 dreamy bokeh`, `shallow depth f/2.8`, `mid depth f/4`, `deep focus f/8`, `extreme deep focus f/16`
**grain·texture**: `fine grain editorial`, `subtle film grain`, `clean digital`, `35mm film texture`, `kodak portra 400 palette`, `cinestill 800T tungsten cast`
**surface** (재질): `polished glossy`, `matte tactile`, `textile soft`, `metal reflective`, `ceramic glazed`, `wood grain natural`, `paper textured`, `silk satin`, `velvet plush`

###### `mood` — 감정·분위기
**고요·내성**: `serene contemplative`, `quiet introspective`, `meditative still`, `melancholic nostalgic`, `dreamy ethereal`
**관능·럭셔리**: `sensual luxurious`, `discreet luxury`, `aspirational lifestyle`, `editorial aspirational`, `intimate vulnerable`
**활력·긍정**: `energetic dynamic`, `playful surreal`, `warm inviting`, `bold confident`, `joyful candid`
**드라마·긴장**: `tense dramatic`, `cinematic dramatic`, `mysterious enigmatic`, `cool detached`, `eerie unsettling`
**상업·코퍼레이트**: `confident corporate`, `clean professional`, `optimistic editorial`

##### 규칙
- 각 값 **비어있지 않은 영어 문자열**, `"..."` / `"TBD"` / `"null"` / `"n/a"` 같은 placeholder 금지 (paste-parser 가드와 동일 정책).
- **각 키 = "lexicon anchor (사전 어휘) + 1~2개 이미지 specific 디테일"** — round #4 교훈 (2026-04-26): lexicon만 쓰면 분류는 가능해지지만 디테일이 사라져 F006 NBP 프롬프트 조합 시 NBP가 무엇을 그릴지 모름. 항상 사전 어휘 1개 + 보이는 그대로의 specific 단어 1~2개를 콤마로 결합. 예시:
  - `subject`: `"editorial portrait — businessman with espresso cup, pocket square accent"` (anchor + specific)
  - `style`: `"lifestyle product photography, editorial menswear, quiet luxury"` (anchor 1 + 보강 2)
  - `mood`: `"warm inviting, confident corporate morning ritual"` (anchor + 컨텍스트)
- **사진 정지 이미지여도 `composition.motion`은 채울 것** — F006 영상 리믹스 시 Higgsfield용 카메라 무브 힌트로 사용. **이미지 종류별로 다른 motion** (round #5 교훈: `slow push in` 일변도 금지):
  - 클로즈업·매크로 디테일 → `slow push in`
  - 패션 모델·인물 워킹 → `tracking shot` 또는 `dolly left/right`
  - 정물·플레이트 → `static locked-off` 또는 `slow top-down rotate`
  - 와이드 풍경·인테리어 → `slow pan` 또는 `crane up`
  - 럭셔리 제품 hero → `bullet time spin` 또는 `dolly in`
  - 텐션 드라마 → `whip pan` 또는 `dutch angle handheld`
- **mood `mysterious enigmatic` fallback 금지** — round #5 교훈: 7건 중 5건이 `mysterious enigmatic` 사용해 일변도. 진짜 enigmatic·dramatic 이미지에만 사용. 그 외엔 `confident corporate`/`warm inviting`/`serene contemplative`/`playful surreal`/`aspirational lifestyle` 같은 정확한 매칭 골라.
- **lens·DOF는 추정**해도 됨 — 보이는 bokeh·심도로부터 역산 (배경 흐림 강 → f/1.4~2.8, 모두 선명 → f/8+).
- 이미지 내 텍스트·워터마크는 무시하고 시각 속성만 분석.
- 아무리 모호한 이미지여도 6 키 모두 채움. 사전에 정확히 매칭 안 되면 가장 가까운 항목 선택.

#### 2d. 그룹별 batch INSERT (mcp__supabase__execute_sql, 그룹 수만큼)

각 그룹의 모든 refId를 한 SQL 호출로 다중 row INSERT:

```sql
INSERT INTO public.reference_tokens (user_id, reference_id, tokens, source, is_active)
VALUES
  ('5aeaac31-9793-45fa-b276-d5f71304a530', '<refId1>', jsonb_build_object('subject','<v>','style','<v>','lighting','<v>','composition','<v>','medium','<v>','mood','<v>'), 'claude-code', true),
  ('5aeaac31-9793-45fa-b276-d5f71304a530', '<refId2>', jsonb_build_object('subject','<v>','style','<v>','lighting','<v>','composition','<v>','medium','<v>','mood','<v>'), 'claude-code', true),
  ...
RETURNING id;
```

같은 그룹 내 refId는 **동일한 6 토큰 값**. 그룹 N개 → SQL N번. INSERT 실패면 그 그룹만 skip + 사유 기록 (다음 cron 때 재시도).

> **시간 목표**: 30건 처리 5분 이내. 초과 시 절차가 per-card로 흐른 것 — auto-analysis-log.md에 원인 기록 후 다음 라운드 절차 보강.

### 3. 정리

```bash
rm -f /tmp/anna_analyze/*.jpg
```

### 4. 채팅창에 요약 출력

```
🤖 /auto-analyze 결과 (YYYY-MM-DD HH:MM KST)
• 처리 대상: N건 (대기 큐 M건 → 30건 제한)
• 성공: X건 (reference_id 첫 8자: abc12345, ...)
• 실패: Y건 (reference_id + 사유)
• 다음 자동 실행: 12:03 또는 18:33 KST 중 가까운 쪽
```

### 5. 로그 파일 append

`docs/auto-analysis-log.md`에 다음 형식으로 추가 (Edit 도구):

```markdown
## YYYY-MM-DD HH:MM KST · auto round #N
- 처리 N건 (성공 X / 실패 Y)
- 성공 refIds: 3e78519a, 62593eda, ...
- 실패 refIds + 사유: ...
```

## 제약

- **한 번에 최대 30건** (토큰 소비 한도 고려). 더 많은 카드는 다음 cron 자동 처리.
- **이미지가 매우 크거나 손상된 경우** Read 도구가 실패할 수 있음 — skip + 사유 기록.
- **`thumbnail_url`이 NULL인 카드는 무시** (URL 드롭에서 OG 이미지 못 가져온 케이스). 안나가 채팅창에서 이미지 직접 첨부해 수동 처리.
- **paste-parser placeholder 가드**와 동일 정책: 6 키에 "..." / "TBD" / "null" 등 금지.

## 수동 호출

`/auto-analyze`만 입력하면 즉시 처리. 또는 채팅창에 "분석 대기 카드 처리해줘" 같은 자연어로 호출해도 같은 절차 따름.
