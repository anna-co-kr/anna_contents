"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * 10-step dot slider.
 * DESIGN-7 autoplan: "슬라이더 또는 스타 레이팅" 결정 유보 해소 → 10개 점 방식 고정.
 * - 값 null 허용 (미설정)
 * - 키보드: Left/Right 1단위, Home/End 양끝, Delete/Backspace null
 */
export type DotSliderProps = {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function DotSlider({
  value,
  onChange,
  min = 1,
  max = 10,
  label = "점수",
  disabled,
  className,
}: DotSliderProps) {
  const id = useId();
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = value === null ? min : Math.max(min, value - 1);
      onChange(next);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = value === null ? min : Math.min(max, value + 1);
      onChange(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onChange(null);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span id={id} className="text-xs font-medium">
          {label}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value === null ? "-" : `${value} / ${max}`}
        </span>
      </div>

      <div
        role="slider"
        aria-labelledby={id}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-1 rounded-md border border-input bg-background px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "opacity-50",
        )}
      >
        {steps.map((step) => {
          const isActive = value !== null && step <= value;
          return (
            <button
              key={step}
              type="button"
              disabled={disabled}
              onClick={() => onChange(value === step ? null : step)}
              aria-label={`${step}점`}
              className={cn(
                "size-5 rounded-full border transition",
                isActive
                  ? "border-token-lighting bg-token-lighting"
                  : "border-border bg-muted hover:border-ring/60",
                disabled && "cursor-not-allowed",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
