import type { AccountBalance } from "@/types/database";
import { formatPln } from "@/lib/format";

interface AccountBalancesProps {
  accounts: AccountBalance[];
}

export function AccountBalances({ accounts }: AccountBalancesProps) {
  const max = Math.max(...accounts.map((a) => Math.abs(Number(a.balance_pln))), 1);

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Salda kont</h3>
          <p className="text-xs text-muted">Przeliczone na PLN</p>
        </div>
        <p className="py-6 text-center text-sm text-muted">Brak danych o saldach</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Salda kont</h3>
        <p className="text-xs text-muted">Przeliczone na PLN · top {accounts.length}</p>
      </div>
      <ul className="space-y-3">
        {accounts.map((a) => {
          const value = Number(a.balance_pln);
          return (
            <li key={a.account_id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-foreground">{a.account_name}</span>
                <span className={value < 0 ? "text-red-600" : "text-muted"}>{formatPln(value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                  style={{ width: `${(Math.abs(value) / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
