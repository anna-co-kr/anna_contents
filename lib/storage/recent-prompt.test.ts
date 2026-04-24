import { beforeEach, describe, expect, it } from "vitest";
import {
  RECENT_PROMPT_EXPIRY_MS,
  RECENT_PROMPT_STORAGE_KEY,
  clearRecentCopiedPrompt,
  loadRecentCopiedPrompt,
  saveRecentCopiedPrompt,
} from "./recent-prompt";

// jsdom 없으므로 window.localStorage를 직접 폴리필
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  // @ts-expect-error — vitest 환경에 window 주입
  globalThis.window = { localStorage: new MemoryStorage() };
});

const PAYLOAD = {
  text: "a cinematic portrait",
  referenceId: "00000000-0000-0000-0000-000000000001",
  promptId: "00000000-0000-0000-0000-000000000002",
  tool: "higgsfield" as const,
  language: "en" as const,
};

describe("recent-prompt localStorage", () => {
  it("save → load round-trip 성공", () => {
    saveRecentCopiedPrompt(PAYLOAD);
    const got = loadRecentCopiedPrompt();
    expect(got).not.toBeNull();
    expect(got?.text).toBe(PAYLOAD.text);
    expect(got?.tool).toBe("higgsfield");
    expect(got?.language).toBe("en");
    expect(got?.referenceId).toBe(PAYLOAD.referenceId);
    expect(got?.promptId).toBe(PAYLOAD.promptId);
    // copiedAt은 ISO string
    expect(typeof got?.copiedAt).toBe("string");
    expect(() => new Date(got!.copiedAt)).not.toThrow();
  });

  it("clear 하면 다음 load는 null", () => {
    saveRecentCopiedPrompt(PAYLOAD);
    clearRecentCopiedPrompt();
    expect(loadRecentCopiedPrompt()).toBeNull();
  });

  it("30분 초과 시 null + 자동 clear", () => {
    // copiedAt을 직접 과거로 세팅
    const ancient = new Date(Date.now() - RECENT_PROMPT_EXPIRY_MS - 1000).toISOString();
    window.localStorage.setItem(
      RECENT_PROMPT_STORAGE_KEY,
      JSON.stringify({ ...PAYLOAD, copiedAt: ancient }),
    );
    expect(loadRecentCopiedPrompt()).toBeNull();
    // auto-cleared
    expect(window.localStorage.getItem(RECENT_PROMPT_STORAGE_KEY)).toBeNull();
  });

  it("29분 경과 직전은 유효", () => {
    const fresh = new Date(Date.now() - (RECENT_PROMPT_EXPIRY_MS - 60_000)).toISOString();
    window.localStorage.setItem(
      RECENT_PROMPT_STORAGE_KEY,
      JSON.stringify({ ...PAYLOAD, copiedAt: fresh }),
    );
    const got = loadRecentCopiedPrompt();
    expect(got).not.toBeNull();
    expect(got?.text).toBe(PAYLOAD.text);
  });

  it("깨진 JSON 저장돼도 null 반환 (crash 안 함)", () => {
    window.localStorage.setItem(RECENT_PROMPT_STORAGE_KEY, "not-json-at-all");
    expect(loadRecentCopiedPrompt()).toBeNull();
  });

  it("필수 필드 없으면 null 반환", () => {
    window.localStorage.setItem(
      RECENT_PROMPT_STORAGE_KEY,
      JSON.stringify({ text: "ok" }),
    );
    expect(loadRecentCopiedPrompt()).toBeNull();
  });
});
