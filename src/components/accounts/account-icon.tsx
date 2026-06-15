import {
  Banknote,
  ChartCandlestick,
  Coins,
  CreditCard,
  FileText,
  Globe,
  Landmark,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountGroupId } from "@/lib/accounts/account-sections";
import type { AccountType } from "@/types/database";
import { resolveInstitution } from "@/lib/accounts/bank-domains";
import { cn } from "@/lib/utils";
import { BankFavicon } from "@/components/accounts/bank-favicon";

interface AccountIconProps {
  accountName: string;
  accountType: AccountType;
  groupId?: AccountGroupId;
  size?: "sm" | "md";
  showFavicon?: boolean;
}

const typeConfig: Record<
  AccountType,
  { icon: LucideIcon; bg: string; color: string }
> = {
  bank: { icon: Landmark, bg: "bg-blue-50", color: "text-blue-600" },
  cash: { icon: Wallet, bg: "bg-emerald-50", color: "text-emerald-600" },
  credit_card: { icon: CreditCard, bg: "bg-orange-50", color: "text-orange-600" },
  broker: { icon: TrendingUp, bg: "bg-indigo-50", color: "text-indigo-600" },
  deposit: { icon: Percent, bg: "bg-sky-50", color: "text-sky-600" },
  investment: { icon: ChartCandlestick, bg: "bg-indigo-50", color: "text-indigo-700" },
  loan: { icon: FileText, bg: "bg-red-50", color: "text-red-600" },
  real_estate: { icon: Landmark, bg: "bg-slate-100", color: "text-slate-600" },
  other: { icon: Coins, bg: "bg-slate-100", color: "text-slate-500" },
};

const groupConfig: Record<AccountGroupId, { icon: LucideIcon; bg: string; color: string }> =
  {
    bank: { icon: Landmark, bg: "bg-blue-50", color: "text-blue-600" },
    credit_card: { icon: CreditCard, bg: "bg-orange-50", color: "text-orange-600" },
    foreign: { icon: Globe, bg: "bg-violet-50", color: "text-violet-600" },
    cash: { icon: Wallet, bg: "bg-emerald-50", color: "text-emerald-600" },
    loan: { icon: FileText, bg: "bg-red-50", color: "text-red-600" },
    investments: { icon: TrendingUp, bg: "bg-indigo-50", color: "text-indigo-700" },
    other: { icon: Coins, bg: "bg-slate-100", color: "text-slate-600" },
  };

function iconFromName(name: string): { icon: LucideIcon; bg: string; color: string } | null {
  if (/obligac/i.test(name)) {
    return { icon: FileText, bg: "bg-amber-50", color: "text-amber-700" };
  }
  if (/lokat/i.test(name)) {
    return { icon: Banknote, bg: "bg-sky-50", color: "text-sky-700" };
  }
  if (/\bzłoto\b|\bzlot\b/i.test(name)) {
    return { icon: Coins, bg: "bg-amber-50", color: "text-amber-600" };
  }
  if (/portfel|gotówk/i.test(name)) {
    return { icon: Wallet, bg: "bg-emerald-50", color: "text-emerald-600" };
  }
  return null;
}

export function AccountIcon({
  accountName,
  accountType,
  groupId,
  size = "md",
  showFavicon = true,
}: AccountIconProps) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const institution = showFavicon ? resolveInstitution(accountName) : null;

  const cfg =
    iconFromName(accountName) ??
    (groupId ? groupConfig[groupId] : null) ??
    typeConfig[accountType] ??
    typeConfig.other;

  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl",
        cfg.bg,
        dim
      )}
    >
      {institution ? (
        <BankFavicon accountName={accountName} size={size === "sm" ? 18 : 22} />
      ) : (
        <Icon className={cn(iconSize, cfg.color)} />
      )}
    </div>
  );
}
