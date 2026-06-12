"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ACCOUNT_CURRENCIES } from "@/lib/accounts/patch-fields";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ORDER } from "@/lib/queries/accounts";
import type { Account, AccountLifecycleStatus, AccountType } from "@/types/database";

const LIFECYCLE_LABELS: Record<AccountLifecycleStatus, string> = {
  active: "Aktywne — widoczne w bieżących finansach",
  inactive: "Nieaktywne — zamknięte, ale w historii",
  archived: "Archiwalne — z importu, ukryte z pulpitu",
};

interface AccountEditFormProps {
  account: Account;
}

export function AccountEditForm({ account }: AccountEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(account.name);
  const [accountNumber, setAccountNumber] = useState(account.account_number ?? "");
  const [accountType, setAccountType] = useState<AccountType>(account.account_type);
  const [currency, setCurrency] = useState(account.default_currency);
  const [lifecycleStatus, setLifecycleStatus] = useState<AccountLifecycleStatus>(
    account.lifecycle_status
  );
  const [showOnDashboard, setShowOnDashboard] = useState(account.show_on_dashboard);
  const [includeInNetWorth, setIncludeInNetWorth] = useState(account.include_in_net_worth);
  const [needsReview, setNeedsReview] = useState(account.needs_review);
  const [notes, setNotes] = useState(account.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          account_number: accountNumber || null,
          account_type: accountType,
          default_currency: currency,
          lifecycle_status: lifecycleStatus,
          show_on_dashboard: showOnDashboard,
          include_in_net_worth: includeInNetWorth,
          needs_review: needsReview,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setMessage("Zapisano");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h2 className="text-sm font-semibold text-foreground">Parametry konta</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted">Nazwa</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted">Numer konta (IBAN / rachunek)</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="np. PL12 3456 7890 …"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted">Typ konta</label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            {ACCOUNT_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted">Waluta domyślna</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            {ACCOUNT_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted">Status cyklu życia</label>
          <select
            value={lifecycleStatus}
            onChange={(e) => setLifecycleStatus(e.target.value as AccountLifecycleStatus)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            {(Object.keys(LIFECYCLE_LABELS) as AccountLifecycleStatus[]).map((s) => (
              <option key={s} value={s}>
                {LIFECYCLE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={showOnDashboard}
            onChange={(e) => setShowOnDashboard(e.target.checked)}
          />
          Pokaż na pulpicie
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeInNetWorth}
            onChange={(e) => setIncludeInNetWorth(e.target.checked)}
          />
          Wliczaj do majątku netto
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={needsReview}
            onChange={(e) => setNeedsReview(e.target.checked)}
          />
          Wymaga uporządkowania
        </label>
      </div>

      <div>
        <label className="text-xs font-medium text-muted">Notatki</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Zapisz zmiany
      </button>
    </form>
  );
}
