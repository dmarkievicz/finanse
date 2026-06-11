"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";

interface GoalFormProps {
  initial: {
    id: string | null;
    name: string;
    goal_type: string;
    target_amount: number;
    target_date: string;
  };
  currentNetWorth: number;
}

export function GoalForm({ initial, currentNetWorth }: GoalFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [targetAmount, setTargetAmount] = useState(String(initial.target_amount));
  const [targetDate, setTargetDate] = useState(initial.target_date);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          target_amount: Number(targetAmount),
          target_date: targetDate || null,
          goal_type: initial.goal_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");

      setMessage("Cel zapisany — zobacz postęp na pulpicie.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  const pct =
    Number(targetAmount) > 0
      ? Math.min(100, Math.round((currentNetWorth / Number(targetAmount)) * 100))
      : 0;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-medium">Cel finansowy</h2>
      </div>
      <p className="mt-1 text-xs text-muted">
        Aktualny majątek netto:{" "}
        <strong>{currentNetWorth.toLocaleString("pl-PL")} zł</strong> ({pct}% celu)
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted">Nazwa celu</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Kwota docelowa (PLN)</label>
            <input
              type="number"
              min={1}
              step={1000}
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Termin</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Zapisz cel
      </button>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </form>
  );
}
