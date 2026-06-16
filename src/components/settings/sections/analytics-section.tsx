"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  btnPrimary,
  inputClass,
  ProgressBar,
  SettingsDivider,
  SettingsGroup,
  SettingsPanel,
  StatusBadge,
} from "@/components/settings/settings-ui";

interface AnalyticsSectionProps {
  analysisStartDate: string | null;
  goal: {
    id: string | null;
    name: string;
    goal_type: string;
    target_amount: number;
    target_date: string;
  };
  currentNetWorth: number;
}

export function AnalyticsSection({
  analysisStartDate,
  goal,
  currentNetWorth,
}: AnalyticsSectionProps) {
  const router = useRouter();

  const [date, setDate] = useState(analysisStartDate ?? "2026-01-01");
  const [dateLoading, setDateLoading] = useState(false);
  const [dateMessage, setDateMessage] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(goal.target_amount));
  const [targetDate, setTargetDate] = useState(goal.target_date);
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalMessage, setGoalMessage] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  const target = Number(targetAmount);
  const pct = target > 0 ? Math.min(100, Math.round((currentNetWorth / target) * 100)) : 0;

  async function saveAnalysisStart(e: React.FormEvent) {
    e.preventDefault();
    setDateLoading(true);
    setDateMessage(null);
    setDateError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_start_date: date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
      setDateMessage("Data startu zapisana.");
      router.refresh();
    } catch (e) {
      setDateError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setDateLoading(false);
    }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    setGoalLoading(true);
    setGoalMessage(null);
    setGoalError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          target_amount: Number(targetAmount),
          target_date: targetDate || null,
          goal_type: goal.goal_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
      setGoalMessage("Cel zapisany — zobacz postęp na pulpicie.");
      router.refresh();
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setGoalLoading(false);
    }
  }

  return (
    <SettingsPanel
      title="Analizy finansowe"
      description="Okres analizy i cel majątku netto widoczny na pulpicie."
    >
      <SettingsGroup
        title="Data startu bieżących analiz"
        description="Od tej daty pulpit i majątek netto liczą saldo początkowe oraz transakcje po tej dacie."
      >
        <div className="px-4 py-4">
          <form onSubmit={saveAnalysisStart} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="analysis-start" className="text-xs font-medium text-foreground">
                Data startu
              </label>
              <input
                id="analysis-start"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} mt-1.5 w-full`}
                required
              />
            </div>
            <button type="submit" disabled={dateLoading} className={btnPrimary}>
              {dateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Zapisz
            </button>
          </form>
          {analysisStartDate && (
            <p className="mt-3 text-xs text-muted">
              Aktualna data startu:{" "}
              <span className="font-medium text-foreground">{analysisStartDate}</span>
              {" · "}
              <Link href="/accounts/opening" className="font-medium text-accent hover:underline">
                Ustaw salda początkowe
              </Link>
            </p>
          )}
          {dateMessage && <p className="mt-2 text-xs text-emerald-700">{dateMessage}</p>}
          {dateError && <p className="mt-2 text-xs text-red-600">{dateError}</p>}
        </div>
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup title="Cel finansowy" description="Postęp względem wybranego celu majątku netto.">
        <div className="px-4 py-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm tabular-nums text-foreground">
              {currentNetWorth.toLocaleString("pl-PL")} zł
              <span className="text-muted"> / </span>
              {target.toLocaleString("pl-PL")} zł
            </p>
            <StatusBadge tone="neutral">{pct}% realizacji</StatusBadge>
          </div>
          <ProgressBar value={pct} />

          <form onSubmit={saveGoal} className="mt-4 space-y-3">
            <div>
              <label htmlFor="goal-name" className="text-xs font-medium text-foreground">
                Nazwa celu
              </label>
              <input
                id="goal-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} mt-1.5 w-full`}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="goal-amount" className="text-xs font-medium text-foreground">
                  Kwota docelowa (PLN)
                </label>
                <input
                  id="goal-amount"
                  type="number"
                  min={1}
                  step={1000}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className={`${inputClass} mt-1.5 w-full`}
                  required
                />
              </div>
              <div>
                <label htmlFor="goal-date" className="text-xs font-medium text-foreground">
                  Termin
                </label>
                <input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={`${inputClass} mt-1.5 w-full`}
                />
              </div>
            </div>
            <button type="submit" disabled={goalLoading} className={btnPrimary}>
              {goalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Zapisz cel
            </button>
          </form>
          {goalMessage && <p className="mt-2 text-xs text-emerald-700">{goalMessage}</p>}
          {goalError && <p className="mt-2 text-xs text-red-700">{goalError}</p>}
        </div>
      </SettingsGroup>
    </SettingsPanel>
  );
}
