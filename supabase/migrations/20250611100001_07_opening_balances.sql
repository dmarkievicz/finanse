-- Salda początkowe, data startu analiz, tryb bieżący vs pełna historia

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_opening_balance boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_opening_balance
  ON transactions(user_id, date)
  WHERE is_opening_balance = true AND deleted_at IS NULL;

COMMENT ON COLUMN transactions.is_opening_balance IS 'Saldo otwarcia / korekta ustawiająca stan na datę startu analiz';

-- Saldo jednego konta (uwzględnia datę startu analiz i saldo otwarcia)
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode text DEFAULT 'current'
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date
    FROM user_settings
    WHERE user_id = auth.uid()
  ),
  use_current AS (
    SELECT
      CASE
        WHEN p_mode = 'full' THEN false
        WHEN p_mode = 'current' THEN true
        ELSE (SELECT analysis_start_date IS NOT NULL FROM settings)
      END AS enabled,
      (SELECT analysis_start_date FROM settings) AS start_date
  )
  SELECT COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2)
  FROM transaction_entries te
  JOIN transactions t ON t.id = te.transaction_id
  CROSS JOIN use_current uc
  WHERE te.account_id = p_account_id
    AND t.deleted_at IS NULL
    AND t.date <= p_as_of_date
    AND t.user_id = auth.uid()
    AND (
      NOT uc.enabled
      OR uc.start_date IS NULL
      OR (
        t.date > uc.start_date
        OR (t.is_opening_balance = true AND t.date = uc.start_date)
      )
    );
$$;

-- Bieżące konta (dashboard) — tryb current domyślnie
CREATE OR REPLACE FUNCTION get_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode text DEFAULT 'current'
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
    get_account_balance(a.id, p_as_of_date, p_mode)
  FROM accounts a
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
    AND a.lifecycle_status = 'active'
    AND a.show_on_dashboard = true
  ORDER BY a.name;
$$;

CREATE OR REPLACE FUNCTION get_net_worth(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode text DEFAULT 'current'
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(get_account_balance(a.id, p_as_of_date, p_mode)), 0)::numeric(18, 2)
  FROM accounts a
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
    AND a.lifecycle_status = 'active'
    AND a.include_in_net_worth = true;
$$;

CREATE OR REPLACE FUNCTION get_all_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode text DEFAULT 'full'
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
  tx_count             bigint,
  opening_balance_pln  numeric(18, 2),
  has_opening_balance  boolean,
  history_balance_pln  numeric(18, 2)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  ),
  openings AS (
    SELECT te.account_id, te.amount_pln AS opening_pln
    FROM transaction_entries te
    JOIN transactions t ON t.id = te.transaction_id
    CROSS JOIN settings s
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.is_opening_balance = true
      AND t.date = s.analysis_start_date
      AND s.analysis_start_date IS NOT NULL
  )
  SELECT
    a.id,
    a.name,
    a.account_type,
    a.default_currency,
    get_account_balance(a.id, p_as_of_date, p_mode),
    a.lifecycle_status,
    a.show_on_dashboard,
    a.include_in_net_worth,
    a.needs_review,
    (
      SELECT COUNT(DISTINCT t2.id)
      FROM transaction_entries te2
      JOIN transactions t2 ON t2.id = te2.transaction_id
      WHERE te2.account_id = a.id
        AND t2.deleted_at IS NULL
        AND t2.date <= p_as_of_date
    ),
    o.opening_pln,
    (o.opening_pln IS NOT NULL),
    get_account_balance(a.id, p_as_of_date, 'full')
  FROM accounts a
  LEFT JOIN openings o ON o.account_id = a.id
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
  ORDER BY a.needs_review DESC, a.lifecycle_status, a.name;
$$;

-- Saldo z pełnej historii (do porównania przed korektą)
CREATE OR REPLACE FUNCTION get_account_full_history_balance(
  p_account_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT get_account_balance(p_account_id, p_as_of_date, 'full');
$$;

-- Cashflow — tylko od daty startu w trybie domyślnym
CREATE OR REPLACE FUNCTION get_monthly_cashflow(
  p_year  int,
  p_month int,
  p_mode  text DEFAULT 'current'
)
RETURNS TABLE (
  income_pln   numeric(18, 2),
  expense_pln  numeric(18, 2),
  surplus_pln  numeric(18, 2)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  ),
  month_start AS (
    SELECT make_date(p_year, p_month, 1) AS d
  ),
  month_end AS (
    SELECT (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date AS d
  )
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END), 0)::numeric(18, 2),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(te.amount_pln) ELSE 0 END), 0)::numeric(18, 2),
    (
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(te.amount_pln) ELSE 0 END), 0)
    )::numeric(18, 2)
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  CROSS JOIN settings s
  CROSS JOIN month_start ms
  CROSS JOIN month_end me
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.date BETWEEN ms.d AND me.d
    AND t.type IN ('income', 'expense')
    AND t.status != 'needs_review'
    AND (
      p_mode = 'full'
      OR s.analysis_start_date IS NULL
      OR t.date >= s.analysis_start_date
    );
$$;

CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_from date,
  p_to   date,
  p_mode text DEFAULT 'current'
)
RETURNS TABLE (
  category_id   uuid,
  category_name text,
  total_pln     numeric(18, 2),
  tx_count      bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  )
  SELECT
    c.id,
    c.name,
    COALESCE(SUM(ABS(te.amount_pln)), 0)::numeric(18, 2),
    COUNT(DISTINCT t.id)
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  LEFT JOIN categories c ON c.id = t.category_id
  CROSS JOIN settings s
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.type = 'expense'
    AND t.date BETWEEN p_from AND p_to
    AND t.status != 'needs_review'
    AND (
      p_mode = 'full'
      OR s.analysis_start_date IS NULL
      OR t.date >= s.analysis_start_date
    )
  GROUP BY c.id, c.name
  ORDER BY 3 DESC;
$$;
