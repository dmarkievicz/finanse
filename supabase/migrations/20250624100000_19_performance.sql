-- Wydajność: batch sald kont + jeden RPC dashboardu

-- =============================================================================
-- 1. Batch salda (jedno przejście po entries zamiast N × get_account_balance)
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode       text DEFAULT 'current'
)
RETURNS TABLE (
  account_id  uuid,
  balance_pln numeric(18, 2)
)
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
  SELECT
    te.account_id,
    COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2)
  FROM transaction_entries te
  JOIN transactions t ON t.id = te.transaction_id
  CROSS JOIN use_current uc
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.date <= p_as_of_date
    AND (
      NOT uc.enabled
      OR uc.start_date IS NULL
      OR (
        t.date > uc.start_date
        OR (t.is_opening_balance = true AND t.date = uc.start_date)
      )
    )
  GROUP BY te.account_id;
$$;

CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode       text DEFAULT 'current'
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    (
      SELECT cb.balance_pln
      FROM compute_account_balances(p_as_of_date, p_mode) cb
      WHERE cb.account_id = p_account_id
    ),
    0
  )::numeric(18, 2);
$$;

CREATE OR REPLACE FUNCTION get_net_worth(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode       text DEFAULT 'current'
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(cb.balance_pln), 0)::numeric(18, 2)
  FROM accounts a
  JOIN compute_account_balances(p_as_of_date, p_mode) cb ON cb.account_id = a.id
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
    AND a.lifecycle_status = 'active'
    AND a.include_in_net_worth = true;
$$;

CREATE OR REPLACE FUNCTION get_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode       text DEFAULT 'current'
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
    COALESCE(cb.balance_pln, 0)::numeric(18, 2)
  FROM accounts a
  LEFT JOIN compute_account_balances(p_as_of_date, p_mode) cb ON cb.account_id = a.id
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
    AND a.lifecycle_status = 'active'
    AND a.show_on_dashboard = true
  ORDER BY a.name;
$$;

