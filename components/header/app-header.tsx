import Link from "next/link";
import { Suspense } from "react";
import { hasEnvVars } from "@/lib/utils";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavList, type NavItem } from "@/components/header/nav-list";

const NAV: NavItem[] = [
  { href: "/library", label: "레퍼런스 라이브러리" },
  { href: "/pairs", label: "프롬프트 페어 로그" },
  { href: "/diff", label: "토큰 diff", v15: true },
  { href: "/search", label: "태그·키워드 검색", v15: true },
  { href: "/remix", label: "리믹스 요청 생성", v15: true },
];

export function AppHeader() {
  return (
    <nav className="w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 h-14 px-5">
        <Link
          href="/library"
          className="font-semibold text-sm shrink-0 hover:text-foreground transition"
        >
          Prompt Studio
        </Link>

        <Suspense>
          <NavList items={NAV} variant="desktop" />
        </Suspense>

        <div className="flex items-center gap-2 shrink-0">
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
          <ThemeSwitcher />
        </div>
      </div>

      <div className="md:hidden border-t border-border">
        <Suspense>
          <NavList items={NAV} variant="mobile" />
        </Suspense>
      </div>
    </nav>
  );
}
