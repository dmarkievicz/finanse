"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, MoreHorizontal } from "lucide-react";
import type { AccountsPageAccount } from "@/lib/queries/fetch-accounts-page";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { AccountCardAvatar } from "@/components/accounts/account-card-avatar";
import { formatAccountBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  account: AccountsPageAccount;
}

const TYPE_SUBLABEL: Partial<Record<AccountType, string>> = {
  bank: "Konto osobiste",
  cash: "Gotówka",
  credit_card: "Karta kredytowa",
  broker: "Konto maklerskie",
  deposit: "Lokata",
  investment: "Inwestycja",
  loan: "Kredyt / pożyczka",
  real_estate: "Nieruchomość",
};

function statusLabel(account: AccountsPageAccount): {
  text: string;
  tone: "active" | "archived" | "hidden";
} {
  if (account.lifecycle_status === "archived") {
    return { text: "Archiwalne", tone: "archived" };
  }
  if (!account.show_on_dashboard) {
    return { text: "Ukryte", tone: "hidden" };
  }
  return { text: "Aktywne", tone: "active" };
}

export function AccountCard({ account }: AccountCardProps) {
  const type = account.account_type as AccountType;
  const status = statusLabel(account);
  const sublabel = TYPE_SUBLABEL[type] ?? ACCOUNT_TYPE_LABELS[type];
  const isZero = account.balance === 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm transition hover:border-primary/20 hover:shadow-md",
        isZero && "opacity-80"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <AccountCardAvatar
          accountId={account.account_id}
          accountType={type}
          accountName={account.account_name}
          hasPhoto={account.has_card_photo}
          photoUrl={account.photo_url}
          size="md"
        />
        <details className="relative">
          <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 z-10 mt-1 min-w-[10rem] rounded-lg border border-border bg-card py-1 shadow-lg">
            <Link
              href={`/accounts/${account.account_id}`}
              className="block px-3 py-2 text-sm text-foreground hover:bg-slate-50"
            >
              Szczegóły konta
            </Link>
            <Link
              href={`/transactions?account=${account.account_id}`}
              className="block px-3 py-2 text-sm text-foreground hover:bg-slate-50"
            >
              Transakcje
            </Link>
          </div>
        </details>
      </div>

      <Link href={`/accounts/${account.account_id}`} className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground group-hover:text-primary">
          {account.account_name}
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          {sublabel} · {account.currency}
        </p>

        <p
          className={cn(
            "mt-3 text-xl font-bold tabular-nums tracking-tight",
            account.balance < 0 ? "text-red-600" : "text-foreground"
          )}
        >
          {formatAccountBalance(account.balance_native, account.currency, account.balance)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-medium",
              status.tone === "active" && "text-emerald-700",
              status.tone === "archived" && "text-slate-500",
              status.tone === "hidden" && "text-amber-700"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status.tone === "active" && "bg-emerald-500",
                status.tone === "archived" && "bg-slate-400",
                status.tone === "hidden" && "bg-amber-500"
              )}
            />
            {status.text}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          {account.has_opening_balance ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Saldo początkowe ustawione
            </>
          ) : (
            <>
              <CircleAlert className="h-3.5 w-3.5 text-slate-400" />
              Brak salda początkowego
            </>
          )}
        </p>
      </Link>
    </div>
  );
}
