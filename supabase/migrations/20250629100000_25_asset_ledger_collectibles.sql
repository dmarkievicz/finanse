-- Złoto i LEGO jako inwentarz (instrumenty), nie konta operacyjne.
-- Majątek netto = konta (include_in_net_worth) + wartość instrumentów.

ALTER TABLE instruments DROP CONSTRAINT IF EXISTS instruments_instrument_type_check;
ALTER TABLE instruments ADD CONSTRAINT instruments_instrument_type_check
  CHECK (instrument_type IN (
    'ETF', 'GOLD', 'BOND', 'DEPOSIT', 'CASH', 'REAL_ESTATE', 'LOAN', 'CRYPTO', 'COLLECTIBLE', 'OTHER'
  ));

-- LEGO — jak ZŁOTO: ukryte z kont i majątku płynnego
UPDATE accounts
SET
  show_on_dashboard = false,
  include_in_net_worth = false,
  needs_review = true,
  notes = CASE
    WHEN notes IS NULL OR trim(notes) = '' THEN
      'LEGO to inwestycja kolekcjonerska (instrument COLLECTIBLE), nie konto bankowe.'
    WHEN notes NOT ILIKE '%COLLECTIBLE%' THEN
      notes || E'\n\nLEGO to inwestycja kolekcjonerska (instrument COLLECTIBLE), nie konto bankowe.'
    ELSE notes
  END
WHERE deleted_at IS NULL
  AND name ~* '^lego$';

-- Wartość portfela instrumentów (koszt lub cena rynkowa × ilość)
CREATE OR REPLACE FUNCTION get_instruments_market_value_pln(p_user_id uuid DEFAULT auth.uid())
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH tx_agg AS (
    SELECT
      it.instrument_id,
      COALESCE(SUM(
        CASE
          WHEN it.type = 'buy' THEN COALESCE(it.quantity, 0)
          WHEN it.type = 'sell' THEN -COALESCE(it.quantity, 0)
          ELSE 0
        END
      ), 0) AS qty,
      COALESCE(SUM(
        CASE
          WHEN it.type = 'buy' THEN it.amount_pln
          WHEN it.type = 'sell' THEN -ABS(it.amount_pln)
          WHEN it.type IN ('dividend', 'coupon', 'interest') THEN it.amount_pln
          WHEN it.type IN ('fee', 'tax') THEN -ABS(it.amount_pln)
          ELSE it.amount_pln
        END
      ), 0) AS invested
    FROM investment_transactions it
    WHERE it.user_id = p_user_id
      AND it.deleted_at IS NULL
    GROUP BY it.instrument_id
  ),
  latest_prices AS (
    SELECT DISTINCT ON (instrument_id)
      instrument_id,
      price
    FROM instrument_prices
    ORDER BY instrument_id, date DESC
  )
  SELECT COALESCE(SUM(
    CASE
      WHEN lp.price IS NOT NULL AND ta.qty <> 0 THEN (ta.qty * lp.price)::numeric(18, 2)
      ELSE ta.invested
    END
  ), 0)::numeric(18, 2)
  FROM instruments i
  JOIN tx_agg ta ON ta.instrument_id = i.id
  LEFT JOIN latest_prices lp ON lp.instrument_id = i.id
  WHERE i.user_id = p_user_id
    AND i.deleted_at IS NULL
    AND i.is_active = true;
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
  SELECT (
    COALESCE((
      SELECT SUM(cb.balance_pln)
      FROM accounts a
      JOIN compute_account_balances(p_as_of_date, p_mode) cb ON cb.account_id = a.id
      WHERE a.user_id = auth.uid()
        AND a.deleted_at IS NULL
        AND a.lifecycle_status = 'active'
        AND a.include_in_net_worth = true
    ), 0)
    + get_instruments_market_value_pln(auth.uid())
  )::numeric(18, 2);
$$;

-- get_dashboard_bundle: net_worth uwzględnia instrumenty
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
  ),
  inst_val AS (
    SELECT get_instruments_market_value_pln(auth.uid()) AS v
  )
  SELECT jsonb_build_object(
    'net_worth', (
      SELECT COALESCE(SUM(balance_pln), 0) + (SELECT v FROM inst_val)
      FROM dash_balances
      WHERE include_in_net_worth = true
    ),
    'prev_net_worth', (
      SELECT COALESCE(SUM(prev_balance_pln), 0) + (SELECT v FROM inst_val)
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
