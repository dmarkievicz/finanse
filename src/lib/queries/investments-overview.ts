import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { formatPln } from "@/lib/format";
import {
  type AllocationSlice,
  INVESTMENT_CATEGORY_ORDER,
  fetchInvestments,
  type InvestmentPosition,
} from "@/lib/queries/investments";
import {
  ensureInvestmentPortfolios,
  fetchInvestmentPortfolios,
  type InvestmentPortfolioRow,
} from "@/lib/queries/investment-portfolios";
import { fetchInstrumentsPortfolio, type InstrumentRow } from "@/lib/queries/instruments";
import type { PortfolioKind } from "@/lib/investments/portfolio-kinds";

export interface UnifiedInvestmentItem {
  id: string;
  name: string;
  category: string;
  categoryColor: string;
  value_pln: number;
  invested_pln: number | null;
  pnl_pln: number | null;
  subtitle: string | null;
  href: string | null;
}

export interface InvestmentCategoryGroup {
  category: string;
  color: string;
  items: UnifiedInvestmentItem[];
  total: number;
}

export interface InvestmentsOverviewData {
  totalPln: number;
  positionCount: number;
  allocation: AllocationSlice[];
  groups: InvestmentCategoryGroup[];
  asOfDate: string;
}

const PORTFOLIO_CATEGORY: Record<
  PortfolioKind,
  { name: string; color: string; href: string }
> = {
  gold: { name: "Złoto", color: "#d97706", href: "/investments/bullion" },
  lego: { name: "LEGO", color: "#be123c", href: "/investments/collectibles" },
  etf: { name: "ETF / akcje", color: "#1e3a5f", href: "/investments/etf" },
};

const INSTRUMENT_CATEGORY: Record<string, { name: string; color: string }> = {
  ETF: { name: "ETF / akcje", color: "#1e3a5f" },
  BOND: { name: "Obligacje", color: "#0d9488" },
  DEPOSIT: { name: "Lokaty", color: "#3b82f6" },
  GOLD: { name: "Złoto", color: "#d97706" },
  COLLECTIBLE: { name: "LEGO", color: "#be123c" },
  CRYPTO: { name: "Krypto", color: "#ec4899" },
};

async function fetchVaultInstrumentIds(
  supabase: ServerSupabaseClient
): Promise<Set<string>> {
  const { data } = await supabase
    .from("instruments")
    .select("id")
    .is("deleted_at", null)
    .filter("metadata->>vault_item", "eq", "true");

  return new Set((data ?? []).map((r) => (r as { id: string }).id));
}

function portfolioToItem(p: InvestmentPortfolioRow): UnifiedInvestmentItem {
  const meta = PORTFOLIO_CATEGORY[p.portfolio_kind];
  return {
    id: `portfolio-${p.id}`,
    name: p.display_name,
    category: meta.name,
    categoryColor: meta.color,
    value_pln: p.market_value_pln,
    invested_pln: p.transfer_net_pln,
    pnl_pln: p.pnl_pln,
    subtitle: `Z transferów: ${formatPln(p.transfer_net_pln)}`,
    href: meta.href,
  };
}

function accountToItem(p: InvestmentPosition): UnifiedInvestmentItem {
  return {
    id: `account-${p.account_id}`,
    name: p.account_name,
    category: p.category,
    categoryColor: p.categoryColor,
    value_pln: p.balance_pln,
    invested_pln: null,
    pnl_pln: null,
    subtitle: p.currency,
    href: `/transactions?account=${p.account_id}`,
  };
}

function instrumentToItem(inst: InstrumentRow): UnifiedInvestmentItem {
  const cat = INSTRUMENT_CATEGORY[inst.instrument_type] ?? {
    name: "Inne",
    color: "#94a3b8",
  };
  return {
    id: `instrument-${inst.id}`,
    name: inst.name,
    category: cat.name,
    categoryColor: cat.color,
    value_pln: inst.market_value_pln,
    invested_pln: inst.invested_pln,
    pnl_pln: inst.pnl_pln,
    subtitle: inst.symbol ?? inst.account_name,
    href: `/investments/${inst.id}`,
  };
}

function buildGroups(items: UnifiedInvestmentItem[]): InvestmentCategoryGroup[] {
  const map = new Map<string, { color: string; items: UnifiedInvestmentItem[] }>();

  for (const item of items) {
    const cur = map.get(item.category) ?? { color: item.categoryColor, items: [] };
    cur.items.push(item);
    map.set(item.category, cur);
  }

  return INVESTMENT_CATEGORY_ORDER.filter((cat) => map.has(cat)).map((category) => {
    const g = map.get(category)!;
    return {
      category,
      color: g.color,
      items: g.items.sort((a, b) => a.name.localeCompare(b.name, "pl")),
      total: g.items.reduce((s, i) => s + i.value_pln, 0),
    };
  });
}

function buildAllocation(groups: InvestmentCategoryGroup[]): AllocationSlice[] {
  const total = groups.reduce((s, g) => s + g.total, 0);
  if (total === 0) return [];

  return groups
    .filter((g) => g.total > 0)
    .map((g) => ({
      name: g.category,
      total: g.total,
      pct: Math.round((g.total / total) * 100),
      color: g.color,
    }));
}

export async function fetchInvestmentsOverview(
  supabase: ServerSupabaseClient
): Promise<InvestmentsOverviewData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalPln: 0,
      positionCount: 0,
      allocation: [],
      groups: [],
      asOfDate: new Date().toISOString().slice(0, 10),
    };
  }

  await ensureInvestmentPortfolios(supabase, user.id);

  const [accountData, portfolios, instruments, vaultIds] = await Promise.all([
    fetchInvestments(supabase),
    fetchInvestmentPortfolios(supabase),
    fetchInstrumentsPortfolio(supabase),
    fetchVaultInstrumentIds(supabase),
  ]);

  const portfolioKinds = new Set(portfolios.map((p) => p.portfolio_kind));

  const items: UnifiedInvestmentItem[] = [
    ...portfolios.map(portfolioToItem),
    ...accountData.positions
      .filter((p) => {
        if (p.category === "ETF / akcje" && portfolioKinds.has("etf")) {
          return !/^etf$/i.test(p.account_name.trim());
        }
        return true;
      })
      .map(accountToItem),
    ...instruments
      .filter((i) => !vaultIds.has(i.id))
      .filter((i) => {
        if (i.instrument_type === "GOLD" && portfolioKinds.has("gold")) return false;
        if (
          (i.instrument_type === "COLLECTIBLE" || i.instrument_type === "OTHER") &&
          portfolioKinds.has("lego")
        ) {
          return false;
        }
        return true;
      })
      .map(instrumentToItem),
  ];

  const groups = buildGroups(items);
  const totalPln = groups.reduce((s, g) => s + g.total, 0);

  return {
    totalPln,
    positionCount: items.length,
    allocation: buildAllocation(groups),
    groups,
    asOfDate: accountData.asOfDate,
  };
}
