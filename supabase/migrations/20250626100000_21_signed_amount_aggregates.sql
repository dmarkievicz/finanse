-- Agregacje z kwotami ze znakiem (ujemny przychód, zwrot wydatku)
-- expense netto: -SUM(amount_pln)  |  income netto: SUM(amount_pln)

-- =============================================================================
-- Cashflow miesięczny
-- =============================================================================

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
  month_start AS (
    SELECT make_date(p_year, p_month, 1) AS d
  ),
  month_end AS (
    SELECT (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date AS d
  )
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END), 0)::numeric(18, 2),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN -te.amount_pln ELSE 0 END), 0)::numeric(18, 2),
    (
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.type = 'expense' THEN -te.amount_pln ELSE 0 END), 0)
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
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN -te.amount_pln ELSE 0 END), 0)::numeric(18, 2),
    (
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.type = 'expense' THEN -te.amount_pln ELSE 0 END), 0)
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
      SUM(CASE WHEN t.type = 'expense' THEN -te.amount_pln ELSE 0 END) AS expense_pln,
      SUM(CASE WHEN t.type = 'income' THEN te.amount_pln ELSE 0 END)
        - SUM(CASE WHEN t.type = 'expense' THEN -te.amount_pln ELSE 0 END) AS surplus_pln,
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

-- =============================================================================
-- Kategorie — sumy netto (zwroty / ujemne przychody odejmują się)
-- =============================================================================

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
  )
  SELECT
    c.id,
    c.name,
    CASE
      WHEN p_tx_type = 'expense' THEN COALESCE(SUM(-te.amount_pln), 0)
      ELSE COALESCE(SUM(te.amount_pln), 0)
    END::numeric(18, 2),
    COUNT(DISTINCT t.id)
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  LEFT JOIN categories c ON c.id = t.category_id
  CROSS JOIN settings s
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.type = p_tx_type
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

CREATE OR REPLACE FUNCTION get_subcategory_breakdown(
  p_from    date,
  p_to      date,
  p_mode    text DEFAULT 'current',
  p_tx_type text DEFAULT 'expense'
)
RETURNS TABLE (
  category_id      uuid,
  subcategory_id   uuid,
  subcategory_name text,
  total_pln        numeric(18, 2),
  tx_count         bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH settings AS (
    SELECT analysis_start_date FROM user_settings WHERE user_id = auth.uid()
  )
  SELECT
    sc.category_id,
    sc.id,
    sc.name,
    CASE
      WHEN p_tx_type = 'expense' THEN COALESCE(SUM(-te.amount_pln), 0)
      ELSE COALESCE(SUM(te.amount_pln), 0)
    END::numeric(18, 2),
    COUNT(DISTINCT t.id)
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  JOIN subcategories sc ON sc.id = t.subcategory_id
  CROSS JOIN settings s
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.type = p_tx_type
    AND t.date BETWEEN p_from AND p_to
    AND t.status != 'needs_review'
    AND sc.deleted_at IS NULL
    AND (
      p_mode = 'full'
      OR s.analysis_start_date IS NULL
      OR t.date >= s.analysis_start_date
    )
  GROUP BY sc.category_id, sc.id, sc.name
  ORDER BY 4 DESC;
$$;

CREATE OR REPLACE FUNCTION get_category_monthly_totals(
  p_end_date date,
  p_months   int  DEFAULT 12,
  p_mode     text DEFAULT 'current',
  p_tx_type  text DEFAULT 'expense'
)
RETURNS TABLE (
  category_id uuid,
  month_key   text,
  total_pln   numeric(18, 2)
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
      to_char(
        (date_trunc('month', p_end_date::timestamp) - (n || ' months')::interval)::date,
        'YYYY-MM'
      ) AS month_key,
      (date_trunc('month', p_end_date::timestamp) - (n || ' months')::interval)::date AS month_start,
      (
        date_trunc('month', p_end_date::timestamp) - (n || ' months')::interval
        + interval '1 month' - interval '1 day'
      )::date AS month_end
    FROM generate_series(0, GREATEST(p_months - 1, 0)) AS n
  )
  SELECT
    t.category_id,
    m.month_key,
    CASE
      WHEN p_tx_type = 'expense' THEN COALESCE(SUM(-te.amount_pln), 0)
      ELSE COALESCE(SUM(te.amount_pln), 0)
    END::numeric(18, 2)
  FROM months m
  LEFT JOIN transactions t
    ON t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.type = p_tx_type
    AND t.status != 'needs_review'
    AND t.category_id IS NOT NULL
    AND t.date BETWEEN m.month_start AND m.month_end
  LEFT JOIN transaction_entries te ON te.transaction_id = t.id
  CROSS JOIN settings s
  WHERE (
    p_mode = 'full'
    OR s.analysis_start_date IS NULL
    OR t.id IS NULL
    OR t.date >= s.analysis_start_date
  )
  GROUP BY t.category_id, m.month_key
  HAVING t.category_id IS NOT NULL
  ORDER BY 2, 1;
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
  )
  SELECT
    t.type::text,
    COUNT(DISTINCT t.id),
    CASE
      WHEN t.type = 'expense' THEN COALESCE(SUM(-te.amount_pln), 0)
      ELSE COALESCE(SUM(te.amount_pln), 0)
    END::numeric(18, 2)
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  CROSS JOIN settings s
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.category_id IS NULL
    AND t.type IN ('expense', 'income')
    AND t.date BETWEEN p_from AND p_to
    AND t.status != 'needs_review'
    AND (
      p_mode = 'full'
      OR s.analysis_start_date IS NULL
      OR t.date >= s.analysis_start_date
    )
  GROUP BY t.type;
$$;
