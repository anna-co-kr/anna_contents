import { DropZone } from "@/components/library/drop-zone";

export default function LibraryPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          레퍼런스 라이브러리
        </h1>
        <p className="text-sm text-muted-foreground">
          URL · 이미지를 드롭해 6차원 토큰으로 축적. Claude Code 분석 연동은 Task 008에서 구현 예정.
        </p>
      </header>

      <DropZone />

      <div className="rounded-ref-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        (Task 010에서 구현될 레퍼런스 카드 그리드 영역)
      </div>
    </section>
  );
}
