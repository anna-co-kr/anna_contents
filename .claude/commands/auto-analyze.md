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

### 2. 각 행을 직렬로 처리

각 row의 `id`(=refId)와 `thumbnail_url`(=storage path)에 대해:

#### 2a. signed URL 발급 + 이미지 다운로드 (Bash)

```bash
mkdir -p /tmp/anna_analyze
cd /Users/anna.han/workspace/anna_archiving/anna_contents
set -a && source .env.local && set +a
URL=$(npx tsx scripts/sign-thumbnail.ts "<storage_path>")
curl -sS -o "/tmp/anna_analyze/<refId>.jpg" "$URL"
```

#### 2b. 이미지 시각 분석

`Read` 도구로 `/tmp/anna_analyze/<refId>.jpg` 열어 시각 검토. 다음 6 키를 **영어 단어·구절**로 채움 (도구 독립적 의미 단위, MJ·NBP·Higgsfield 모두에서 재사용 가능하도록):

- `subject`: 피사체·주체 — 무엇이 찍혔나 (인물·제품·풍경, 핵심 오브젝트)
- `style`: 스타일 DNA — 시각 무드, 장르, 레퍼런스 (예: "editorial fashion still-life", "minimalist scandinavian", "wabi-sabi") · **안나 도메인 맥락 반영**: 에디토리얼 한국 패션·제품·미니멀
- `lighting`: 조명 톤 — 빛 방향·질감·색온도 (예: "soft window light", "dramatic single key", "golden hour ambient")
- `composition`: 구도·프레이밍 — 원근, 여백, 시선 배치 (예: "tight medium shot, generous negative space", "centered close-up symmetric")
- `medium`: 매체·재질감 — 사진/일러스트/3D, 표면 느낌 (예: "editorial photography fine grain", "studio still-life polished surfaces")
- `mood`: 분위기·감정 — 보는 이가 받는 인상 (예: "serene contemplative", "sensual luxurious", "playful surreal")

**규칙**:
- 각 값 비어있지 않은 영어 문자열, "..." / "TBD" / "null" / "n/a" 같은 placeholder 금지 (paste-parser 가드와 동일 정책).
- 이미지 내 텍스트·워터마크는 무시하고 시각 속성만 분석.
- 아무리 모호한 이미지여도 6 키 모두 채움. 모르겠으면 보이는 그대로의 영어 묘사.

#### 2c. INSERT

`mcp__supabase__execute_sql`:

```sql
INSERT INTO public.reference_tokens (user_id, reference_id, tokens, source, is_active)
VALUES (
  '5aeaac31-9793-45fa-b276-d5f71304a530',
  '<refId>',
  jsonb_build_object(
    'subject',     '<영어 값>',
    'style',       '<영어 값>',
    'lighting',    '<영어 값>',
    'composition', '<영어 값>',
    'medium',      '<영어 값>',
    'mood',        '<영어 값>'
  ),
  'claude-code',
  true
)
RETURNING id;
```

INSERT 실패면 다음 row로 진행하고 실패 사유 기록 (다음 cron 때 재시도됨).

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
