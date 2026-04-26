"use client";

import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type PageGuideSection = {
  heading: string;
  body: string;
};

export type PageGuideProps = {
  title: string;
  intro: string;
  steps: string[];
  whenToUse?: string;
  nextStep?: string;
  align?: "start" | "center" | "end";
};

/**
 * 헤더 옆 작은 ? 아이콘 → 클릭하면 페이지 사용법이 팝오버로 펼쳐진다.
 *
 * 평소엔 눈에 띄지 않게 muted-foreground 톤. hover 시 살짝 밝아져 발견 가능성 확보.
 * 본문은 초등학생도 이해할 수 있는 한국어로 작성한다 (비유·짧은 문장 권장).
 */
export function PageGuide({
  title,
  intro,
  steps,
  whenToUse,
  nextStep,
  align = "start",
}: PageGuideProps) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        aria-label={`${title} 사용법 보기`}
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-[min(360px,calc(100vw-32px))] space-y-3 text-sm leading-relaxed"
      >
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title} 사용법</h3>
          <p className="text-muted-foreground">{intro}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            이렇게 써요
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-foreground marker:text-muted-foreground">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        {whenToUse && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              언제 쓰나요?
            </p>
            <p className="text-muted-foreground">{whenToUse}</p>
          </div>
        )}

        {nextStep && (
          <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">다음 단계 </span>
            {nextStep}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
