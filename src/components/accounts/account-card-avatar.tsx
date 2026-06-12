"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Banknote,
  CreditCard,
  Landmark,
  Loader2,
  PiggyBank,
  Wallet,
} from "lucide-react";
import type { AccountType } from "@/types/database";
import { cn } from "@/lib/utils";

interface AccountCardAvatarProps {
  accountId: string;
  accountType: AccountType;
  accountName: string;
  hasPhoto?: boolean;
  size?: "sm" | "md";
}

const typeIcon: Partial<Record<AccountType, typeof Wallet>> = {
  bank: Landmark,
  cash: Wallet,
  credit_card: CreditCard,
  broker: PiggyBank,
  deposit: Banknote,
  loan: CreditCard,
};

export function AccountCardAvatar({
  accountId,
  accountType,
  accountName,
  hasPhoto = false,
  size = "md",
}: AccountCardAvatarProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(hasPhoto);

  const dim = size === "sm" ? "h-9 w-14" : "h-11 w-[4.5rem]";
  const Icon = typeIcon[accountType] ?? Landmark;

  useEffect(() => {
    if (!hasPhoto) {
      setLoading(false);
      setUrl(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts/${accountId}/photo`);
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
  }, [accountId, hasPhoto]);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5",
        accountType === "credit_card" ? "bg-gradient-to-br from-orange-100 to-amber-50" : "bg-slate-100",
        dim
      )}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        </div>
      ) : url ? (
        <Image src={url} alt={accountName} fill className="object-cover" unoptimized />
      ) : (
        <div
          className={cn(
            "flex h-full items-center justify-center",
            accountType === "credit_card" ? "text-orange-500" : "text-slate-400"
          )}
        >
          <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      )}
    </div>
  );
}
