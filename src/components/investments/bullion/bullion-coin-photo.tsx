"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2 } from "lucide-react";

interface BullionCoinPhotoProps {
  instrumentId: string;
  alt: string;
  className?: string;
}

export function BullionCoinPhoto({ instrumentId, alt, className }: BullionCoinPhotoProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/instruments/${instrumentId}/photo`);
        const data = await res.json();
        if (!cancelled) setUrl(data.url ?? null);
      } catch {
        if (!cancelled) setUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [instrumentId]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 text-amber-600 ${className ?? ""}`}
      >
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-50 to-slate-50 text-amber-500/70 ${className ?? ""}`}
      >
        <ImageIcon className="h-8 w-8" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Brak zdjęcia</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-50 ${className ?? ""}`}>
      <Image src={url} alt={alt} fill className="object-cover" unoptimized />
    </div>
  );
}
