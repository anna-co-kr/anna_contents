// 루트 `/` 접근은 proxy.ts (middleware)에서 인증 상태에 따라
//   - 비로그인 → /login
//   - 로그인 → /library
// 으로 redirect 되므로 이 컴포넌트는 이론상 렌더되지 않는다.
// middleware 이슈로 fall-through되는 경우의 safety fallback.

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-svh flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-semibold">Prompt Studio v0.5</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline hover:text-foreground">
            로그인 페이지로 이동
          </Link>
        </p>
      </div>
    </main>
  );
}
