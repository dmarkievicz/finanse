export interface WealthSnapshotData {
  net_worth_pln: number;
  liquid_assets_pln: number;
  investments_pln: number;
  income_period_pln: number;
  expenses_period_pln: number;
  surplus_period_pln: number;
  savings_rate_pct: number;
  account_count: number;
  instrument_count: number;
  captured_at: string;
}

export interface PortfolioSnapshotRow {
  id: string;
  date: string;
  data: WealthSnapshotData;
  created_at: string;
}
