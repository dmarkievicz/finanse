import type { AccountBalance } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcAccountBalances } from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { sortByNamePl } from "@/lib/locale-sort";
import { isAssetLedgerAccount } from "@/lib/accounts/classification";

export interface InvestmentPosition {
  account_id: string;
  account_name: string;
  account_type: string;
  currency: string;
  balance_pln: number;
  category: string;
  categoryColor: string;
}

export interface AllocationSlice {
  name: string;
  pct: number;
  total: number;
  color: string;
}

export interface InvestmentsPageData {
  totalPln: number;
  positions: InvestmentPosition[];
  allocation: AllocationSlice[];
  asOfDate: string;
}

const INVESTMENT_NAME_PATTERNS =
  /lokat|obligac|xtb|inwestycj|pzu|ikze|krypto|robo-doradca|etf|bos/i;

export const INVESTMENT_CATEGORY_ORDER = [
  "ETF / akcje",
  "Obligacje",
  "Lokaty",
  "Złoto",
  "LEGO",
  "Ubezpieczenia",
  "Krypto",
  "Inne",
] as const;

const CATEGORY_RULES: { pattern: RegExp; name: string; color: string }[] = [
  { pattern: /xtb|etf|ikze|robo/i, name: "ETF / akcje", color: "#1e3a5f" },
  { pattern: /obligac/i, name: "Obligacje", color: "#0d9488" },
  { pattern: /lokat/i, name: "Lokaty", color: "#3b82f6" },
  { pattern: /\bzłoto\b|\bzlot\b/i, name: "Złoto", color: "#d97706" },
  { pattern: /^lego$/i, name: "LEGO", color: "#be123c" },
  { pattern: /pzu/i, name: "Ubezpieczenia", color: "#8b5cf6" },
  { pattern: /krypto/i, name: "Krypto", color: "#ec4899" },
];

function inferCategory(name: string): { name: string; color: string } {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(name)) return { name: rule.name, color: rule.color };
  }
  return { name: "Inne", color: "#94a3b8" };
}

function isInvestmentAccount(acc: AccountBalance): boolean {
  if (isAssetLedgerAccount(acc.account_name)) return false;
  if (acc.account_type === "investment" || acc.account_type === "broker" || acc.account_type === "deposit") {
    return true;
  }
  return INVESTMENT_NAME_PATTERNS.test(acc.account_name);
}

function buildAllocation(positions: InvestmentPosition[]): AllocationSlice[] {
  const byCategory = new Map<string, { total: number; color: string }>();
  for (const p of positions) {
    const cur = byCategory.get(p.category) ?? { total: 0, color: p.categoryColor };
    cur.total += p.balance_pln;
    byCategory.set(p.category, cur);
  }

  const total = [...byCategory.values()].reduce((s, c) => s + c.total, 0);
  if (total === 0) return [];

  return [...byCategory.entries()]
    .map(([name, { total: t, color }]) => ({
      name,
      total: t,
      pct: Math.round((t / total) * 100),
      color,
    }))
    .sort(
      (a, b) =>
        INVESTMENT_CATEGORY_ORDER.indexOf(a.name as (typeof INVESTMENT_CATEGORY_ORDER)[number]) -
        INVESTMENT_CATEGORY_ORDER.indexOf(b.name as (typeof INVESTMENT_CATEGORY_ORDER)[number])
    );
}

export function groupPositionsByCategory(
  positions: InvestmentPosition[]
): { category: string; color: string; items: InvestmentPosition[]; total: number }[] {
  const groups = new Map<string, { color: string; items: InvestmentPosition[] }>();

  for (const p of sortByNamePl(positions, (x) => x.account_name)) {
    const cur = groups.get(p.category) ?? { color: p.categoryColor, items: [] };
    cur.items.push(p);
    groups.set(p.category, cur);
  }

  return INVESTMENT_CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((category) => {
    const g = groups.get(category)!;
    return {
      category,
      color: g.color,
      items: g.items,
      total: g.items.reduce((s, i) => s + i.balance_pln, 0),
    };
  });
}

export async function fetchInvestments(
  supabase: ServerSupabaseClient,
  asOfDate = new Date().toISOString().slice(0, 10)
): Promise<InvestmentsPageData> {
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);
  const balances = await rpcAccountBalances(supabase, asOfDate, mode);

  const positions: InvestmentPosition[] = sortByNamePl(
    balances.filter(isInvestmentAccount).map((acc) => {
      const cat = inferCategory(acc.account_name);
      return {
        account_id: acc.account_id,
        account_name: acc.account_name,
        account_type: acc.account_type,
        currency: acc.currency,
        balance_pln: Number(acc.balance_pln),
        category: cat.name,
        categoryColor: cat.color,
      };
    }),
    (p) => p.account_name
  );

  const totalPln = positions.reduce((s, p) => s + p.balance_pln, 0);

  return {
    totalPln,
    positions,
    allocation: buildAllocation(positions),
    asOfDate,
  };
}
