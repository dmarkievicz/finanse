-- KROK 1: Uruchom TEN plik w SQL Editor (bez funkcji).
-- KROK 2: Potem uruchom fix_functions.sql

-- =============================================================================
-- SŁOWNIKI
-- =============================================================================

CREATE TABLE IF NOT EXISTS currencies (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  symbol      text NOT NULL,
  is_base     boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  account_type      text NOT NULL DEFAULT 'other'
    CHECK (account_type IN ('bank', 'cash', 'broker', 'deposit', 'loan', 'real_estate', 'investment', 'other')),
  default_currency  text NOT NULL REFERENCES currencies(code) DEFAULT 'PLN',
  is_active         boolean NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'expense'
    CHECK (type IN ('income', 'expense', 'both')),
  color       text,
  icon        text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS subcategories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date           date NOT NULL,
  from_currency  text NOT NULL REFERENCES currencies(code),
  to_currency    text NOT NULL REFERENCES currencies(code) DEFAULT 'PLN',
  rate           numeric(18, 6) NOT NULL,
  source         text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('nbp', 'manual', 'import')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_global
  ON exchange_rates (date, from_currency, to_currency)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_per_user
  ON exchange_rates (date, from_currency, to_currency, user_id)
  WHERE user_id IS NOT NULL;

-- =============================================================================
-- IMPORT
-- =============================================================================

CREATE TABLE IF NOT EXISTS imports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename       text NOT NULL,
  file_hash      text,
  status         text NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged', 'validated', 'imported', 'failed')),
  total_rows     int NOT NULL DEFAULT 0,
  imported_rows  int NOT NULL DEFAULT 0,
  skipped_rows   int NOT NULL DEFAULT 0,
  error_rows     int NOT NULL DEFAULT 0,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  error_log      jsonb
);

-- =============================================================================
-- TRANSAKCJE
-- =============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              date NOT NULL,
  type              text NOT NULL
    CHECK (type IN ('income', 'expense', 'transfer', 'exchange', 'adjustment')),
  description       text,
  details           text,
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id    uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  import_id         uuid REFERENCES imports(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'pending', 'reconciled', 'needs_review')),
  validation_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE TABLE IF NOT EXISTS import_rows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id         uuid NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  row_number        int NOT NULL,
  raw_data          jsonb NOT NULL,
  import_hash       text NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'valid', 'error', 'imported', 'skipped')),
  validation_errors jsonb,
  transaction_id    uuid REFERENCES transactions(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, import_hash)
);

CREATE TABLE IF NOT EXISTS transaction_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount          numeric(18, 2) NOT NULL,
  currency        text NOT NULL REFERENCES currencies(code),
  exchange_rate   numeric(18, 6) NOT NULL DEFAULT 1,
  amount_pln      numeric(18, 2) NOT NULL,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- AUDYT I SNAPSHOTY
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year          int NOT NULL,
  month         int NOT NULL CHECK (month BETWEEN 1 AND 12),
  snapshot_date date NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);

CREATE TABLE IF NOT EXISTS goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  goal_type       text NOT NULL
    CHECK (goal_type IN ('net_worth', 'liquid_assets', 'retirement', 'allocation', 'emergency_fund')),
  target_amount   numeric(18, 2),
  target_date     date,
  current_amount  numeric(18, 2) NOT NULL DEFAULT 0,
  parameters      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- INWESTYCJE
-- =============================================================================

CREATE TABLE IF NOT EXISTS instruments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  symbol           text,
  instrument_type  text NOT NULL
    CHECK (instrument_type IN ('ETF', 'GOLD', 'BOND', 'DEPOSIT', 'CASH', 'REAL_ESTATE', 'LOAN', 'CRYPTO', 'OTHER')),
  currency         text NOT NULL REFERENCES currencies(code) DEFAULT 'PLN',
  account_id       uuid REFERENCES accounts(id) ON DELETE SET NULL,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

