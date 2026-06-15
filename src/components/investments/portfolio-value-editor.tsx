"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatPln } from "@/lib/format";

interface PortfolioValueEditorProps {
  portfolioId: string;
  label: string;
  value: number | null;
  hint?: string;
}

export function PortfolioValueEditor({
  portfolioId,
  label,
  value,
  hint,
}: PortfolioValueEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual_market_value_pln: draft.trim() === "" ? null : Number(draft.replace(",", ".")),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setSaved(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm sm:px-5">
      <label className="block text-[13px] font-medium text-foreground">{label}</label>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
          placeholder={value != null ? formatPln(value) : "np. cena skupu"}
          className="min-w-[10rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Zapisz
        </button>
        {saved && <span className="text-[12px] text-emerald-600">Zapisano</span>}
      </div>
    </div>
  );
}
