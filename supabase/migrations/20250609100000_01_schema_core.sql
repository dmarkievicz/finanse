-- Faza 2: rdzeń finansów — słowniki, transakcje, import

-- =============================================================================
-- SŁOWNIKI
-- =============================================================================

CREATE TABLE currencies (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  symbol      text NOT NULL,
  is_base     boolean NOT NULL DEFAULT false
);

CREATE TABLE accounts (
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

CREATE TABLE categories (
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

CREATE TABLE subcategories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  UNIQUE (category_id, name)
);

CREATE TABLE exchange_rates (
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

CREATE UNIQUE INDEX idx_exchange_rates_global
  ON exchange_rates (date, from_currency, to_currency)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX idx_exchange_rates_per_user
  ON exchange_rates (date, from_currency, to_currency, user_id)
  WHERE user_id IS NOT NULL;

-- =============================================================================
-- IMPORT
-- =============================================================================

CREATE TABLE imports (
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

CREATE TABLE transactions (
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

CREATE TABLE import_rows (
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

CREATE TABLE transaction_entries (
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

CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE monthly_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year          int NOT NULL,
  month         int NOT NULL CHECK (month BETWEEN 1 AND 12),
  snapshot_date date NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);

CREATE TABLE goals (
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
-- INDEKSY
-- =============================================================================

CREATE INDEX idx_accounts_user ON accounts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_user ON categories(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_status ON transactions(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_transaction_entries_account ON transaction_entries(account_id);
CREATE INDEX idx_transaction_entries_transaction ON transaction_entries(transaction_id);
CREATE INDEX idx_transaction_entries_user ON transaction_entries(user_id);
CREATE INDEX idx_import_rows_import ON import_rows(import_id);
CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(date, from_currency, to_currency);

-- =============================================================================
-- TRIGGER: updated_at
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

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
