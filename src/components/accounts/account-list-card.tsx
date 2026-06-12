import Link from "next/link";
import type { AccountRow } from "@/lib/queries/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { AccountCardAvatar } from "@/components/accounts/account-card-avatar";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountListCardProps {
  account: AccountRow;
}

const typeBadge: Record<AccountType, string> = {
  bank: "bg-blue-50 text-blue-700",
  cash: "bg-emerald-50 text-emerald-700",
  credit_card: "bg-orange-50 text-orange-800",
  broker: "bg-violet-50 text-violet-700",
  deposit: "bg-amber-50 text-amber-800",
  investment: "bg-teal-50 text-teal-700",
  loan: "bg-red-50 text-red-700",
  real_estate: "bg-slate-100 text-slate-700",
  other: "bg-slate-50 text-slate-600",
};

export function AccountListCard({ account }: AccountListCardProps) {
  const type = account.account_type as AccountType;

  return (
    <Link
      href={`/accounts/${account.account_id}`}
      className="group flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition hover:border-primary/25 hover:shadow-md"
    >
      <AccountCardAvatar
        accountId={account.account_id}
        accountType={type}
        accountName={account.account_name}
        hasPhoto={account.has_card_photo}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground group-hover:text-primary">
          {account.account_name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", typeBadge[type])}>
            {ACCOUNT_TYPE_LABELS[type]}
          </span>
          <span className="text-[11px] text-muted">{account.currency}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            account.balance < 0 ? "text-red-600" : "text-foreground"
          )}
        >
          {formatPln(account.balance)}
        </p>
      </div>
    </Link>
  );
}
