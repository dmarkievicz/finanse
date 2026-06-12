"use client";

import { useState } from "react";
import { faviconUrl, resolveInstitution } from "@/lib/accounts/bank-domains";
import { cn } from "@/lib/utils";

interface BankFaviconProps {
  accountName: string;
  className?: string;
  size?: number;
}

export function BankFavicon({ accountName, className, size = 20 }: BankFaviconProps) {
  const institution = resolveInstitution(accountName);
  const [failed, setFailed] = useState(false);

  if (!institution || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrl(institution.domain, 64)}
      alt=""
      width={size}
      height={size}
      className={cn("rounded-sm object-contain", className)}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
    />
  );
}
