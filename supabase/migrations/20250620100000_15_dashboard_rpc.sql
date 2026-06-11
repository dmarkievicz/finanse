-- Dashboard: agregacja cashflow dla okresu i historii miesięcznej

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
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.date BETWEEN p_from AND p_to
    AND t.type IN ('income', 'expense')
    AND t.status != 'needs_review'
    AND (
      p_mode = 'full'
      OR s.analysis_start_date IS NULL
      OR t.date >= s.analysis_start_date
    );
$$;

CREATE OR REPLACE FUNCTION get_cashflow_history(
  p_months     int DEFAULT 6,
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_mode       text DEFAULT 'current'
)
RETURNS TABLE (
  year        int,
  month       int,
  income_pln  numeric(18, 2),
  expense_pln numeric(18, 2),
  surplus_pln numeric(18, 2),
  has_data    boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  ),
  months AS (
    SELECT
      EXTRACT(YEAR FROM d)::int AS y,
      EXTRACT(MONTH FROM d)::int AS m,
      d::date AS month_start,
      (date_trunc('month', d) + interval '1 month' - interval '1 day')::date AS month_end
    FROM generate_series(
      date_trunc('month', p_as_of_date) - ((GREATEST(p_months, 1) - 1) || ' months')::interval,
      date_trunc('month', p_as_of_date),
      '1 month'::interval
    ) AS d
  )
  SELECT
    mo.y,
    mo.m,
    COALESCE(agg.income_pln, 0)::numeric(18, 2),
    COALESCE(agg.expense_pln, 0)::numeric(18, 2),
    COALESCE(agg.surplus_pln, 0)::numeric(18, 2),
    COALESCE(agg.has_data, false)
  FROM months mo
  LEFT JOIN LATERAL (
    SELECT
      SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END) AS income_pln,
      SUM(CASE WHEN t.type = 'expense' THEN ABS(te.amount_pln) ELSE 0 END) AS expense_pln,
      SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END)
        - SUM(CASE WHEN t.type = 'expense' THEN ABS(te.amount_pln) ELSE 0 END) AS surplus_pln,
      COUNT(DISTINCT t.id) > 0 AS has_data
    FROM transactions t
    JOIN transaction_entries te ON te.transaction_id = t.id
    CROSS JOIN settings s
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.date BETWEEN mo.month_start AND LEAST(mo.month_end, p_as_of_date)
      AND t.type IN ('income', 'expense')
      AND t.status != 'needs_review'
      AND (
        p_mode = 'full'
        OR s.analysis_start_date IS NULL
        OR t.date >= s.analysis_start_date
      )
  ) agg ON true
  ORDER BY mo.y, mo.m;
$$;
