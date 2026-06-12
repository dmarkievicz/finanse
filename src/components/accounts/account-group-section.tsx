"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AccountGroupSection } from "@/lib/accounts/account-sections";
import { AccountIcon } from "@/components/accounts/account-icon";
import { AccountCard } from "@/components/accounts/account-card";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountGroupSectionProps {
  section: AccountGroupSection;
  defaultOpen?: boolean;
}

export function AccountGroupSectionBlock({
  section,
  defaultOpen = true,
}: AccountGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const countLabel =
    section.accounts.length === 1
      ? "1 konto"
      : `${section.accounts.length} kont`;

  return (
    <section className="rounded-xl border border-border/80 bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80 sm:px-5"
      >
        <AccountIcon
          accountName={section.title}
          accountType="bank"
          groupId={section.id}
          size="sm"
          showFavicon={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className="text-[15px] font-semibold text-foreground">{section.title}</h2>
            <span className="text-[12px] text-muted">· {countLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p
            className={cn(
              "text-base font-bold tabular-nums",
              section.totalPln < 0 ? "text-red-600" : "text-foreground"
            )}
          >
            {formatPln(section.totalPln)}
          </p>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-slate-400 transition",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 pb-4 pt-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.accounts.map((account) => (
              <AccountCard key={account.account_id} account={account} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
