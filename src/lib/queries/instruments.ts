import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { sortByNamePl } from "@/lib/locale-sort";

export type InstrumentType =
  | "ETF"
  | "GOLD"
  | "BOND"
  | "DEPOSIT"
  | "CASH"
  | "REAL_ESTATE"
  | "LOAN"
  | "CRYPTO"
  | "OTHER";

export const INSTRUMENT_TYPE_ORDER: InstrumentType[] = [
  "ETF",
  "BOND",
  "DEPOSIT",
  "GOLD",
  "CRYPTO",
  "CASH",
  "REAL_ESTATE",
  "LOAN",
  "OTHER",
];

export const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  ETF: "ETF / akcje",
  GOLD: "Złoto",
  BOND: "Obligacje",
  DEPOSIT: "Lokata",
  CASH: "Gotówka inwest.",
  REAL_ESTATE: "Nieruchomość",
  LOAN: "Kredyt / pożyczka",
  CRYPTO: "Krypto",
  OTHER: "Inne",
};

export interface InstrumentRow {
  id: string;
  name: string;
  symbol: string | null;
  instrument_type: InstrumentType;
  currency: string;
  account_id: string | null;
  account_name: string | null;
  is_active: boolean;
  quantity: number;
  invested_pln: number;
  market_value_pln: number;
  pnl_pln: number;
  last_price: number | null;
  last_price_date: string | null;
}

export interface InstrumentDetail extends InstrumentRow {
  metadata: Record<string, unknown>;
  transactions: {
    id: string;
    date: string;
    type: string;
    quantity: number | null;
    price_per_unit: number | null;
    amount_pln: number;
    notes: string | null;
  }[];
  prices: {
    id: string;
    date: string;
    price: number;
    currency: string;
    source: string;
  }[];
}

function sumInvested(
  txs: { type: string; amount_pln: number; quantity: number | null }[]
): { quantity: number; invested: number } {
  let quantity = 0;
  let invested = 0;

  for (const tx of txs) {
    const amt = Number(tx.amount_pln);
    const qty = tx.quantity != null ? Number(tx.quantity) : 0;

    switch (tx.type) {
      case "buy":
        quantity += qty;
        invested += amt;
        break;
      case "sell":
        quantity -= qty;
        invested -= Math.abs(amt);
        break;
      case "dividend":
      case "coupon":
      case "interest":
        invested += amt;
        break;
      case "fee":
      case "tax":
        invested -= Math.abs(amt);
        break;
      default:
        invested += amt;
    }
  }

  return { quantity, invested };
}

function computeMarketValue(
  quantity: number,
  invested: number,
  lastPrice: number | null
): number {
  if (lastPrice != null && quantity !== 0) {
    return quantity * lastPrice;
  }
  return invested;
}

export async function fetchInstrumentsPortfolio(
  supabase: ServerSupabaseClient
): Promise<InstrumentRow[]> {
  const { data: instruments, error } = await supabase
    .from("instruments")
    .select("id, name, symbol, instrument_type, currency, account_id, is_active, accounts(name)")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  if (!instruments?.length) return [];

  const ids = instruments.map((i) => (i as { id: string }).id);

  const [txRes, priceRes] = await Promise.all([
    supabase
      .from("investment_transactions")
      .select("instrument_id, type, amount_pln, quantity")
      .in("instrument_id", ids)
      .is("deleted_at", null),
    supabase
      .from("instrument_prices")
      .select("instrument_id, date, price")
      .in("instrument_id", ids)
      .order("date", { ascending: false }),
  ]);

  if (txRes.error) throw txRes.error;
  if (priceRes.error) throw priceRes.error;

  const txsByInstrument = new Map<string, typeof txRes.data>();
  for (const tx of txRes.data ?? []) {
    const iid = (tx as { instrument_id: string }).instrument_id;
    if (!txsByInstrument.has(iid)) txsByInstrument.set(iid, []);
    txsByInstrument.get(iid)!.push(tx);
  }

  const latestPrice = new Map<string, { date: string; price: number }>();
  for (const p of priceRes.data ?? []) {
    const row = p as { instrument_id: string; date: string; price: number };
    if (!latestPrice.has(row.instrument_id)) {
      latestPrice.set(row.instrument_id, { date: row.date, price: Number(row.price) });
    }
  }

  return (instruments as {
    id: string;
    name: string;
    symbol: string | null;
    instrument_type: string;
    currency: string;
    account_id: string | null;
    is_active: boolean;
    accounts: { name: string } | null;
  }[]).map((inst) => {
    const txs = (txsByInstrument.get(inst.id) ?? []) as {
      type: string;
      amount_pln: number;
      quantity: number | null;
    }[];
    const { quantity, invested } = sumInvested(txs);
    const lp = latestPrice.get(inst.id);
    const market = computeMarketValue(quantity, invested, lp?.price ?? null);

    return {
      id: inst.id,
      name: inst.name,
      symbol: inst.symbol,
      instrument_type: inst.instrument_type as InstrumentType,
      currency: inst.currency,
      account_id: inst.account_id,
      account_name: inst.accounts?.name ?? null,
      is_active: inst.is_active,
      quantity,
      invested_pln: invested,
      market_value_pln: market,
      pnl_pln: market - invested,
      last_price: lp?.price ?? null,
      last_price_date: lp?.date ?? null,
    };
  }).sort((a, b) => {
    const typeCmp =
      INSTRUMENT_TYPE_ORDER.indexOf(a.instrument_type) -
      INSTRUMENT_TYPE_ORDER.indexOf(b.instrument_type);
    if (typeCmp !== 0) return typeCmp;
    return a.name.localeCompare(b.name, "pl", { sensitivity: "base" });
  });
}

