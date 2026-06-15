"use client";

import { useMemo, useState } from "react";
import {
  localCoinImagePath,
  stockImageForSeries,
  type VaultCoinSeries,
} from "@/lib/gold/coin-stock-images";
import { cn } from "@/lib/utils";

function localCoinAsset(series: VaultCoinSeries | null | undefined): string {
  return localCoinImagePath(series ?? "kangaroo");
}

interface CoinVaultImageProps {
  series: VaultCoinSeries | null;
  imageUrl: string | null;
  alt: string;
  className?: string;
}

export function CoinVaultImage({ series, imageUrl, alt, className }: CoinVaultImageProps) {
  const remote = imageUrl ?? (series ? stockImageForSeries(series) : null);
  const local = localCoinAsset(series);

  const sources = useMemo(() => {
    const list: string[] = [local];
    if (remote && remote !== local) list.unshift(remote);
    return list;
  }, [remote, local]);

  const [index, setIndex] = useState(0);
  const src = sources[Math.min(index, sources.length - 1)] ?? local;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        setIndex((i) => (i + 1 < sources.length ? i + 1 : i));
      }}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
