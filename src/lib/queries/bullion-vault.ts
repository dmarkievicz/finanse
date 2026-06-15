import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  fineGoldGrams,
  parseGoldBullionMetadata,
  type GoldBullionMetadata,
} from "@/lib/gold/bullion-metadata";
import type { VaultCoinSeries } from "@/lib/gold/coin-stock-images";
import { coinImageProxyPath } from "@/lib/gold/coin-image-sources";
import {
  inferCoinSeriesFromName,
  VAULT_SERIES_COLUMNS,
  VAULT_SERIES_LABELS,
  VAULT_WEIGHT_ROWS,
} from "@/lib/gold/coin-stock-images";
import {
  fetchPortfolioByKind,
  portfolioKeyForVault,
  type InvestmentPortfolioRow,
} from "@/lib/queries/investment-portfolios";
import { ensureInvestmentPortfolios } from "@/lib/queries/investment-portfolios";

export interface VaultCoinItem {
  id: string;
  name: string;
  bullion: GoldBullionMetadata;
  fine_grams: number;
  purchase_price_pln: number;
  current_value_pln: number;
  pnl_pln: number;
  vault_row: number | null;
  vault_col: number | null;
  vault_slot: "grid" | "eagle";
  coin_series: VaultCoinSeries | null;
  image_url: string | null;
  mint: string | null;
}

export interface BullionVaultData {
  portfolio: InvestmentPortfolioRow | null;
  coins: VaultCoinItem[];
  eagle: VaultCoinItem | null;
  grid: (VaultCoinItem | null)[][];
  totalVaultPurchase: number;
  totalVaultCurrent: number;
}

function mapVaultCoin(
  inst: { id: string; name: string; metadata: Record<string, unknown> }
): VaultCoinItem | null {
  const meta = inst.metadata ?? {};
  const bullion =
    parseGoldBullionMetadata(meta) ??
    ({
      weight_grams: Number(meta.weight_grams ?? 1),
      purchase_price_pln: Number(meta.purchase_price_pln ?? 0),
    } as GoldBullionMetadata);

  const purchase = Number(meta.purchase_price_pln ?? bullion.purchase_price_pln ?? 0);
  const current = Number(meta.current_value_pln ?? purchase);
  const slot = meta.vault_slot === "eagle" ? "eagle" : "grid";

  const series =
    (meta.coin_series as VaultCoinSeries) ?? inferCoinSeriesFromName(inst.name);
  return {
    id: inst.id,
    name: inst.name,
    bullion,
    fine_grams: fineGoldGrams(bullion),
    purchase_price_pln: purchase,
    current_value_pln: current,
    pnl_pln: current - purchase,
    vault_row: meta.vault_row != null ? Number(meta.vault_row) : null,
    vault_col: meta.vault_col != null ? Number(meta.vault_col) : null,
    vault_slot: slot,
    coin_series: series,
    image_url: series ? coinImageProxyPath(series) : null,
    mint: bullion.mint ?? null,
  };
}

export async function fetchBullionVault(
  supabase: ServerSupabaseClient,
  userId: string,
  asOfDate?: string
): Promise<BullionVaultData> {
  await ensureInvestmentPortfolios(supabase, userId);
  const portfolio = await fetchPortfolioByKind(supabase, "gold", asOfDate);

  const portfolioId = portfolio ? portfolioKeyForVault(portfolio) : null;
  let coinsQuery = supabase
    .from("instruments")
    .select("id, name, metadata")
    .eq("instrument_type", "GOLD")
    .is("deleted_at", null)
    .eq("is_active", true)
    .filter("metadata->>vault_item", "eq", "true");

  if (portfolioId) {
    coinsQuery = coinsQuery.filter("metadata->>portfolio_id", "eq", portfolioId);
  }

  const { data: rows, error } = await coinsQuery;
  if (error) throw error;

  const coins = (rows ?? [])
    .map((r) =>
      mapVaultCoin(r as { id: string; name: string; metadata: Record<string, unknown> })
    )
    .filter((c): c is VaultCoinItem => c != null);

  const eagle = coins.find((c) => c.vault_slot === "eagle") ?? null;
  const gridCoins = coins.filter((c) => c.vault_slot === "grid");

  const grid: (VaultCoinItem | null)[][] = VAULT_WEIGHT_ROWS.map((row) =>
    [1, 2, 3, 4, 5].map((col) => {
      return (
        gridCoins.find((c) => c.vault_row === row.row && c.vault_col === col) ?? null
      );
    })
  );

  const totalVaultPurchase = coins.reduce((s, c) => s + c.purchase_price_pln, 0);
  const totalVaultCurrent = coins.reduce((s, c) => s + c.current_value_pln, 0);

  return {
    portfolio: portfolio ?? null,
    coins,
    eagle,
    grid,
    totalVaultPurchase,
    totalVaultCurrent,
  };
}

export { VAULT_SERIES_LABELS, VAULT_WEIGHT_ROWS };
