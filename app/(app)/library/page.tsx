import { Suspense } from "react";
import { DropZone } from "@/components/library/drop-zone";
import { LibraryGrid } from "@/components/library/library-grid";
import { PageGuide } from "@/components/common/page-guide";

export default function LibraryPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            레퍼런스 라이브러리
          </h1>
          <PageGuide
            title="레퍼런스 라이브러리"
            intro="마음에 드는 이미지나 영상을 모아두는 내 작업방이에요. 한 번 모아두면 컴퓨터가 어떤 느낌의 그림인지 자동으로 분석해서 기억해줘요."
            steps={[
              "마음에 드는 인스타·핀터레스트·유튜브 링크나 이미지를 위쪽 드롭존에 떨어뜨려요.",
              "잠시 기다리면 카드 형태로 추가돼요 — 이때 토큰은 아직 없는 상태(분석 대기)예요.",
              "정해진 시간(매일 12:03·18:33)에 컴퓨터가 자동으로 6가지 느낌(주제·스타일·조명·구도·재질·분위기)을 영어로 분석해줘요.",
              "카드 위에 마우스를 올리면 우상단 버튼이 보여요. 거기서 태그·점수·메모를 직접 편집할 수 있어요.",
              "위쪽 필터 버튼으로 'auto(자동 분석)' / 'manual(내가 직접 정정)' / '분석 대기' 카드만 골라서 볼 수 있어요.",
            ]}
            whenToUse="새로운 작품을 보고 '이런 느낌 좋다!' 싶을 때 바로바로 모아두세요. 나중에 비슷한 분위기를 만들고 싶을 때 검색해서 꺼내 쓸 수 있어요."
            nextStep="모인 카드를 클릭하면 6차원 토큰을 자세히 보고 정정할 수 있고, /remix 페이지에서 새 그림 만드는 프롬프트로 변환할 수 있어요."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          URL · 이미지를 드롭해 6차원 토큰으로 축적. 카드 hover 시 우상단 버튼으로 태그·스코어·스니펫을 편집할 수 있어요.
        </p>
      </header>

      <DropZone />

      <Suspense fallback={<GridSkeleton />}>
        <LibraryGrid />
      </Suspense>
    </section>
  );
}

function GridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="라이브러리 불러오는 중"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-ref-card border border-border bg-card"
        >
          <div className="aspect-square w-full animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
