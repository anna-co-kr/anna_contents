"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Clock } from "lucide-react";
import {
  SESSION_IDLE_MS,
  ensureSessionId,
  peekSession,
  resetSession,
} from "@/lib/session/session-id";
import { Button } from "@/components/ui/button";

type Snapshot = {
  id: string | null;
  ageMs: number | null;
  isIdle: boolean;
};

function formatAge(ageMs: number | null): string {
  if (ageMs === null || !Number.isFinite(ageMs) || ageMs < 0) return "방금 전";
  const min = Math.floor(ageMs / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  return `${h}시간 ${min % 60}분 전`;
}

export function SessionIndicator() {
  const [snap, setSnap] = useState<Snapshot>({
    id: null,
    ageMs: null,
    isIdle: false,
  });

  useEffect(() => {
    ensureSessionId();
    const tick = () => {
      const s = peekSession();
      setSnap({ id: s.id, ageMs: s.ageMs, isIdle: s.isIdle });
    };
    tick();
    const handle = window.setInterval(tick, 15_000);
    return () => window.clearInterval(handle);
  }, []);

  const handleReset = () => {
    resetSession();
    const s = peekSession();
    setSnap({ id: s.id, ageMs: s.ageMs, isIdle: s.isIdle });
  };

  if (!snap.id) return null;

  const idleMinutes = Math.round(SESSION_IDLE_MS / 60_000);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
      <Clock className="size-3.5 text-muted-foreground" />
      <span className="font-mono text-[11px]">session {snap.id.slice(0, 8)}</span>
      <span className="text-muted-foreground">· 마지막 저장 {formatAge(snap.ageMs)}</span>
      {snap.isIdle && (
        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium">
          {idleMinutes}분+ idle · 다음 저장 시 새 세션
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleReset}
        className="ml-auto h-6 gap-1 px-2 text-[11px]"
        aria-label="새 세션 시작"
      >
        <RefreshCw className="size-3" /> 새 세션
      </Button>
    </div>
  );
}
