export default function DiffPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">토큰 diff</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-chip border border-border text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
            V1.5
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          성공 · 실패 프롬프트 텍스트의 단어 단위 diff 시각화 (클라이언트 jsdiff, Task 018/027에서 구현 예정)
        </p>
      </header>
    </section>
  );
}
