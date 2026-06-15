"use client";

import { useMemo, useState } from "react";
import { coinImageProxyPath } from "@/lib/gold/coin-image-sources";
import {
  localCoinImagePath,
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
  const local = localCoinAsset(series);
  const primary = series ? coinImageProxyPath(series) : imageUrl;

  const sources = useMemo(() => {
    const list: string[] = [local];
    if (primary && primary !== local) list.unshift(primary);
    return list;
  }, [primary, local]);

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
