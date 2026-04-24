/**
 * 최근 복사한 프롬프트 기록 — DESIGN-5 Cmd+V 스마트 매칭 기반 구조.
 *
 * localStorage key: "promptStudio.recentCopiedPrompt"
 * 만료: 30분 (copiedAt 기준 Date.now() diff > 30 * 60 * 1000 → null 반환 + 자동 clear)
 *
 * Task 014(페어 로그)에서 이 기록을 읽어 tool · language 토글을 prefill.
 */

import type { PromptLanguage, PromptTool } from "@/lib/schemas/prompt";

const STORAGE_KEY = "promptStudio.recentCopiedPrompt";
const EXPIRY_MS = 30 * 60 * 1000; // 30분

export type RecentCopiedPrompt = {
  text: string;
  referenceId: string;
  promptId: string;
  tool: PromptTool;
  language: PromptLanguage;
  copiedAt: string; // ISO timestamp
};

export function saveRecentCopiedPrompt(
  payload: Omit<RecentCopiedPrompt, "copiedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    const full: RecentCopiedPrompt = {
      ...payload,
      copiedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // quota/private mode — soft fail
  }
}

export function loadRecentCopiedPrompt(): RecentCopiedPrompt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecentCopiedPrompt | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.text ||
      !parsed.copiedAt
    ) {
      return null;
    }
    const age = Date.now() - new Date(parsed.copiedAt).getTime();
    if (!Number.isFinite(age) || age > EXPIRY_MS) {
      clearRecentCopiedPrompt();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRecentCopiedPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // soft fail
  }
}

// 테스트용 상수 노출 (vitest에서 만료 경계 검증)
export const RECENT_PROMPT_STORAGE_KEY = STORAGE_KEY;
export const RECENT_PROMPT_EXPIRY_MS = EXPIRY_MS;
