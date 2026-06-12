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
        className={`flex items-center justify-center bg-stone-900 text-amber-800 ${className ?? ""}`}
      >
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-950/50 to-stone-900 text-amber-800/60 ${className ?? ""}`}
      >
        <ImageIcon className="h-10 w-10" />
        <span className="text-[10px] uppercase tracking-wider">Au</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-stone-900 ${className ?? ""}`}>
      <Image src={url} alt={alt} fill className="object-cover" unoptimized />
    </div>
  );
}
