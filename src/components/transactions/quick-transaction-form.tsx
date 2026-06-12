"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { TRANSACTION_CURRENCIES } from "@/lib/transactions/currencies";
import { useNbpRate } from "@/lib/hooks/use-nbp-rate";

type QuickType = "expense" | "income";

interface AccountOption {
  id: string;
  name: string;
  default_currency?: string;
}

interface QuickTransactionFormProps {
  accounts: AccountOption[];
  categories: { id: string; name: string; type: string }[];
}

export function QuickTransactionForm({ accounts, categories }: QuickTransactionFormProps) {
  const router = useRouter();
  const [type, setType] = useState<QuickType>("expense");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(accounts[0]?.default_currency ?? "PLN");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === "both"
  );

  const nbp = useNbpRate(currency, date, currency !== "PLN");

  useEffect(() => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc?.default_currency) {
      setCurrency(acc.default_currency);
      if (acc.default_currency === "PLN") setExchangeRate("1");
    }
  }, [accountId, accounts]);

  useEffect(() => {
    if (currency !== "PLN" && nbp.rate !== "1") setExchangeRate(nbp.rate);
  }, [nbp.rate, currency]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedAmount = Number(amount.replace(",", "."));
    const parsedRate = Number(exchangeRate.replace(",", "."));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Podaj poprawną kwotę");
      setLoading(false);
      return;
    }
    if (!accountId) {
      setError("Wybierz konto");
      setLoading(false);
      return;
    }
    if (currency !== "PLN" && (Number.isNaN(parsedRate) || parsedRate <= 0)) {
      setError("Podaj kurs do PLN");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          type,
          account_id: accountId,
          amount: parsedAmount,
          currency,
          exchange_rate: currency === "PLN" ? 1 : parsedRate,
          category_id: categoryId || undefined,
          details: details || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");

      setAmount("");
      setDetails("");
      setCategoryId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-foreground">Szybki zapis</h3>
        <p className="mt-2 text-sm text-muted">
          Najpierw{" "}
          <Link href="/accounts/new" className="font-medium text-accent hover:underline">
            dodaj konto
          </Link>
          , aby rejestrować wydatki i przychody.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Szybki zapis</h3>
          <p className="text-xs text-muted">Wydatek lub przychód na co dzień</p>
        </div>
        <Link
          href="/transactions/new"
          className="text-xs font-medium text-accent hover:underline"
        >
          Pełny formularz →
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          {(["expense", "income"] as QuickType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                type === t
                  ? t === "expense"
                    ? "bg-red-600 text-white"
                    : "bg-emerald-600 text-white"
                  : "border border-border bg-background"
              }`}
            >
              {t === "expense" ? "Wydatek" : "Przychód"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Kwota</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Waluta</label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                if (e.target.value === "PLN") setExchangeRate("1");
              }}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {TRANSACTION_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {currency !== "PLN" && (
            <div>
              <label className="text-xs font-medium text-muted">Kurs → PLN</label>
              <input
                type="text"
                inputMode="decimal"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Konto</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Kategoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="">— opcjonalnie —</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted">Opis</label>
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="np. zakupy spożywcze"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60 sm:w-auto sm:px-5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Zapisz
        </button>
      </form>
    </div>
  );
}
