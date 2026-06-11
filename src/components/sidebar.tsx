"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Upload,
  Settings,
  LogOut,
  Tags,
  PiggyBank,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface SidebarProps {
  needsReviewCount?: number;
}

const primaryNav = [
  { href: "/dashboard", label: "Pulpit", icon: LayoutDashboard },
  { href: "/transactions/new", label: "Dodaj transakcję", icon: Plus, highlight: true },
  { href: "/transactions", label: "Transakcje", icon: ArrowLeftRight },
  { href: "/accounts", label: "Konta", icon: Wallet },
  { href: "/categories", label: "Kategorie", icon: Tags },
  { href: "/budgets", label: "Budżety", icon: PiggyBank },
  { href: "/investments", label: "Inwestycje", icon: TrendingUp },
];

const secondaryNav = [
  { href: "/imports", label: "Import", icon: Upload, badgeKey: "review" as const },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

export function Sidebar({ needsReviewCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
            FD
          </div>
          <div>
            <p className="text-sm font-semibold">Finanse Damian</p>
            <p className="text-xs text-white/60">Wealth Dashboard</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {primaryNav.map(({ href, label, icon: Icon, highlight }) => {
          const active =
            pathname === href ||
            (href === "/transactions/new" && pathname === "/transactions/new") ||
            (href === "/transactions" &&
              (pathname === "/transactions" ||
                (pathname.startsWith("/transactions/") && pathname !== "/transactions/new"))) ||
            (href === "/categories" && pathname.startsWith("/categories")) ||
            (href === "/accounts" && pathname.startsWith("/accounts")) ||
            (href === "/investments" && pathname.startsWith("/investments"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-white/15 font-medium text-white"
                  : highlight
                    ? "bg-accent/90 font-medium text-white hover:bg-accent"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}

        <div className="my-3 border-t border-white/10" />

        {secondaryNav.map(({ href, label, icon: Icon, badgeKey }) => {
          const badge = badgeKey === "review" ? needsReviewCount : 0;
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/imports" && pathname === "/transactions/review");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-white/15 font-medium text-white"
                  : "text-white/50 hover:bg-white/10 hover:text-white/80"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </button>
      </div>
    </aside>
  );
}