CREATE TABLE IF NOT EXISTS investment_transactions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id          uuid NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
  date                   date NOT NULL,
  type                   text NOT NULL
    CHECK (type IN ('buy', 'sell', 'dividend', 'coupon', 'interest', 'fee', 'tax', 'transfer', 'split')),
  quantity               numeric(28, 8),
  price_per_unit         numeric(18, 6),
  amount                 numeric(18, 2) NOT NULL,
  currency               text NOT NULL REFERENCES currencies(code),
  exchange_rate          numeric(18, 6) NOT NULL DEFAULT 1,
  amount_pln             numeric(18, 2) NOT NULL,
  fees                   numeric(18, 2) NOT NULL DEFAULT 0,
  linked_transaction_id  uuid REFERENCES transactions(id) ON DELETE SET NULL,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz
);

CREATE TABLE IF NOT EXISTS instrument_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id  uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           date NOT NULL,
  price          numeric(18, 6) NOT NULL,
  currency       text NOT NULL REFERENCES currencies(code),
  source         text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'api', 'nbp')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instrument_id, date)
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- =============================================================================
-- INDEKSY
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_entries_account ON transaction_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_entries_transaction ON transaction_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_entries_user ON transaction_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_import ON import_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(date, from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_instruments_user ON instruments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investment_transactions_instrument ON investment_transactions(instrument_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_instrument_prices_date ON instrument_prices(instrument_id, date DESC);

-- =============================================================================
-- SEED WALUT
-- =============================================================================

INSERT INTO currencies (code, name, symbol, is_base) VALUES
  ('PLN', 'Polski złoty', 'zł', true),
  ('EUR', 'Euro', '€', false),
  ('USD', 'Dolar amerykański', '$', false)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- TRIGGER updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accounts_updated_at ON accounts;
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

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
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "currencies_read_authenticated" ON currencies;
CREATE POLICY "currencies_read_authenticated" ON currencies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "accounts_select_own" ON accounts;
DROP POLICY IF EXISTS "accounts_insert_own" ON accounts;
DROP POLICY IF EXISTS "accounts_update_own" ON accounts;
DROP POLICY IF EXISTS "accounts_delete_own" ON accounts;
CREATE POLICY "accounts_select_own" ON accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "accounts_insert_own" ON accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "accounts_update_own" ON accounts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "accounts_delete_own" ON accounts FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "categories_select_own" ON categories;
DROP POLICY IF EXISTS "categories_insert_own" ON categories;
DROP POLICY IF EXISTS "categories_update_own" ON categories;
DROP POLICY IF EXISTS "categories_delete_own" ON categories;
CREATE POLICY "categories_select_own" ON categories FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "categories_insert_own" ON categories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_update_own" ON categories FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "categories_delete_own" ON categories FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subcategories_select_own" ON subcategories;
DROP POLICY IF EXISTS "subcategories_insert_own" ON subcategories;
DROP POLICY IF EXISTS "subcategories_update_own" ON subcategories;
DROP POLICY IF EXISTS "subcategories_delete_own" ON subcategories;
CREATE POLICY "subcategories_select_own" ON subcategories FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "subcategories_insert_own" ON subcategories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "subcategories_update_own" ON subcategories FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "subcategories_delete_own" ON subcategories FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "exchange_rates_select" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_insert_own" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_update_own" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_delete_own" ON exchange_rates;
CREATE POLICY "exchange_rates_select" ON exchange_rates FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "exchange_rates_insert_own" ON exchange_rates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "exchange_rates_update_own" ON exchange_rates FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "exchange_rates_delete_own" ON exchange_rates FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "imports_select_own" ON imports;
DROP POLICY IF EXISTS "imports_insert_own" ON imports;
DROP POLICY IF EXISTS "imports_update_own" ON imports;
DROP POLICY IF EXISTS "imports_delete_own" ON imports;
CREATE POLICY "imports_select_own" ON imports FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "imports_insert_own" ON imports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "imports_update_own" ON imports FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "imports_delete_own" ON imports FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "import_rows_select_own" ON import_rows;
DROP POLICY IF EXISTS "import_rows_insert_own" ON import_rows;
DROP POLICY IF EXISTS "import_rows_update_own" ON import_rows;
DROP POLICY IF EXISTS "import_rows_delete_own" ON import_rows;
CREATE POLICY "import_rows_select_own" ON import_rows FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "import_rows_insert_own" ON import_rows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "import_rows_update_own" ON import_rows FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "import_rows_delete_own" ON import_rows FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON transactions;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "transaction_entries_select_own" ON transaction_entries;
DROP POLICY IF EXISTS "transaction_entries_insert_own" ON transaction_entries;
DROP POLICY IF EXISTS "transaction_entries_update_own" ON transaction_entries;
DROP POLICY IF EXISTS "transaction_entries_delete_own" ON transaction_entries;
CREATE POLICY "transaction_entries_select_own" ON transaction_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "transaction_entries_insert_own" ON transaction_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "transaction_entries_update_own" ON transaction_entries FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "transaction_entries_delete_own" ON transaction_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "audit_log_select_own" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert_own" ON audit_log;
CREATE POLICY "audit_log_select_own" ON audit_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "audit_log_insert_own" ON audit_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "monthly_snapshots_select_own" ON monthly_snapshots;
DROP POLICY IF EXISTS "monthly_snapshots_insert_own" ON monthly_snapshots;
DROP POLICY IF EXISTS "monthly_snapshots_update_own" ON monthly_snapshots;
DROP POLICY IF EXISTS "monthly_snapshots_delete_own" ON monthly_snapshots;
CREATE POLICY "monthly_snapshots_select_own" ON monthly_snapshots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "monthly_snapshots_insert_own" ON monthly_snapshots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "monthly_snapshots_update_own" ON monthly_snapshots FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "monthly_snapshots_delete_own" ON monthly_snapshots FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "goals_select_own" ON goals;
DROP POLICY IF EXISTS "goals_insert_own" ON goals;
DROP POLICY IF EXISTS "goals_update_own" ON goals;
DROP POLICY IF EXISTS "goals_delete_own" ON goals;
CREATE POLICY "goals_select_own" ON goals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "goals_insert_own" ON goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_update_own" ON goals FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "goals_delete_own" ON goals FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "instruments_select_own" ON instruments;
DROP POLICY IF EXISTS "instruments_insert_own" ON instruments;
DROP POLICY IF EXISTS "instruments_update_own" ON instruments;
DROP POLICY IF EXISTS "instruments_delete_own" ON instruments;
CREATE POLICY "instruments_select_own" ON instruments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "instruments_insert_own" ON instruments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "instruments_update_own" ON instruments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "instruments_delete_own" ON instruments FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "investment_transactions_select_own" ON investment_transactions;
DROP POLICY IF EXISTS "investment_transactions_insert_own" ON investment_transactions;
DROP POLICY IF EXISTS "investment_transactions_update_own" ON investment_transactions;
DROP POLICY IF EXISTS "investment_transactions_delete_own" ON investment_transactions;
CREATE POLICY "investment_transactions_select_own" ON investment_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "investment_transactions_insert_own" ON investment_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "investment_transactions_update_own" ON investment_transactions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "investment_transactions_delete_own" ON investment_transactions FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "instrument_prices_select_own" ON instrument_prices;
DROP POLICY IF EXISTS "instrument_prices_insert_own" ON instrument_prices;
DROP POLICY IF EXISTS "instrument_prices_update_own" ON instrument_prices;
DROP POLICY IF EXISTS "instrument_prices_delete_own" ON instrument_prices;
CREATE POLICY "instrument_prices_select_own" ON instrument_prices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "instrument_prices_insert_own" ON instrument_prices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "instrument_prices_update_own" ON instrument_prices FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "instrument_prices_delete_own" ON instrument_prices FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "portfolio_snapshots_select_own" ON portfolio_snapshots;
DROP POLICY IF EXISTS "portfolio_snapshots_insert_own" ON portfolio_snapshots;
DROP POLICY IF EXISTS "portfolio_snapshots_update_own" ON portfolio_snapshots;
DROP POLICY IF EXISTS "portfolio_snapshots_delete_own" ON portfolio_snapshots;
CREATE POLICY "portfolio_snapshots_select_own" ON portfolio_snapshots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "portfolio_snapshots_insert_own" ON portfolio_snapshots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "portfolio_snapshots_update_own" ON portfolio_snapshots FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "portfolio_snapshots_delete_own" ON portfolio_snapshots FOR DELETE TO authenticated USING (user_id = auth.uid());
