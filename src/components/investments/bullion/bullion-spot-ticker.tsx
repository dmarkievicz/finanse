"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { formatPln } from "@/lib/format";
import { TROY_OZ_GRAMS } from "@/lib/gold/bullion-metadata";
import { cn } from "@/lib/utils";

interface BullionSpotTickerProps {
  initialPricePerGram?: number | null;
  initialSource?: string | null;
  initialFetchedAt?: string | null;
}

export function BullionSpotTicker({
  initialPricePerGram,
  initialSource,
  initialFetchedAt,
}: BullionSpotTickerProps) {
  const router = useRouter();
  const [pricePerGram, setPricePerGram] = useState(initialPricePerGram);
  const [source, setSource] = useState(initialSource);
  const [fetchedAt, setFetchedAt] = useState(initialFetchedAt);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSpot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gold/spot");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setPricePerGram(data.pricePlnPerGram);
      setSource(data.source);
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pricePerGram == null) void refreshSpot();
    const interval = setInterval(() => void refreshSpot(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pricePerGram, refreshSpot]);

  async function syncAllPrices() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/gold/sync-prices", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      if (data.spot) {
        setPricePerGram(data.spot.pricePlnPerGram);
        setSource(data.spot.source);
        setFetchedAt(data.fetchedAt);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setSyncing(false);
    }
  }

  const pricePerOz = pricePerGram != null ? pricePerGram * TROY_OZ_GRAMS : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div
        className="flex flex-wrap items-stretch border-b border-border/60"
        style={{ background: "linear-gradient(90deg, #d9770614, transparent)" }}
      >
        <div className="flex flex-1 flex-col justify-center border-b border-border/60 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-amber-700">
            <Activity className="h-3.5 w-3.5" />
            Cena spot · XAU / PLN
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
            {loading && pricePerGram == null ? (
              <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
            ) : pricePerGram != null ? (
              formatPln(pricePerGram)
            ) : (
              "—"
            )}
            {pricePerGram != null && (
              <span className="ml-2 text-sm font-normal text-muted">/ g czystego</span>
            )}
          </p>
          {pricePerOz != null && (
            <p className="mt-1 text-[13px] tabular-nums text-muted">
              {formatPln(pricePerOz)} / uncja · {source}
              {fetchedAt && ` · ${new Date(fetchedAt).toLocaleTimeString("pl-PL")}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 p-4">
          <button
            type="button"
            onClick={() => void refreshSpot()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-foreground transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Odśwież
          </button>
          <button
            type="button"
            onClick={() => void syncAllPrices()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            Wycenij sejf
          </button>
        </div>
      </div>
      {error && (
        <p className="border-t border-border/60 px-4 py-2 text-[12px] text-red-600 sm:px-5">{error}</p>
      )}
    </div>
  );
}
