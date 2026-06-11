-- Cykl życia kont: import pełnej historii + porządkowanie przez użytkownika (opcja A)

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'inactive', 'archived')),
  ADD COLUMN IF NOT EXISTS show_on_dashboard boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

COMMENT ON COLUMN accounts.lifecycle_status IS 'active | inactive | archived — konta z importu domyślnie archived';
COMMENT ON COLUMN accounts.show_on_dashboard IS 'false = ukryte na pulpicie i liście bieżących kont';
COMMENT ON COLUMN accounts.include_in_net_worth IS 'false = wyłączone z majątku netto';

CREATE TABLE IF NOT EXISTS user_settings (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_start_date  date,
  default_view_mode    text NOT NULL DEFAULT 'current'
    CHECK (default_view_mode IN ('current', 'full_history')),
  base_currency        text NOT NULL DEFAULT 'PLN' REFERENCES currencies(code),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own" ON user_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_settings_insert_own" ON user_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_settings_update_own" ON user_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Bieżące konta (dashboard, lista /accounts)
CREATE OR REPLACE FUNCTION get_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id   uuid,
  account_name text,
  account_type text,
  currency     text,
  balance_pln  numeric(18, 2)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    a.id,
    a.name,
    a.account_type,
    a.default_currency,
    COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2)
  FROM accounts a
  LEFT JOIN transaction_entries te ON te.account_id = a.id
  LEFT JOIN transactions t ON t.id = te.transaction_id
    AND t.deleted_at IS NULL
    AND t.date <= p_as_of_date
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
    AND a.lifecycle_status = 'active'
    AND a.show_on_dashboard = true
  GROUP BY a.id, a.name, a.account_type, a.default_currency
  ORDER BY a.name;
$$;

-- Majątek netto — tylko konta uwzględniane w majątku
CREATE OR REPLACE FUNCTION get_net_worth(
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(bal.balance_pln), 0)::numeric(18, 2)
  FROM (
    SELECT
      a.id,
      COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2) AS balance_pln
    FROM accounts a
    LEFT JOIN transaction_entries te ON te.account_id = a.id
    LEFT JOIN transactions t ON t.id = te.transaction_id
      AND t.deleted_at IS NULL
      AND t.date <= p_as_of_date
    WHERE a.user_id = auth.uid()
      AND a.deleted_at IS NULL
      AND a.lifecycle_status = 'active'
      AND a.include_in_net_worth = true
    GROUP BY a.id
  ) bal;
$$;

-- Wszystkie konta (ekran zarządzania po imporcie)
CREATE OR REPLACE FUNCTION get_all_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id           uuid,
  account_name         text,
  account_type         text,
  currency             text,
  balance_pln          numeric(18, 2),
  lifecycle_status     text,
  show_on_dashboard    boolean,
  include_in_net_worth boolean,
  needs_review         boolean,
  tx_count             bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    a.id,
    a.name,
    a.account_type,
    a.default_currency,
    COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2),
    a.lifecycle_status,
    a.show_on_dashboard,
    a.include_in_net_worth,
    a.needs_review,
    COUNT(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL)
  FROM accounts a
  LEFT JOIN transaction_entries te ON te.account_id = a.id
  LEFT JOIN transactions t ON t.id = te.transaction_id
    AND t.deleted_at IS NULL
    AND t.date <= p_as_of_date
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
  GROUP BY
    a.id, a.name, a.account_type, a.default_currency,
    a.lifecycle_status, a.show_on_dashboard, a.include_in_net_worth, a.needs_review
  ORDER BY a.needs_review DESC, a.lifecycle_status, a.name;
$$;

CREATE OR REPLACE FUNCTION get_accounts_needs_review_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(*)
  FROM accounts
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    AND needs_review = true;
$$;