export function groupInstrumentsByType(
  instruments: InstrumentRow[]
): { type: InstrumentType; label: string; items: InstrumentRow[]; total: number }[] {
  return INSTRUMENT_TYPE_ORDER.filter((type) =>
    instruments.some((i) => i.instrument_type === type)
  ).map((type) => {
    const items = sortByNamePl(
      instruments.filter((i) => i.instrument_type === type),
      (i) => i.name
    );
    return {
      type,
      label: INSTRUMENT_TYPE_LABELS[type],
      items,
      total: items.reduce((s, i) => s + i.market_value_pln, 0),
    };
  });
}

export async function fetchInstrumentDetail(
  supabase: ServerSupabaseClient,
  id: string
): Promise<InstrumentDetail | null> {
  const { data: inst, error } = await supabase
    .from("instruments")
    .select("*, accounts(name)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!inst) return null;

  const [txRes, priceRes] = await Promise.all([
    supabase
      .from("investment_transactions")
      .select("id, date, type, quantity, price_per_unit, amount_pln, notes")
      .eq("instrument_id", id)
      .is("deleted_at", null)
      .order("date", { ascending: false }),
    supabase
      .from("instrument_prices")
      .select("id, date, price, currency, source")
      .eq("instrument_id", id)
      .order("date", { ascending: false })
      .limit(20),
  ]);

  if (txRes.error) throw txRes.error;
  if (priceRes.error) throw priceRes.error;

  const row = inst as {
    id: string;
    name: string;
    symbol: string | null;
    instrument_type: string;
    currency: string;
    account_id: string | null;
    is_active: boolean;
    metadata: Record<string, unknown>;
    accounts: { name: string } | null;
  };

  const txs = (txRes.data ?? []) as {
    id: string;
    date: string;
    type: string;
    quantity: number | null;
    price_per_unit: number | null;
    amount_pln: number;
    notes: string | null;
  }[];

  const { quantity, invested } = sumInvested(txs);
  const prices = (priceRes.data ?? []) as {
    id: string;
    date: string;
    price: number;
    currency: string;
    source: string;
  }[];
  const lp = prices[0];
  const market = computeMarketValue(quantity, invested, lp ? Number(lp.price) : null);

  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    instrument_type: row.instrument_type as InstrumentType,
    currency: row.currency,
    account_id: row.account_id,
    account_name: row.accounts?.name ?? null,
    is_active: row.is_active,
    metadata: row.metadata ?? {},
    quantity,
    invested_pln: invested,
    market_value_pln: market,
    pnl_pln: market - invested,
    last_price: lp ? Number(lp.price) : null,
    last_price_date: lp?.date ?? null,
    transactions: txs.map((t) => ({
      ...t,
      quantity: t.quantity != null ? Number(t.quantity) : null,
      price_per_unit: t.price_per_unit != null ? Number(t.price_per_unit) : null,
      amount_pln: Number(t.amount_pln),
    })),
    prices: prices.map((p) => ({ ...p, price: Number(p.price) })),
  };
}
