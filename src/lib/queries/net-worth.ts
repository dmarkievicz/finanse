import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { fetchInstrumentsPortfolio } from "@/lib/queries/instruments";
import type { BalanceMode } from "@/lib/supabase/rpc";

/** Majątek netto: konta (include_in_net_worth) + wartość instrumentów. */
export async function fetchTotalNetWorth(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  mode: BalanceMode = "current"
): Promise<number> {
  const { data: rpcNw, error: nwErr } = await supabase.rpc(
    "get_net_worth",
    { p_as_of_date: asOfDate, p_mode: mode } as never
  );
  if (nwErr) throw nwErr;

  const { error: instRpcErr } = await supabase.rpc("get_instruments_market_value_pln" as never);
  if (!instRpcErr) {
    return Number(rpcNw ?? 0);
  }

  const portfolio = await fetchInstrumentsPortfolio(supabase);
  const instrumentTotal = portfolio.reduce((s, i) => s + i.market_value_pln, 0);
  return Number(rpcNw ?? 0) + instrumentTotal;
}

export async function fetchInstrumentsMarketValue(
  supabase: ServerSupabaseClient
): Promise<number> {
  const { data, error } = await supabase.rpc("get_instruments_market_value_pln" as never);
  if (!error && data != null) return Number(data);

  const portfolio = await fetchInstrumentsPortfolio(supabase);
  return portfolio.reduce((s, i) => s + i.market_value_pln, 0);
}
