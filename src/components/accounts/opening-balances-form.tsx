"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Scale } from "lucide-react";
import type { AccountManageRow } from "@/types/database";
import { formatPln } from "@/lib/format";

interface OpeningBalancesFormProps {
  accounts: AccountManageRow[];
  analysisStartDate: string | null;
}

export function OpeningBalancesForm({ accounts, analysisStartDate }: OpeningBalancesFormProps) {
  const router = useRouter();
  const activeAccounts = accounts.filter((a) => a.lifecycle_status === "active");
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const a of activeAccounts) {
      if (a.has_opening_balance && a.opening_balance_pln != null) {
        init[a.account_id] = String(a.opening_balance_pln);
      }
    }
    return init;
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!analysisStartDate) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900">
        <p className="font-medium">Najpierw ustaw datę startu analiz</p>
        <p className="mt-1">
          Przejdź do{" "}
          <Link href="/settings" className="underline">
            Ustawień
          </Link>{" "}
          i wybierz datę (np. 01.01.2026), od której liczysz bieżące finanse.
        </p>
      </div>
    );
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
        Brak aktywnych kont.{" "}
        <Link href="/accounts/manage" className="font-medium text-accent hover:underline">
          Aktywuj konta
        </Link>{" "}
        przed ustawieniem sald początkowych.
      </div>
    );
  }

  async function saveOne(accountId: string, accountName: string) {
    const raw = amounts[accountId];
    if (raw === undefined || raw === "") return;
    const amount_pln = Number(raw.replace(",", "."));
    if (Number.isNaN(amount_pln)) {
      setError(`Niepoprawna kwota dla ${accountName}`);
      return;
    }

    setLoadingId(accountId);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/accounts/opening-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          amount_pln,
          description: `Saldo otwarcia — ${accountName} na dzień ${analysisStartDate}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");

      setMessage(`Zapisano saldo otwarcia: ${accountName}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoadingId(null);
    }
  }

  async function saveAll() {
    setSavingAll(true);
    setError(null);
    setMessage(null);
    let saved = 0;

    for (const a of activeAccounts) {
      const raw = amounts[a.account_id];
      if (raw === undefined || raw === "") continue;
      try {
        const amount_pln = Number(raw.replace(",", "."));
        if (Number.isNaN(amount_pln)) continue;

        const res = await fetch("/api/accounts/opening-balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: a.account_id,
            amount_pln,
            description: `Saldo otwarcia — ${a.account_name} na dzień ${analysisStartDate}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
        saved++;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd");
        break;
      }
    }

    if (saved > 0) {
      setMessage(`Zapisano salda początkowe dla ${saved} kont (data: ${analysisStartDate})`);
      router.refresh();
    }
    setSavingAll(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Salda początkowe</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          Wpisz rzeczywisty stan kont na dzień <strong>{analysisStartDate}</strong>. System utworzy
          jawne korekty typu „saldo otwarcia”. Bieżące saldo = stan początkowy + transakcje po tej
          dacie.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Konto</th>
                <th className="px-4 py-3 font-medium">Waluta</th>
                <th className="px-4 py-3 font-medium">Historia (pełna)</th>
                <th className="px-4 py-3 font-medium">Saldo otwarcia (PLN)</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {activeAccounts.map((a) => (
                <tr key={a.account_id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {a.account_name}
                    {a.has_opening_balance && (
                      <span className="ml-2 text-xs text-emerald-600">✓ ustawione</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{a.currency}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {formatPln(a.history_balance_pln)}{" "}
                    <span className="text-muted">(z importu)</span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="np. 35000"
                      value={amounts[a.account_id] ?? ""}
                      onChange={(e) =>
                        setAmounts((prev) => ({ ...prev, [a.account_id]: e.target.value }))
                      }
                      className="w-32 rounded-lg border border-border px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={loadingId !== null || savingAll}
                      onClick={() => saveOne(a.account_id, a.account_name)}
                      className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {loadingId === a.account_id ? "Zapisuję…" : "Zapisz"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={saveAll}
          disabled={savingAll || loadingId !== null}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {savingAll && <Loader2 className="h-4 w-4 animate-spin" />}
          Zapisz wszystkie salda początkowe
        </button>

        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
