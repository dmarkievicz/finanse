import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { parseAccountMetadata } from "@/lib/accounts/account-metadata";
import {
  PORTFOLIO_KIND_LABELS,
  inferPortfolioKindFromAccountName,
  type PortfolioKind,
} from "@/lib/investments/portfolio-kinds";

export interface InvestmentPortfolioRow {
  id: string;
  portfolio_kind: PortfolioKind;
  display_name: string;
  ledger_account_id: string;
  ledger_account_name: string;
  transfer_net_pln: number;
  manual_market_value_pln: number | null;
  vault_current_value_pln: number;
  vault_purchase_value_pln: number;
  market_value_pln: number;
  pnl_pln: number;
  has_mismatch: boolean;
  mismatch_pln: number;
}

interface PortfolioSource {
  id: string;
  portfolio_kind: PortfolioKind;
  display_name: string;
  ledger_account_id: string;
  ledger_account_name: string;
  manual_market_value_pln: number | null;
}

async function transferNetPln(
  supabase: ServerSupabaseClient,
  ledgerAccountId: string,
  asOfDate: string
): Promise<number> {
  const { data: transferNet, error: transferErr } = await supabase.rpc(
    "get_ledger_transfer_net_pln",
    {
      p_ledger_account_id: ledgerAccountId,
      p_as_of_date: asOfDate,
    } as never
  );

  if (!transferErr && transferNet != null) return Number(transferNet);

  const { data: entries } = await supabase
    .from("transaction_entries")
    .select("amount_pln, transactions!inner(type, date, deleted_at)")
    .eq("account_id", ledgerAccountId)
    .eq("transactions.type", "transfer")
    .is("transactions.deleted_at", null)
    .lte("transactions.date", asOfDate);

  return (entries ?? []).reduce(
    (s, e) => s + Number((e as { amount_pln: number }).amount_pln),
    0
  );
}

async function fetchVaultSums(
  supabase: ServerSupabaseClient,
  portfolioKey: string
): Promise<{ current: number; purchase: number }> {
  const { data, error } = await supabase
    .from("instruments")
    .select("metadata")
    .eq("instrument_type", "GOLD")
    .is("deleted_at", null)
    .eq("is_active", true)
    .filter("metadata->>vault_item", "eq", "true");

  if (error) throw error;

  let current = 0;
  let purchase = 0;
  for (const row of data ?? []) {
    const meta = (row as { metadata: Record<string, unknown> }).metadata ?? {};
    const pid = String(meta.portfolio_id ?? "");
    if (pid !== portfolioKey) continue;
    const purchasePrice = Number(meta.purchase_price_pln ?? 0);
    const currentValue = Number(meta.current_value_pln ?? purchasePrice);
    purchase += purchasePrice;
    current += currentValue;
  }
  return { current, purchase };
}

async function loadPortfolioSources(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<PortfolioSource[]> {
  const { data: fromTable, error: tableErr } = await supabase
    .from("investment_portfolios")
    .select(
      "id, portfolio_kind, display_name, manual_market_value_pln, ledger_account_id, accounts(name)"
    )
    .is("deleted_at", null)
    .order("display_name");

  if (!tableErr && fromTable?.length) {
    return fromTable.map((p) => {
      const row = p as {
        id: string;
        portfolio_kind: PortfolioKind;
        display_name: string;
        manual_market_value_pln: number | null;
        ledger_account_id: string;
        accounts: { name: string } | null;
      };
      return {
        id: row.id,
        portfolio_kind: row.portfolio_kind,
        display_name: row.display_name || PORTFOLIO_KIND_LABELS[row.portfolio_kind],
        ledger_account_id: row.ledger_account_id,
        ledger_account_name: row.accounts?.name ?? "",
        manual_market_value_pln:
          row.manual_market_value_pln != null
            ? Number(row.manual_market_value_pln)
            : null,
      };
    });
  }

  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, metadata")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (accErr) throw accErr;

  const sources: PortfolioSource[] = [];
  for (const acc of accounts ?? []) {
    const name = (acc as { name: string }).name;
    const kind = inferPortfolioKindFromAccountName(name);
    if (!kind) continue;
    const meta = parseAccountMetadata(
      (acc as { metadata: Record<string, unknown> | null }).metadata
    );
    const manualRaw = (meta as Record<string, unknown>).manual_market_value_pln;
    sources.push({
      id: (acc as { id: string }).id,
      portfolio_kind: kind,
      display_name: PORTFOLIO_KIND_LABELS[kind],
      ledger_account_id: (acc as { id: string }).id,
      ledger_account_name: name,
      manual_market_value_pln:
        manualRaw != null && manualRaw !== "" ? Number(manualRaw) : null,
    });
  }
  return sources;
}

function buildPortfolioRow(
  source: PortfolioSource,
  transfer_net_pln: number,
  vault: { current: number; purchase: number }
): InvestmentPortfolioRow {
  const manual = source.manual_market_value_pln;
  const market_value_pln =
    manual ??
    (source.portfolio_kind === "gold" && vault.current > 0 ? vault.current : 0);

  const mismatch_pln = Math.abs(transfer_net_pln - vault.purchase);
  const has_mismatch =
    source.portfolio_kind === "gold" && vault.purchase > 0 && mismatch_pln > 1;

  return {
    id: source.id,
    portfolio_kind: source.portfolio_kind,
    display_name: source.display_name,
    ledger_account_id: source.ledger_account_id,
    ledger_account_name: source.ledger_account_name,
    transfer_net_pln,
    manual_market_value_pln: manual,
    vault_current_value_pln: vault.current,
    vault_purchase_value_pln: vault.purchase,
    market_value_pln,
    pnl_pln: market_value_pln - transfer_net_pln,
    has_mismatch,
    mismatch_pln,
  };
}

export async function fetchInvestmentPortfolios(
  supabase: ServerSupabaseClient,
  asOfDate = new Date().toISOString().slice(0, 10)
): Promise<InvestmentPortfolioRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const sources = await loadPortfolioSources(supabase, user.id);
  const rows: InvestmentPortfolioRow[] = [];

  for (const source of sources) {
    const transfer_net_pln = await transferNetPln(
      supabase,
      source.ledger_account_id,
      asOfDate
    );
    const vaultKey =
      source.portfolio_kind === "gold" ? source.id : source.ledger_account_id;
    const vault =
      source.portfolio_kind === "gold"
        ? await fetchVaultSums(supabase, vaultKey)
        : { current: 0, purchase: 0 };

    rows.push(buildPortfolioRow(source, transfer_net_pln, vault));
  }

  return rows;
}

