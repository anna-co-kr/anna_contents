import { ArrowUp, Link2, UploadCloud, Sparkles } from "lucide-react";

export function EmptyLibrary() {
  return (
    <div className="rounded-ref-card border border-dashed border-border bg-accent/10 py-12 px-6">
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-accent">
          <Sparkles className="size-6 text-token-style" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">첫 레퍼런스를 드롭해보세요</h2>
          <p className="text-sm text-muted-foreground">
            위 영역에서 아래 3가지 중 하나로 시작할 수 있어요
          </p>
        </div>

        <ul className="space-y-2.5 text-left text-sm">
          <li className="flex items-start gap-2.5">
            <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">IG · Pinterest · YouTube URL</span>을 붙여넣기
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <UploadCloud className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">이미지 파일</span>을 드래그 & 드롭
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-token-style" />
            <span>
              저장 후 Claude Code에서 <span className="font-medium">6차원 분석</span>을 받아와서 붙여넣기
            </span>
          </li>
        </ul>

        <div
          aria-hidden
          className="flex items-center justify-center gap-1 pt-2 text-xs text-muted-foreground"
        >
          <ArrowUp className="size-3.5 animate-bounce" />
          <span>위 드롭존으로</span>
        </div>
      </div>
    </div>
  );
}
