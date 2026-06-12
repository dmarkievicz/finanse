-- Agregacje budżetowe zgodne z arkuszem Excel:
-- kwota wiersza ze znakiem per transakcja (net z entries → excel: income=net, expense=-net).
-- Zwroty (ujemny wydatek / dodatni wpis) obniżają sumę kategorii.

CREATE OR REPLACE FUNCTION get_monthly_cashflow(
  p_year  int,
  p_month int,
  p_mode  text DEFAULT 'current'
)
RETURNS TABLE (
  income_pln  numeric(18, 2),
  expense_pln numeric(18, 2),
  surplus_pln numeric(18, 2)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  ),
  month_bounds AS (
    SELECT
      make_date(p_year, p_month, 1) AS d_from,
      (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date AS d_to
  ),
  filtered AS (
    SELECT t.id, t.type
    FROM transactions t
    CROSS JOIN settings s
    CROSS JOIN month_bounds mb
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.date BETWEEN mb.d_from AND mb.d_to
      AND t.type IN ('income', 'expense')
      AND t.status NOT IN ('needs_review')
      AND (
        p_mode = 'full'
        OR s.analysis_start_date IS NULL
        OR t.date >= s.analysis_start_date
      )
  ),
  tx_net AS (
    SELECT
      f.id,
      f.type,
      COALESCE(SUM(te.amount_pln), 0) AS net_pln
    FROM filtered f
    JOIN transaction_entries te ON te.transaction_id = f.id
    GROUP BY f.id, f.type
  ),
  flows AS (
    SELECT
      CASE WHEN type = 'income' THEN net_pln ELSE 0 END AS income_part,
      CASE WHEN type = 'expense' THEN -net_pln ELSE 0 END AS expense_part
    FROM tx_net
  )
  SELECT
    COALESCE(SUM(income_part), 0)::numeric(18, 2),
    COALESCE(SUM(expense_part), 0)::numeric(18, 2),
    (COALESCE(SUM(income_part), 0) - COALESCE(SUM(expense_part), 0))::numeric(18, 2)
  FROM flows;
$$;

CREATE OR REPLACE FUNCTION get_period_cashflow(
  p_from date,
  p_to   date,
  p_mode text DEFAULT 'current'
)
RETURNS TABLE (
  income_pln  numeric(18, 2),
  expense_pln numeric(18, 2),
  surplus_pln numeric(18, 2)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  ),
  filtered AS (
    SELECT t.id, t.type
    FROM transactions t
    CROSS JOIN settings s
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.date BETWEEN p_from AND p_to
      AND t.type IN ('income', 'expense')
      AND t.status NOT IN ('needs_review')
      AND (
        p_mode = 'full'
        OR s.analysis_start_date IS NULL
        OR t.date >= s.analysis_start_date
      )
  ),
  tx_net AS (
    SELECT
      f.id,
      f.type,
      COALESCE(SUM(te.amount_pln), 0) AS net_pln
    FROM filtered f
    JOIN transaction_entries te ON te.transaction_id = f.id
    GROUP BY f.id, f.type
  ),
  flows AS (
    SELECT
      CASE WHEN type = 'income' THEN net_pln ELSE 0 END AS income_part,
      CASE WHEN type = 'expense' THEN -net_pln ELSE 0 END AS expense_part
    FROM tx_net
  )
  SELECT
    COALESCE(SUM(income_part), 0)::numeric(18, 2),
    COALESCE(SUM(expense_part), 0)::numeric(18, 2),
    (COALESCE(SUM(income_part), 0) - COALESCE(SUM(expense_part), 0))::numeric(18, 2)
  FROM flows;
$$;

CREATE OR REPLACE FUNCTION get_category_breakdown_typed(
  p_from    date,
  p_to      date,
  p_mode    text DEFAULT 'current',
  p_tx_type text DEFAULT 'expense'
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
  ),
  filtered AS (
    SELECT t.id, t.category_id
    FROM transactions t
    CROSS JOIN settings s
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.type = p_tx_type
      AND t.date BETWEEN p_from AND p_to
      AND t.status NOT IN ('needs_review')
      AND (
        p_mode = 'full'
        OR s.analysis_start_date IS NULL
        OR t.date >= s.analysis_start_date
      )
  ),
  tx_net AS (
    SELECT
      f.id,
      f.category_id,
      COALESCE(SUM(te.amount_pln), 0) AS net_pln
    FROM filtered f
    JOIN transaction_entries te ON te.transaction_id = f.id
    GROUP BY f.id, f.category_id
  ),
  tx_amount AS (
    SELECT
      id,
      category_id,
      CASE
        WHEN p_tx_type = 'expense' THEN -net_pln
        WHEN p_tx_type = 'income' THEN net_pln
        ELSE 0::numeric
      END AS amount_pln
    FROM tx_net
  )
  SELECT
    ta.category_id,
    c.name AS category_name,
    COALESCE(SUM(ta.amount_pln), 0)::numeric(18, 2),
    COUNT(*) FILTER (WHERE ta.amount_pln <> 0)::bigint
  FROM tx_amount ta
  LEFT JOIN categories c ON c.id = ta.category_id
  GROUP BY ta.category_id, c.name
  HAVING COALESCE(SUM(ta.amount_pln), 0) <> 0
  ORDER BY 3 DESC;
$$;

CREATE OR REPLACE FUNCTION get_uncategorized_stats(
  p_from    date,
  p_to      date,
  p_mode    text DEFAULT 'current'
)
RETURNS TABLE (
  tx_type   text,
  tx_count  bigint,
  total_pln numeric(18, 2)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  ),
  filtered AS (
    SELECT t.id, t.type
    FROM transactions t
    CROSS JOIN settings s
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.category_id IS NULL
      AND t.type IN ('expense', 'income')
      AND t.date BETWEEN p_from AND p_to
      AND t.status NOT IN ('needs_review')
      AND (
        p_mode = 'full'
        OR s.analysis_start_date IS NULL
        OR t.date >= s.analysis_start_date
      )
  ),
  tx_net AS (
    SELECT
      f.id,
      f.type,
      COALESCE(SUM(te.amount_pln), 0) AS net_pln
    FROM filtered f
    JOIN transaction_entries te ON te.transaction_id = f.id
    GROUP BY f.id, f.type
  )
  SELECT
    type::text,
    COUNT(*) FILTER (WHERE amount_pln <> 0)::bigint,
    COALESCE(SUM(amount_pln), 0)::numeric(18, 2)
  FROM (
    SELECT
      type,
      CASE
        WHEN type = 'expense' THEN -net_pln
        WHEN type = 'income' THEN net_pln
        ELSE 0::numeric
      END AS amount_pln
    FROM tx_net
  ) x
  GROUP BY type;
$$;
