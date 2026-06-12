"use client";

import { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { AccountDetailPanels } from "@/components/accounts/account-detail-panels";
import type { Account } from "@/types/database";
import { cn } from "@/lib/utils";

interface AccountSettingsSectionProps {
  account: Account;
}

export function AccountSettingsSection({ account }: AccountSettingsSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50/80"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Settings2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Karta i ustawienia</p>
          <p className="text-[13px] text-muted">Zdjęcie karty, nazwa, waluta i widoczność</p>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <AccountDetailPanels account={account} />
        </div>
      )}
    </section>
  );
}
