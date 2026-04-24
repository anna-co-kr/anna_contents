# Prompt Studio 디자인 토큰

**최종 수정**: 2026-04-24 (Task 001) · **상태**: 초안 (Task 010 카드 그리드 구현 시 실렌더 검토 후 조정 가능)

Tailwind v3.4 + shadcn/ui(new-york, neutral) + HSL CSS 변수 포맷. 값은 `app/globals.css`의 `:root` 및 `.dark` 블록에 정의되며 `tailwind.config.ts`가 유틸 클래스로 노출한다.

---

## 1. shadcn/ui 기본 (스타터 그대로 유지)

| 토큰 | 용도 | Tailwind 클래스 예시 |
|---|---|---|
| `--background` / `--foreground` | 기본 배경·텍스트 | `bg-background text-foreground` |
| `--card` / `--card-foreground` | 카드 컨테이너 | `bg-card text-card-foreground` |
| `--popover` / `--popover-foreground` | 팝오버·드롭다운 | `bg-popover` |
| `--primary` / `--primary-foreground` | 1차 액션 버튼 | `bg-primary text-primary-foreground` |
| `--secondary` / `--secondary-foreground` | 2차 액션 | `bg-secondary` |
| `--muted` / `--muted-foreground` | 보조 텍스트, 비활성 | `text-muted-foreground` |
| `--accent` / `--accent-foreground` | 호버 강조 | `hover:bg-accent` |
| `--destructive` / `--destructive-foreground` | 삭제·경고 | `bg-destructive` |
| `--border` | 보더 | `border-border` |
| `--input` | 인풋 보더 | `border-input` |
| `--ring` | 포커스 링 | `ring-ring` |
| `--radius` | 기본 radius (0.5rem) | `rounded-lg/md/sm` |

베이스 컬러 `neutral`이므로 전부 채도 0의 그레이스케일. Prompt Studio 특유 색감은 아래 **2. 6차원 토큰**에서 담당.

## 2. 6차원 토큰 semantic color

F001 Vision이 분해하는 6차원(subject/style/lighting/composition/medium/mood)에 각각 hue 하나씩 고정 할당. 레퍼런스 카드의 토큰 칩·인라인 배지·인풋 섹션 헤더에서 어느 차원인지 한눈에 구분할 수 있게 시각 차별화.

| 차원 | 의미 | Light (HSL) | Dark (HSL) | Tailwind 클래스 |
|---|---|---|---|---|
| `--token-subject` | 피사체·포커스 | `20 90% 55%` 🟠 warm orange | `20 85% 65%` | `text-token-subject` `bg-token-subject` `border-token-subject` |
| `--token-style` | 스타일 DNA | `280 70% 60%` 🟣 violet | `280 65% 70%` | `text-token-style` |
| `--token-lighting` | 조명 톤 | `45 95% 60%` 🟡 golden yellow | `45 90% 70%` | `text-token-lighting` |
| `--token-composition` | 구도·프레이밍 | `200 55% 50%` 🔵 steel blue | `200 60% 60%` | `text-token-composition` |
| `--token-medium` | 매체·재질감 | `25 40% 45%` 🟤 warm brown | `25 45% 60%` | `text-token-medium` |
| `--token-mood` | 분위기·감정 | `330 65% 60%` 🩷 magenta pink | `330 70% 70%` | `text-token-mood` |

**원칙**:
- Light/Dark 모두 대비 확보(다크는 명도 +5~10 상향).
- 토큰 간 hue 최소 40° 이상 이격 → 나란히 놓았을 때 즉시 구분 가능.
- 값은 HSL 문자열 `"H S% L%"` 포맷(shadcn 컨벤션), `hsl(var(--token-*))` 로 사용.

**조정 시점**: Task 010(카드 그리드) 첫 구현 후 실렌더에서 검토. 채도·명도가 텍스트 가독성이나 안나의 감도 기준에 어긋나면 이 표 + globals.css 동시 수정.

## 3. 계층형 radius

shadcn 기본 `--radius`(0.5rem)만으로는 Prompt Studio 특유의 "폭신한 레퍼런스 카드 / 단단한 칩 / 중간톤 다이얼로그" 3단 계층을 표현하기 어려워 커스텀 3종 추가.

| 토큰 | 값 | 용도 | Tailwind 클래스 |
|---|---|---|---|
| `--ref-card-radius` | `16px` | 레퍼런스 카드(메인 허브의 주요 시각 요소) | `rounded-ref-card` |
| `--chip-radius` | `8px` | 6차원 토큰 칩·태그 배지 | `rounded-chip` |
| `--dialog-radius` | `12px` | 다이얼로그·팝오버 컨테이너 | `rounded-dialog` |

shadcn 기본 `rounded-lg/md/sm`은 소스·아이콘 버튼 등 범용 용도 그대로 유지.

## 4. 사용 예시

```tsx
// 6차원 토큰 칩 (레퍼런스 카드 내부)
<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-chip bg-token-subject/10 text-token-subject text-xs font-medium">
  subject: ceramic teapot
</span>

// 레퍼런스 카드 컨테이너
<article className="rounded-ref-card border border-border bg-card p-4 hover:ring-2 hover:ring-ring/20 transition">
  ...
</article>

// 다이얼로그 (shadcn Dialog 래핑 시)
<DialogContent className="rounded-dialog">...</DialogContent>
```

## 5. 확장 규칙

- 새 semantic color 추가 시 반드시 Light + Dark 양쪽 정의 → `globals.css` :root 와 .dark 블록 **둘 다**.
- Tailwind 클래스 네이밍은 `token-*`(의미), `ref-card/chip/dialog`(컨테이너 종류) 컨벤션 유지.
- 임의 HEX 색상 하드코딩 금지. 새 용도는 기존 토큰 조합 또는 신규 semantic 토큰 정의로 해결.
