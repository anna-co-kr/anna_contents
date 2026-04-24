"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type NavItem = {
  href: string;
  label: string;
  v15?: boolean;
};

export function NavList({
  items,
  variant,
}: {
  items: NavItem[];
  variant: "desktop" | "mobile";
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/library") return pathname?.startsWith("/library");
    return pathname === href || pathname?.startsWith(href + "/");
  };

  if (variant === "mobile") {
    return (
      <ul className="flex items-center gap-1 overflow-x-auto px-3 py-2">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs whitespace-nowrap",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {item.v15 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 font-normal leading-none"
                  >
                    V1.5
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="hidden md:flex items-center gap-1">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              {item.label}
              {item.v15 && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 font-normal tracking-wide leading-none"
                >
                  V1.5
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
