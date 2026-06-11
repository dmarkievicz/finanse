"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

type FormType = "expense" | "income" | "transfer" | "exchange" | "adjustment";

interface TransactionCreateFormProps {
  accounts: { id: string; name: string; default_currency: string }[];
  categories: { id: string; name: string; type: string }[];
}

const TYPE_LABELS: Record<FormType, string> = {
  expense: "Wydatek",
  income: "Przychód",
  transfer: "Transfer",
  exchange: "Przewalutowanie",
  adjustment: "Korekta salda",
};

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
  const [sourceRate, setSourceRate] = useState("1");
  const [targetRate, setTargetRate] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cats = type === "income" ? incomeCategories : expenseCategories;
  const showCategory = type === "expense" || type === "income";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      date,
      type,
      details: details || undefined,
    };

    if (type === "exchange") {
      const parsedSource = Number(amount.replace(",", "."));
      const parsedTarget = Number(targetAmount.replace(",", "."));
      const parsedSourceRate = Number(sourceRate.replace(",", "."));
      const parsedTargetRate = Number(targetRate.replace(",", "."));
      if ([parsedSource, parsedTarget, parsedSourceRate, parsedTargetRate].some(Number.isNaN)) {
        setError("Niepoprawne kwoty lub kursy");
        setLoading(false);
        return;
      }
      payload.source_account_id = sourceAccountId;
      payload.target_account_id = targetAccountId;
      payload.source_amount = Math.abs(parsedSource);
      payload.target_amount = Math.abs(parsedTarget);
      payload.source_exchange_rate = parsedSourceRate;
      payload.target_exchange_rate = parsedTargetRate;
    } else {
      const parsedAmount = Number(amount.replace(",", "."));
      if (Number.isNaN(parsedAmount)) {
        setError("Niepoprawna kwota");
        setLoading(false);
        return;
      }
      payload.amount = type === "adjustment" ? parsedAmount : Math.abs(parsedAmount);

      if (type === "transfer") {
        payload.source_account_id = sourceAccountId;
        payload.target_account_id = targetAccountId;
      } else {
        payload.account_id = accountId;
      }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
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
        {type !== "exchange" && (
          <div>
            <label className="text-xs font-medium">
              {type === "adjustment" ? "Kwota korekty (+/−)" : "Kwota"}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={type === "adjustment" ? "+12500 lub -500" : "0.00"}
              required
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        )}

        {type === "transfer" || type === "exchange" ? (
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
                    {a.name}
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
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            {type === "exchange" && (
              <>
                <div>
                  <label className="text-xs font-medium">Kwota źródłowa (ujemna z konta)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="np. 100 EUR"
                    required
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Kurs źródłowy → PLN</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sourceRate}
                    onChange={(e) => setSourceRate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Kwota docelowa (na konto)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="np. 430 PLN"
                    required
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Kurs docelowy → PLN</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetRate}
                    onChange={(e) => setTargetRate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
          </>
        ) : (
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
