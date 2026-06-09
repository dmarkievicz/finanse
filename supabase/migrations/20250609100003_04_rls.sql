-- Row Level Security — każda tabela z danymi użytkownika

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- currencies: odczyt dla wszystkich zalogowanych
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "currencies_read_authenticated"
  ON currencies FOR SELECT
  TO authenticated
  USING (true);

-- accounts
CREATE POLICY "accounts_select_own" ON accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "accounts_insert_own" ON accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "accounts_update_own" ON accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "accounts_delete_own" ON accounts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- categories
CREATE POLICY "categories_select_own" ON categories FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "categories_insert_own" ON categories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_update_own" ON categories FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "categories_delete_own" ON categories FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- subcategories
CREATE POLICY "subcategories_select_own" ON subcategories FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "subcategories_insert_own" ON subcategories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "subcategories_update_own" ON subcategories FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "subcategories_delete_own" ON subcategories FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- exchange_rates: własne + globalne (user_id IS NULL)
CREATE POLICY "exchange_rates_select" ON exchange_rates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "exchange_rates_insert_own" ON exchange_rates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "exchange_rates_update_own" ON exchange_rates FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "exchange_rates_delete_own" ON exchange_rates FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- imports
CREATE POLICY "imports_select_own" ON imports FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "imports_insert_own" ON imports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "imports_update_own" ON imports FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "imports_delete_own" ON imports FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- import_rows
CREATE POLICY "import_rows_select_own" ON import_rows FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "import_rows_insert_own" ON import_rows FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "import_rows_update_own" ON import_rows FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "import_rows_delete_own" ON import_rows FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- transactions
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- transaction_entries
CREATE POLICY "transaction_entries_select_own" ON transaction_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "transaction_entries_insert_own" ON transaction_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "transaction_entries_update_own" ON transaction_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "transaction_entries_delete_own" ON transaction_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- audit_log
CREATE POLICY "audit_log_select_own" ON audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "audit_log_insert_own" ON audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- monthly_snapshots
CREATE POLICY "monthly_snapshots_select_own" ON monthly_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "monthly_snapshots_insert_own" ON monthly_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "monthly_snapshots_update_own" ON monthly_snapshots FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "monthly_snapshots_delete_own" ON monthly_snapshots FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- goals
CREATE POLICY "goals_select_own" ON goals FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "goals_insert_own" ON goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_update_own" ON goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "goals_delete_own" ON goals FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- instruments
CREATE POLICY "instruments_select_own" ON instruments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "instruments_insert_own" ON instruments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "instruments_update_own" ON instruments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "instruments_delete_own" ON instruments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- investment_transactions
CREATE POLICY "investment_transactions_select_own" ON investment_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "investment_transactions_insert_own" ON investment_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "investment_transactions_update_own" ON investment_transactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "investment_transactions_delete_own" ON investment_transactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- instrument_prices
CREATE POLICY "instrument_prices_select_own" ON instrument_prices FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "instrument_prices_insert_own" ON instrument_prices FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "instrument_prices_update_own" ON instrument_prices FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "instrument_prices_delete_own" ON instrument_prices FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- portfolio_snapshots
CREATE POLICY "portfolio_snapshots_select_own" ON portfolio_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "portfolio_snapshots_insert_own" ON portfolio_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "portfolio_snapshots_update_own" ON portfolio_snapshots FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "portfolio_snapshots_delete_own" ON portfolio_snapshots FOR DELETE TO authenticated
  USING (user_id = auth.uid());