export async function fetchPortfolioByKind(
  supabase: ServerSupabaseClient,
  kind: PortfolioKind,
  asOfDate?: string
): Promise<InvestmentPortfolioRow | null> {
  const all = await fetchInvestmentPortfolios(supabase, asOfDate);
  return all.find((p) => p.portfolio_kind === kind) ?? null;
}

export async function fetchPortfoliosMarketValue(
  supabase: ServerSupabaseClient
): Promise<number> {
  const { data, error } = await supabase.rpc("get_portfolios_market_value_pln" as never);
  if (!error && data != null) return Number(data);

  const portfolios = await fetchInvestmentPortfolios(supabase);
  return portfolios.reduce((s, p) => s + p.market_value_pln, 0);
}

export async function updatePortfolioManualValue(
  supabase: ServerSupabaseClient,
  portfolioId: string,
  manualValue: number | null
): Promise<void> {
  const { error: tableErr } = await supabase
    .from("investment_portfolios")
    .update({
      manual_market_value_pln: manualValue,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", portfolioId);

  if (!tableErr) return;

  const { data: acc } = await supabase
    .from("accounts")
    .select("metadata")
    .eq("id", portfolioId)
    .maybeSingle();

  if (!acc) throw tableErr;

  const meta = {
    ...parseAccountMetadata((acc as { metadata: Record<string, unknown> | null }).metadata),
    manual_market_value_pln: manualValue,
  };

  const { error: updErr } = await supabase
    .from("accounts")
    .update({ metadata: meta } as never)
    .eq("id", portfolioId);

  if (updErr) throw updErr;
}

export async function ensureInvestmentPortfolios(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<void> {
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name, metadata")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;

  for (const acc of accounts ?? []) {
    const name = (acc as { name: string }).name;
    const kind = inferPortfolioKindFromAccountName(name);
    if (!kind) continue;

    const accountId = (acc as { id: string }).id;

    const { data: existing, error: tableErr } = await supabase
      .from("investment_portfolios")
      .select("id")
      .eq("ledger_account_id", accountId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!tableErr && !existing) {
      await supabase.from("investment_portfolios").insert({
        user_id: userId,
        ledger_account_id: accountId,
        portfolio_kind: kind,
        display_name: PORTFOLIO_KIND_LABELS[kind],
      } as never);
      continue;
    }

    const meta = parseAccountMetadata(
      (acc as { metadata: Record<string, unknown> | null }).metadata
    );
    if ((meta as Record<string, unknown>).portfolio_kind) continue;

    await supabase
      .from("accounts")
      .update({
        metadata: { ...meta, portfolio_kind: kind },
        show_on_dashboard: false,
        include_in_net_worth: false,
      } as never)
      .eq("id", accountId);
  }
}

/** Id używany w metadata.portfolio_id monet / zestawów. */
export function portfolioKeyForVault(row: InvestmentPortfolioRow): string {
  return row.id;
}
