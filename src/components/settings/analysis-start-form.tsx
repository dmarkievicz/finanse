"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Loader2 } from "lucide-react";

interface AnalysisStartFormProps {
  initialDate: string | null;
}

export function AnalysisStartForm({ initialDate }: AnalysisStartFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate ?? "2026-01-01");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_start_date: date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");

      setMessage("Data startu zapisana. Ustaw teraz salda początkowe aktywnych kont.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-medium">Data startu bieżących analiz</h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        Od tej daty pulpit i majątek netto liczą salda początkowe + transakcje po tej dacie.
        Pełna historia importu z Excela pozostaje dostępna w transakcjach.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground">Data startu</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Zapisz datę startu
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {initialDate && (
        <p className="mt-3 text-sm text-muted">
          Aktualna data startu: <strong>{initialDate}</strong>.{" "}
          <Link href="/accounts/opening" className="font-medium text-accent hover:underline">
            Ustaw salda początkowe →
          </Link>
        </p>
      )}
    </div>
  );
}
