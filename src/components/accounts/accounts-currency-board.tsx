import { Globe, Landmark, PiggyBank, Wallet } from "lucide-react";
import type { AccountListSection, AccountSectionId } from "@/lib/accounts/currency-groups";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { AccountListCard } from "@/components/accounts/account-list-card";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountsCurrencyBoardProps {
  sections: AccountListSection[];
}

const sectionStyle: Record<
  AccountSectionId,
  { icon: typeof Landmark; accent: string }
> = {
  bank: { icon: Landmark, accent: "bg-blue-50 text-blue-600" },
  foreign: { icon: Globe, accent: "bg-violet-50 text-violet-600" },
  cash: { icon: Wallet, accent: "bg-emerald-50 text-emerald-600" },
  investments: { icon: PiggyBank, accent: "bg-amber-50 text-amber-700" },
};

export function AccountsCurrencyBoard({ sections }: AccountsCurrencyBoardProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        Brak aktywnych kont.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const { icon: Icon, accent } = sectionStyle[section.id];
        const showTypeHeaders = Object.keys(section.byType).length > 1;

        return (
          <section key={section.id}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    accent
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                  <p className="text-[13px] text-muted">{section.subtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {section.accounts.length} kont · suma PLN
                </p>
                <p className="text-xl font-bold tabular-nums">{formatPln(section.totalPln)}</p>
              </div>
            </div>

            <div className="space-y-5">
              {(Object.entries(section.byType) as [AccountType, typeof section.accounts][]).map(
                ([type, items]) => (
                  <div key={type}>
                    {showTypeHeaders && (
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        {ACCOUNT_TYPE_LABELS[type]}
                        <span className="ml-1.5 font-normal">({items.length})</span>
                      </h3>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((account) => (
                        <AccountListCard key={account.account_id} account={account} />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
