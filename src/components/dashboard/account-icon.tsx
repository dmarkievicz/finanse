import {
  AlertTriangle,
  Banknote,
  Building2,
  Coins,
  CreditCard,
  FileText,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AccountType } from "@/types/database";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  bank: { icon: Landmark, bg: "bg-blue-50", color: "text-blue-600" },
  cash: { icon: Wallet, bg: "bg-emerald-50", color: "text-emerald-600" },
  credit_card: { icon: CreditCard, bg: "bg-violet-50", color: "text-violet-600" },
  savings: { icon: PiggyBank, bg: "bg-amber-50", color: "text-amber-600" },
  investment: { icon: TrendingUp, bg: "bg-indigo-50", color: "text-indigo-600" },
  broker: { icon: TrendingUp, bg: "bg-indigo-50", color: "text-indigo-600" },
  deposit: { icon: Building2, bg: "bg-sky-50", color: "text-sky-600" },
  bond: { icon: FileText, bg: "bg-slate-100", color: "text-slate-600" },
  gold: { icon: Coins, bg: "bg-yellow-50", color: "text-yellow-600" },
  loan: { icon: AlertTriangle, bg: "bg-rose-50", color: "text-rose-600" },
  real_estate: { icon: Building2, bg: "bg-teal-50", color: "text-teal-600" },
  other: { icon: Wallet, bg: "bg-slate-100", color: "text-slate-500" },
};

function resolveStyle(accountType: string, accountName: string) {
  const name = accountName.toUpperCase();

  if (/XTB|MAKLER|BROKER|DEGIRO|IBKR/i.test(name)) {
    return TYPE_STYLES.broker;
  }
  if (/REVOLUT|WISE|N26|WALUT/i.test(name)) {
    return { icon: Banknote, bg: "bg-cyan-50", color: "text-cyan-600" };
  }
  if (/ZŁOTO|ZLOTO|GOLD|BULLION/i.test(name)) {
    return TYPE_STYLES.gold;
  }
  if (/OBLIGACJ/i.test(name)) {
    return TYPE_STYLES.bond;
  }
  if (/LOKAT|OSZCZĘD|OSZCZED/i.test(name)) {
    return TYPE_STYLES.savings;
  }

  return TYPE_STYLES[accountType] ?? TYPE_STYLES.other;
}

interface AccountIconProps {
  accountType: AccountType | string;
  accountName: string;
  size?: "sm" | "md";
  className?: string;
}

export function AccountIcon({
  accountType,
  accountName,
  size = "sm",
  className,
}: AccountIconProps) {
  const style = resolveStyle(accountType, accountName);
  const Icon = style.icon;
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconDim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        dim,
        style.bg,
        className
      )}
    >
      <Icon className={cn(iconDim, style.color)} />
    </div>
  );
}
