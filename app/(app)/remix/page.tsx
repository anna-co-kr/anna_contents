export default function RemixPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">리믹스 요청 생성</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-chip border border-border text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
            V1.5
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          기준 레퍼런스 + 새 주제 → Claude Code CLI에 붙여넣을 요청 문장 조립 (클라이언트 템플릿, API 호출 0, Task 028에서 구현 예정)
        </p>
      </header>
    </section>
  );
}
