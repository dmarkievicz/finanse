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
        setFetchedAt(data.spot.fetchedAt);
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
    <div className="mb-8 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/80 via-stone-900/90 to-stone-950 shadow-2xl shadow-amber-950/50">
      <div className="flex flex-wrap items-stretch">
        <div className="flex flex-1 flex-col justify-center border-b border-white/5 p-5 sm:border-b-0 sm:border-r">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-amber-400/80">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            Live · XAU / PLN
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-amber-50 sm:text-4xl">
            {loading && pricePerGram == null ? (
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            ) : pricePerGram != null ? (
              formatPln(pricePerGram)
            ) : (
              "—"
            )}
            {pricePerGram != null && (
              <span className="ml-2 text-base font-normal text-amber-200/60">/ g czystego</span>
            )}
          </p>
          {pricePerOz != null && (
            <p className="mt-1 text-[13px] tabular-nums text-stone-400">
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
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-medium text-stone-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Odśwież
          </button>
          <button
            type="button"
            onClick={() => void syncAllPrices()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2.5 text-[13px] font-semibold text-stone-950 shadow-lg shadow-amber-900/40 transition hover:from-amber-500 hover:to-amber-400 disabled:opacity-50"
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
      {error && <p className="border-t border-white/5 px-5 py-2 text-[12px] text-rose-400">{error}</p>}
    </div>
  );
}
