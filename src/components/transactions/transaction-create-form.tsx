"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { TRANSACTION_CURRENCIES } from "@/lib/transactions/currencies";

type FormType = "expense" | "income" | "transfer";

interface AccountOption {
  id: string;
  name: string;
  default_currency: string;
}

interface TransactionCreateFormProps {
  accounts: AccountOption[];
  categories: { id: string; name: string; type: string }[];
}

const TYPE_LABELS: Record<FormType, string> = {
  expense: "Wydatek",
  income: "Przychód",
  transfer: "Transfer",
};

function CurrencyRateFields({
  currency,
  exchangeRate,
  onCurrency,
  onRate,
  idPrefix,
}: {
  currency: string;
  exchangeRate: string;
  onCurrency: (v: string) => void;
  onRate: (v: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="text-xs font-medium" htmlFor={`${idPrefix}-currency`}>
          Waluta
        </label>
        <select
          id={`${idPrefix}-currency`}
          value={currency}
          onChange={(e) => onCurrency(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          {TRANSACTION_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium" htmlFor={`${idPrefix}-rate`}>
          Kurs → PLN
        </label>
        <input
          id={`${idPrefix}-rate`}
          type="text"
          inputMode="decimal"
          value={exchangeRate}
          onChange={(e) => onRate(e.target.value)}
          disabled={currency === "PLN"}
          required={currency !== "PLN"}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-slate-50"
        />
      </div>
    </div>
  );
}

export function TransactionCreateForm({ accounts, categories }: TransactionCreateFormProps) {
  const router = useRouter();
  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both");
  const incomeCategories = categories.filter((c) => c.type === "income" || c.type === "both");

  const [type, setType] = useState<FormType>("expense");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id ?? "");
  const [targetAccountId, setTargetAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState(accounts[0]?.default_currency ?? "PLN");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [sourceCurrency, setSourceCurrency] = useState(accounts[0]?.default_currency ?? "PLN");
  const [sourceRate, setSourceRate] = useState("1");
  const [targetCurrency, setTargetCurrency] = useState(
    accounts[1]?.default_currency ?? accounts[0]?.default_currency ?? "PLN"
  );
  const [targetRate, setTargetRate] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
  const targetAccount = accounts.find((a) => a.id === targetAccountId);
  const crossCurrencyTransfer = useMemo(
    () => sourceCurrency !== targetCurrency,
    [sourceCurrency, targetCurrency]
  );

  const cats = type === "income" ? incomeCategories : expenseCategories;
  const showCategory = type === "expense" || type === "income";

  useEffect(() => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) {
      setCurrency(acc.default_currency);
      setExchangeRate(acc.default_currency === "PLN" ? "1" : exchangeRate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, accounts]);

  useEffect(() => {
    if (sourceAccount) {
      setSourceCurrency(sourceAccount.default_currency);
      if (sourceAccount.default_currency === "PLN") setSourceRate("1");
    }
  }, [sourceAccount]);

  useEffect(() => {
    if (targetAccount) {
      setTargetCurrency(targetAccount.default_currency);
      if (targetAccount.default_currency === "PLN") setTargetRate("1");
    }
  }, [targetAccount]);

  function handleCurrencyChange(value: string) {
    setCurrency(value);
    if (value === "PLN") setExchangeRate("1");
  }

  function handleSourceCurrencyChange(value: string) {
    setSourceCurrency(value);
    if (value === "PLN") setSourceRate("1");
  }

  function handleTargetCurrencyChange(value: string) {
    setTargetCurrency(value);
    if (value === "PLN") setTargetRate("1");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      date,
      type,
      details: details || undefined,
    };

    if (type === "transfer") {
      const parsedSource = Number(amount.replace(",", "."));
      const parsedSourceRate = Number(sourceRate.replace(",", "."));
      if (Number.isNaN(parsedSource) || parsedSource <= 0) {
        setError("Podaj poprawną kwotę z konta źródłowego");
        setLoading(false);
        return;
      }
      const parsedTarget = crossCurrencyTransfer
        ? Number(targetAmount.replace(",", "."))
        : parsedSource;
      const parsedTargetRate = Number(targetRate.replace(",", "."));
      if (
        [parsedTarget, parsedSourceRate, parsedTargetRate].some(
          (n) => Number.isNaN(n) || n <= 0
        )
      ) {
        setError("Niepoprawne kwoty lub kursy");
        setLoading(false);
        return;
      }
      payload.source_account_id = sourceAccountId;
      payload.target_account_id = targetAccountId;
      payload.amount = parsedSource;
      payload.target_amount = parsedTarget;
      payload.source_currency = sourceCurrency;
      payload.target_currency = targetCurrency;
      payload.source_exchange_rate = parsedSourceRate;
      payload.target_exchange_rate = parsedTargetRate;
    } else {
      const parsedAmount = Number(amount.replace(",", "."));
      const parsedRate = Number(exchangeRate.replace(",", "."));
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        setError("Podaj poprawną kwotę");
        setLoading(false);
        return;
      }
      if (currency !== "PLN" && (Number.isNaN(parsedRate) || parsedRate <= 0)) {
        setError("Podaj kurs wymiany do PLN");
        setLoading(false);
        return;
      }
      payload.amount = parsedAmount;
      payload.account_id = accountId;
      payload.currency = currency;
      payload.exchange_rate = currency === "PLN" ? 1 : parsedRate;
    }

    if (showCategory && categoryId) {
      payload.category_id = categoryId;
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      router.push(`/transactions/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as FormType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setCategoryId("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              type === t ? "bg-primary text-white" : "border border-border"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        {type !== "transfer" ? (
          <>
            <div>
              <label className="text-xs font-medium">Kwota</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Konto</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.default_currency})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <CurrencyRateFields
                idPrefix="tx"
                currency={currency}
                exchangeRate={exchangeRate}
                onCurrency={handleCurrencyChange}
                onRate={setExchangeRate}
              />
            </div>
          </>
        ) : (
          <>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Z konta</label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.default_currency})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Na konto</label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.default_currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Kwota z konta źródłowego</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            {crossCurrencyTransfer && (
              <div>
                <label className="text-xs font-medium">Kwota na konto docelowe</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
            )}
            {(sourceCurrency !== "PLN" || crossCurrencyTransfer) && (
              <div className="sm:col-span-2 space-y-3 rounded-lg border border-border/60 bg-slate-50/50 p-3">
                <p className="text-xs font-medium text-muted">Strona źródłowa</p>
                <CurrencyRateFields
                  idPrefix="src"
                  currency={sourceCurrency}
                  exchangeRate={sourceRate}
                  onCurrency={handleSourceCurrencyChange}
                  onRate={setSourceRate}
                />
              </div>
            )}
            {crossCurrencyTransfer && (
              <div className="sm:col-span-2 space-y-3 rounded-lg border border-border/60 bg-slate-50/50 p-3">
                <p className="text-xs font-medium text-muted">Strona docelowa</p>
                <CurrencyRateFields
                  idPrefix="tgt"
                  currency={targetCurrency}
                  exchangeRate={targetRate}
                  onCurrency={handleTargetCurrencyChange}
                  onRate={setTargetRate}
                />
              </div>
            )}
          </>
        )}

        {showCategory && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Kategoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="">— auto / brak —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Opis</label>
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !accounts.length}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Dodaj transakcję
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
