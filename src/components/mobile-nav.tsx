"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Menu,
  Plus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Pulpit", icon: LayoutDashboard },
  { href: "/transactions", label: "Trans.", icon: ArrowLeftRight },
  { href: "/transactions/new", label: "Dodaj", icon: Plus, accent: true },
  { href: "/accounts", label: "Konta", icon: Wallet },
  { href: "/settings", label: "Więcej", icon: Menu },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex items-stretch justify-around">
        {items.map(({ href, label, icon: Icon, accent }) => {
          const active =
            pathname === href ||
            (href === "/transactions" &&
              pathname.startsWith("/transactions") &&
              pathname !== "/transactions/new") ||
            (href === "/settings" &&
              (pathname.startsWith("/settings") ||
                pathname.startsWith("/imports") ||
                pathname.startsWith("/budgets") ||
                pathname.startsWith("/investments") ||
                pathname.startsWith("/categories")));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium",
                accent
                  ? "text-primary"
                  : active
                    ? "text-foreground"
                    : "text-muted"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  accent && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
