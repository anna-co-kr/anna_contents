/**
 * 페어 로그 세션 ID 관리 (EDGE-1 CEO 리뷰 반영).
 *
 * - localStorage 두 키:
 *   - `promptStudio.sessionId` — UUID
 *   - `promptStudio.sessionLastActivity` — ISO timestamp
 * - 페어 저장 직후 `touchSession()`으로 `sessionLastActivity` 갱신
 * - 새 진입 시 `ensureSessionId()`:
 *   - last activity가 30분 이내면 기존 session 재사용
 *   - 그 외엔 신규 UUID 발급
 * - 여러 탭에서 localStorage 공유로 동일 세션 ID 유지
 */

const SESSION_ID_KEY = "promptStudio.sessionId";
const SESSION_LAST_ACTIVITY_KEY = "promptStudio.sessionLastActivity";
const IDLE_MS = 30 * 60 * 1000; // 30분

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // quota/private mode — soft fail
  }
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureSessionId(now: number = Date.now()): string {
  const existing = safeGet(SESSION_ID_KEY);
  const lastIso = safeGet(SESSION_LAST_ACTIVITY_KEY);
  if (existing && lastIso) {
    const age = now - new Date(lastIso).getTime();
    if (Number.isFinite(age) && age <= IDLE_MS) {
      return existing;
    }
  }
  const fresh = generateUuid();
  safeSet(SESSION_ID_KEY, fresh);
  safeSet(SESSION_LAST_ACTIVITY_KEY, new Date(now).toISOString());
  return fresh;
}

export function touchSession(now: number = Date.now()): void {
  safeSet(SESSION_LAST_ACTIVITY_KEY, new Date(now).toISOString());
}

export function peekSession(): {
  id: string | null;
  lastActivityIso: string | null;
  ageMs: number | null;
  isIdle: boolean;
} {
  const id = safeGet(SESSION_ID_KEY);
  const lastIso = safeGet(SESSION_LAST_ACTIVITY_KEY);
  if (!id || !lastIso) {
    return { id: null, lastActivityIso: null, ageMs: null, isIdle: false };
  }
  const ageMs = Date.now() - new Date(lastIso).getTime();
  return {
    id,
    lastActivityIso: lastIso,
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
    isIdle: Number.isFinite(ageMs) && ageMs > IDLE_MS,
  };
}

export function resetSession(): string {
  const fresh = generateUuid();
  safeSet(SESSION_ID_KEY, fresh);
  safeSet(SESSION_LAST_ACTIVITY_KEY, new Date().toISOString());
  return fresh;
}

export const SESSION_STORAGE_KEYS = {
  id: SESSION_ID_KEY,
  lastActivity: SESSION_LAST_ACTIVITY_KEY,
} as const;
export const SESSION_IDLE_MS = IDLE_MS;
