-- Analityka kategorii: wydatki/przychody, podkategorie, trendy, bundle

-- =============================================================================
-- 1. Breakdown wg typu transakcji (expense / income)
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
    COALESCE(SUM(ABS(te.amount_pln)), 0)::numeric(18, 2),
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

-- Zachowaj dotychczasowe zachowanie get_category_breakdown (tylko wydatki)
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
  SELECT * FROM get_category_breakdown_typed(p_from, p_to, p_mode, 'expense');
$$;

-- =============================================================================
-- 2. Podkategorie
-- =============================================================================

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
    COALESCE(SUM(ABS(te.amount_pln)), 0)::numeric(18, 2),
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

-- =============================================================================
-- 3. Serie miesięczne (sparkline)
-- =============================================================================

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
    COALESCE(SUM(ABS(te.amount_pln)), 0)::numeric(18, 2)
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

-- =============================================================================
-- 4. Jakość danych (bez kategorii)
-- =============================================================================

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
    COALESCE(SUM(ABS(te.amount_pln)), 0)::numeric(18, 2)
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

-- =============================================================================
-- 5. Bundle analityki kategorii
-- =============================================================================

CREATE OR REPLACE FUNCTION get_categories_analytics_bundle(
  p_current_from date,
  p_current_to   date,
  p_prev_from    date,
  p_prev_to      date,
  p_mode         text DEFAULT 'current',
  p_budget_year  int  DEFAULT NULL,
  p_budget_month int  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH
  exp_curr AS (
    SELECT * FROM get_category_breakdown_typed(p_current_from, p_current_to, p_mode, 'expense')
  ),
  exp_prev AS (
    SELECT * FROM get_category_breakdown_typed(p_prev_from, p_prev_to, p_mode, 'expense')
  ),
  inc_curr AS (
    SELECT * FROM get_category_breakdown_typed(p_current_from, p_current_to, p_mode, 'income')
  ),
  inc_prev AS (
    SELECT * FROM get_category_breakdown_typed(p_prev_from, p_prev_to, p_mode, 'income')
  ),
  sub_exp AS (
    SELECT * FROM get_subcategory_breakdown(p_current_from, p_current_to, p_mode, 'expense')
  ),
  sub_inc AS (
    SELECT * FROM get_subcategory_breakdown(p_current_from, p_current_to, p_mode, 'income')
  ),
  monthly_exp AS (
    SELECT * FROM get_category_monthly_totals(p_current_to, 12, p_mode, 'expense')
  ),
  monthly_inc AS (
    SELECT * FROM get_category_monthly_totals(p_current_to, 12, p_mode, 'income')
  ),
  uncat AS (
    SELECT * FROM get_uncategorized_stats(p_current_from, p_current_to, p_mode)
  ),
  budgets AS (
    SELECT
      b.category_id,
      b.limit_pln::numeric(18, 2) AS limit_pln
    FROM budgets b
    WHERE b.user_id = auth.uid()
      AND p_budget_year IS NOT NULL
      AND p_budget_month IS NOT NULL
      AND b.year = p_budget_year
      AND b.month = p_budget_month
  ),
  exp_total AS (
    SELECT COALESCE(SUM(total_pln), 0) AS v FROM exp_curr WHERE category_id IS NOT NULL
  ),
  inc_total AS (
    SELECT COALESCE(SUM(total_pln), 0) AS v FROM inc_curr WHERE category_id IS NOT NULL
  )
  SELECT jsonb_build_object(
    'expense_current', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'category_name', category_name,
      'total_pln', total_pln,
      'tx_count', tx_count
    ) ORDER BY total_pln DESC) FROM exp_curr), '[]'::jsonb),
    'expense_previous', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'category_name', category_name,
      'total_pln', total_pln,
      'tx_count', tx_count
    ) ORDER BY total_pln DESC) FROM exp_prev), '[]'::jsonb),
    'income_current', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'category_name', category_name,
      'total_pln', total_pln,
      'tx_count', tx_count
    ) ORDER BY total_pln DESC) FROM inc_curr), '[]'::jsonb),
    'income_previous', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'category_name', category_name,
      'total_pln', total_pln,
      'tx_count', tx_count
    ) ORDER BY total_pln DESC) FROM inc_prev), '[]'::jsonb),
    'subcategory_expense', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'subcategory_id', subcategory_id,
      'subcategory_name', subcategory_name,
      'total_pln', total_pln,
      'tx_count', tx_count
    ) ORDER BY total_pln DESC) FROM sub_exp), '[]'::jsonb),
    'subcategory_income', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'subcategory_id', subcategory_id,
      'subcategory_name', subcategory_name,
      'total_pln', total_pln,
      'tx_count', tx_count
    ) ORDER BY total_pln DESC) FROM sub_inc), '[]'::jsonb),
    'monthly_expense', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'month_key', month_key,
      'total_pln', total_pln
    ) ORDER BY month_key, category_id) FROM monthly_exp), '[]'::jsonb),
    'monthly_income', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'month_key', month_key,
      'total_pln', total_pln
    ) ORDER BY month_key, category_id) FROM monthly_inc), '[]'::jsonb),
    'uncategorized', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'tx_type', tx_type,
      'tx_count', tx_count,
      'total_pln', total_pln
    )) FROM uncat), '[]'::jsonb),
    'budgets', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'category_id', category_id,
      'limit_pln', limit_pln
    )) FROM budgets), '[]'::jsonb),
    'expense_total', (SELECT v FROM exp_total),
    'income_total', (SELECT v FROM inc_total)
  );
$$;

-- =============================================================================
-- 6. Indeks pod agregacje kategorii
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_date_type_category
  ON transactions (user_id, date, type, category_id)
  WHERE deleted_at IS NULL AND status != 'needs_review';
