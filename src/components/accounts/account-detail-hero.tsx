import type { Account } from "@/types/database";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import { parseAccountMetadata } from "@/lib/accounts/account-metadata";
import { AccountCardAvatar } from "@/components/accounts/account-card-avatar";
import { formatAccountBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountDetailHeroProps {
  account: Account;
  currentBalance: number;
  currentBalanceNative: number;
  historyBalance: number;
  historyBalanceNative: number;
  transactionCount: number;
}

export function AccountDetailHero({
  account,
  currentBalance,
  currentBalanceNative,
  historyBalance,
  historyBalanceNative,
  transactionCount,
}: AccountDetailHeroProps) {
  const hasPhoto = Boolean(parseAccountMetadata(account.metadata).card_photo_storage_path);

  const stats = [
    {
      label: "Saldo bieżące",
      value: formatAccountBalance(
        currentBalanceNative,
        account.default_currency,
        currentBalance
      ),
      muted: false,
    },
    {
      label: "Pełna historia importu",
      value: formatAccountBalance(
        historyBalanceNative,
        account.default_currency,
        historyBalance
      ),
      muted: true,
    },
    { label: "Transakcje", value: transactionCount.toLocaleString("pl-PL"), muted: false },
  ];

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <AccountCardAvatar
          accountId={account.id}
          accountType={account.account_type}
          accountName={account.name}
          hasPhoto={hasPhoto}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-foreground">{account.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {ACCOUNT_TYPE_LABELS[account.account_type]} · {account.default_currency}
            {account.account_number ? ` · ${account.account_number}` : ""}
          </p>
        </div>
      </div>

      <div className="grid border-t border-border sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="border-border px-5 py-4 sm:border-r last:sm:border-r-0">
            <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums",
                s.muted ? "text-muted" : currentBalance < 0 && s.label === "Saldo bieżące" ? "text-red-600" : "text-foreground"
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