CREATE OR REPLACE FUNCTION get_all_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode       text DEFAULT 'full'
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
  bal_mode AS (
    SELECT * FROM compute_account_balances(p_as_of_date, p_mode)
  ),
  bal_full AS (
    SELECT * FROM compute_account_balances(p_as_of_date, 'full')
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
    COALESCE(bm.balance_pln, 0)::numeric(18, 2),
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
    COALESCE(bf.balance_pln, 0)::numeric(18, 2)
  FROM accounts a
  LEFT JOIN bal_mode bm ON bm.account_id = a.id
  LEFT JOIN bal_full bf ON bf.account_id = a.id
  LEFT JOIN openings o ON o.account_id = a.id
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
  ORDER BY a.needs_review DESC, a.lifecycle_status, a.name;
$$;

-- =============================================================================
-- 2. Jeden RPC zwracający dane dashboardu (JSON)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_bundle(
  p_current_from date,
  p_current_to   date,
  p_prev_from    date,
  p_prev_to      date,
  p_as_of        date,
  p_prev_as_of   date,
  p_mode         text DEFAULT 'current'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH
  settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  ),
  bal_curr AS (
    SELECT * FROM compute_account_balances(p_as_of, p_mode)
  ),
  bal_prev AS (
    SELECT * FROM compute_account_balances(p_prev_as_of, p_mode)
  ),
  openings AS (
    SELECT te.account_id, true AS has_ob
    FROM transaction_entries te
    JOIN transactions t ON t.id = te.transaction_id
    CROSS JOIN settings s
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.is_opening_balance = true
      AND t.date = s.analysis_start_date
      AND s.analysis_start_date IS NOT NULL
  ),
  curr_cf AS (
    SELECT * FROM get_period_cashflow(p_current_from, p_current_to, p_mode)
  ),
  prev_cf AS (
    SELECT * FROM get_period_cashflow(p_prev_from, p_prev_to, p_mode)
  ),
  cat_curr AS (
    SELECT * FROM get_category_breakdown(p_current_from, p_current_to, p_mode)
  ),
  cat_prev AS (
    SELECT * FROM get_category_breakdown(p_prev_from, p_prev_to, p_mode)
  ),
  dash_balances AS (
    SELECT
      a.id AS account_id,
      a.name AS account_name,
      a.account_type,
      a.default_currency AS currency,
      COALESCE(bc.balance_pln, 0)::numeric(18, 2) AS balance_pln,
      COALESCE(bp.balance_pln, 0)::numeric(18, 2) AS prev_balance_pln,
      a.lifecycle_status,
      a.show_on_dashboard,
      a.include_in_net_worth,
      COALESCE(o.has_ob, false) AS has_opening_balance
    FROM accounts a
    LEFT JOIN bal_curr bc ON bc.account_id = a.id
    LEFT JOIN bal_prev bp ON bp.account_id = a.id
    LEFT JOIN openings o ON o.account_id = a.id
    WHERE a.user_id = auth.uid()
      AND a.deleted_at IS NULL
      AND a.lifecycle_status = 'active'
  ),
  recent AS (
    SELECT
      t.id,
      t.date,
      t.type,
      t.status,
      c.name AS category_name,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'amount_pln', te.amount_pln,
              'account_name', acc.name
            )
            ORDER BY te.sort_order
          )
          FROM transaction_entries te
          LEFT JOIN accounts acc ON acc.id = te.account_id
          WHERE te.transaction_id = t.id
        ),
        '[]'::jsonb
      ) AS entries
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.status != 'needs_review'
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 8
  )
  SELECT jsonb_build_object(
    'net_worth', (
      SELECT COALESCE(SUM(balance_pln), 0)
      FROM dash_balances
      WHERE include_in_net_worth = true
    ),
    'prev_net_worth', (
      SELECT COALESCE(SUM(prev_balance_pln), 0)
      FROM dash_balances
      WHERE include_in_net_worth = true
    ),
    'liquid_assets', (
      SELECT COALESCE(SUM(balance_pln), 0)
      FROM dash_balances
      WHERE account_type IN ('bank', 'cash') AND balance_pln > 0
    ),
    'prev_liquid_assets', (
      SELECT COALESCE(SUM(prev_balance_pln), 0)
      FROM dash_balances
      WHERE account_type IN ('bank', 'cash') AND prev_balance_pln > 0
    ),
    'current_cashflow', (
      SELECT jsonb_build_object(
        'income_pln', income_pln,
        'expense_pln', expense_pln,
        'surplus_pln', surplus_pln
      )
      FROM curr_cf
    ),
    'prev_cashflow', (
      SELECT jsonb_build_object(
        'income_pln', income_pln,
        'expense_pln', expense_pln,
        'surplus_pln', surplus_pln
      )
      FROM prev_cf
    ),
    'category_current', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', category_id,
        'category_name', category_name,
        'total_pln', total_pln,
        'tx_count', tx_count
      ) ORDER BY total_pln DESC)
      FROM cat_curr
    ), '[]'::jsonb),
    'category_previous', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', category_id,
        'category_name', category_name,
        'total_pln', total_pln,
        'tx_count', tx_count
      ) ORDER BY total_pln DESC)
      FROM cat_prev
    ), '[]'::jsonb),
    'accounts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', account_id,
        'account_name', account_name,
        'account_type', account_type,
        'currency', currency,
        'balance_pln', balance_pln,
        'prev_balance_pln', prev_balance_pln,
        'lifecycle_status', lifecycle_status,
        'show_on_dashboard', show_on_dashboard,
        'include_in_net_worth', include_in_net_worth,
        'has_opening_balance', has_opening_balance
      ) ORDER BY account_name)
      FROM dash_balances
    ), '[]'::jsonb),
    'recent_transactions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'date', date,
        'type', type,
        'status', status,
        'category_name', category_name,
        'entries', entries
      ))
      FROM recent
    ), '[]'::jsonb)
  );
$$;

-- Indeks wspierający batch sald
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_active
  ON transactions (user_id, date)
  WHERE deleted_at IS NULL;
