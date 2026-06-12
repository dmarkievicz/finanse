"use client";

import { useCallback, useEffect, useState } from "react";

export function useNbpRate(currency: string, date: string, enabled = true) {
  const [rate, setRate] = useState<string>("1");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const fetchRate = useCallback(async () => {
    if (!enabled || currency === "PLN") {
      setRate("1");
      setSource("pln");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/exchange-rates?currency=${encodeURIComponent(currency)}&date=${encodeURIComponent(date)}`
      );
      const data = await res.json();
      if (res.ok && data.rate) {
        setRate(String(data.rate));
        setSource(data.source ?? "nbp");
      }
    } finally {
      setLoading(false);
    }
  }, [currency, date, enabled]);

  useEffect(() => {
    void fetchRate();
  }, [fetchRate]);

  return { rate, setRate, loading, source, refresh: fetchRate };
}
