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
import { BankFavicon } from "@/components/accounts/bank-favicon";
import { resolveInstitution } from "@/lib/accounts/bank-domains";
import { cn } from "@/lib/utils";

interface AccountCardAvatarProps {
  accountId: string;
  accountType: AccountType;
  accountName: string;
  hasPhoto?: boolean;
  photoUrl?: string | null;
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
  photoUrl = null,
  size = "md",
}: AccountCardAvatarProps) {
  const [url, setUrl] = useState<string | null>(photoUrl ?? null);
  const [loading, setLoading] = useState(hasPhoto && !photoUrl);

  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const Icon = typeIcon[accountType] ?? Landmark;
  const institution = resolveInstitution(accountName);

  useEffect(() => {
    if (photoUrl) {
      setUrl(photoUrl);
      setLoading(false);
      return;
    }
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
  }, [accountId, hasPhoto, photoUrl]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-black/5",
        accountType === "credit_card"
          ? "bg-gradient-to-br from-orange-100 to-amber-50"
          : "bg-slate-50",
        dim
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : url ? (
        <Image src={url} alt={accountName} fill className="object-cover" unoptimized />
      ) : institution ? (
        <BankFavicon accountName={accountName} size={size === "sm" ? 20 : 24} />
      ) : (
        <Icon
          className={cn(
            size === "sm" ? "h-4 w-4" : "h-5 w-5",
            accountType === "credit_card" ? "text-orange-500" : "text-slate-400"
          )}
        />
      )}
    </div>
  );
}
