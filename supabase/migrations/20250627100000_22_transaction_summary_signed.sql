-- Podsumowania listy transakcji: zwroty wydatków i ujemne przychody

CREATE OR REPLACE FUNCTION get_transactions_summary(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_subcategory_id uuid DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
  p_source_account_id uuid DEFAULT NULL,
  p_target_account_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL,
  p_import_only boolean DEFAULT false,
  p_manual_only boolean DEFAULT false,
  p_include_reconciled boolean DEFAULT false
)
RETURNS TABLE (
  tx_count bigint,
  income_total numeric(18, 2),
  expense_total numeric(18, 2),
  max_income numeric(18, 2),
  max_expense numeric(18, 2)
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT DISTINCT t.id, t.type
    FROM transactions t
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.status <> 'needs_review'
      AND (p_include_reconciled OR t.status <> 'reconciled')
      AND (p_date_from IS NULL OR t.date >= p_date_from)
      AND (p_date_to IS NULL OR t.date <= p_date_to)
      AND (p_type IS NULL OR p_type = 'all' OR t.type = p_type)
      AND (p_category_id IS NULL OR t.category_id = p_category_id)
      AND (p_subcategory_id IS NULL OR t.subcategory_id = p_subcategory_id)
      AND (
        p_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te2
          WHERE te2.transaction_id = t.id AND te2.account_id = p_account_id
        )
      )
      AND (
        p_source_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te_s
          WHERE te_s.transaction_id = t.id
            AND te_s.account_id = p_source_account_id
            AND te_s.amount_pln < 0
        )
      )
      AND (
        p_target_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te_t
          WHERE te_t.transaction_id = t.id
            AND te_t.account_id = p_target_account_id
            AND te_t.amount_pln > 0
        )
      )
      AND (
        p_search IS NULL OR p_search = ''
        OR t.details ILIKE '%' || p_search || '%'
        OR t.description ILIKE '%' || p_search || '%'
      )
      AND (NOT p_import_only OR t.import_id IS NOT NULL)
      AND (NOT p_manual_only OR t.import_id IS NULL)
      AND (
        p_currency IS NULL OR p_currency = ''
        OR EXISTS (
          SELECT 1 FROM transaction_entries te3
          WHERE te3.transaction_id = t.id AND te3.currency = p_currency
        )
      )
      AND (
        p_amount_min IS NULL AND p_amount_max IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te4
          WHERE te4.transaction_id = t.id
            AND (p_amount_min IS NULL OR ABS(te4.amount_pln) >= p_amount_min)
            AND (p_amount_max IS NULL OR ABS(te4.amount_pln) <= p_amount_max)
        )
      )
  ),
  entry_totals AS (
    SELECT
      b.id,
      b.type,
      COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2) AS net_pln
    FROM base b
    LEFT JOIN transaction_entries te ON te.transaction_id = b.id
    GROUP BY b.id, b.type
  ),
  flows AS (
    SELECT
      id,
      type,
      net_pln,
      CASE
        WHEN type = 'income' THEN net_pln
        WHEN type = 'expense' AND net_pln > 0 THEN net_pln
        ELSE 0
      END::numeric(18, 2) AS income_part,
      CASE
        WHEN type = 'expense' AND net_pln < 0 THEN -net_pln
        ELSE 0
      END::numeric(18, 2) AS expense_part
    FROM entry_totals
    WHERE type IN ('income', 'expense')
  )
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(income_part), 0)::numeric(18, 2),
    COALESCE(SUM(expense_part), 0)::numeric(18, 2),
    COALESCE(MAX(income_part), 0)::numeric(18, 2),
    COALESCE(MAX(expense_part), 0)::numeric(18, 2)
  FROM flows;
$$;

CREATE OR REPLACE FUNCTION get_transactions_daily_breakdown(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_subcategory_id uuid DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
  p_source_account_id uuid DEFAULT NULL,
  p_target_account_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL,
  p_import_only boolean DEFAULT false,
  p_manual_only boolean DEFAULT false,
  p_include_reconciled boolean DEFAULT false
)
RETURNS TABLE (
  day date,
  income_pln numeric(18, 2),
  expense_pln numeric(18, 2),
  tx_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT t.id, t.date, t.type
    FROM transactions t
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND t.status <> 'needs_review'
      AND (p_include_reconciled OR t.status <> 'reconciled')
      AND (p_date_from IS NULL OR t.date >= p_date_from)
      AND (p_date_to IS NULL OR t.date <= p_date_to)
      AND (p_type IS NULL OR p_type = 'all' OR t.type = p_type)
      AND (p_category_id IS NULL OR t.category_id = p_category_id)
      AND (p_subcategory_id IS NULL OR t.subcategory_id = p_subcategory_id)
      AND (
        p_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te2
          WHERE te2.transaction_id = t.id AND te2.account_id = p_account_id
        )
      )
      AND (
        p_source_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te_s
          WHERE te_s.transaction_id = t.id
            AND te_s.account_id = p_source_account_id
            AND te_s.amount_pln < 0
        )
      )
      AND (
        p_target_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te_t
          WHERE te_t.transaction_id = t.id
            AND te_t.account_id = p_target_account_id
            AND te_t.amount_pln > 0
        )
      )
      AND (
        p_search IS NULL OR p_search = ''
        OR t.details ILIKE '%' || p_search || '%'
        OR t.description ILIKE '%' || p_search || '%'
      )
      AND (NOT p_import_only OR t.import_id IS NOT NULL)
      AND (NOT p_manual_only OR t.import_id IS NULL)
      AND (
        p_currency IS NULL OR p_currency = ''
        OR EXISTS (
          SELECT 1 FROM transaction_entries te3
          WHERE te3.transaction_id = t.id AND te3.currency = p_currency
        )
      )
      AND (
        p_amount_min IS NULL AND p_amount_max IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te4
          WHERE te4.transaction_id = t.id
            AND (p_amount_min IS NULL OR ABS(te4.amount_pln) >= p_amount_min)
            AND (p_amount_max IS NULL OR ABS(te4.amount_pln) <= p_amount_max)
        )
      )
  ),
  entry_sums AS (
    SELECT
      b.id,
      b.date,
      b.type,
      COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2) AS net_pln
    FROM base b
    LEFT JOIN transaction_entries te ON te.transaction_id = b.id
    GROUP BY b.id, b.date, b.type
  ),
  flows AS (
    SELECT
      date,
      CASE
        WHEN type = 'income' THEN net_pln
        WHEN type = 'expense' AND net_pln > 0 THEN net_pln
        ELSE 0
      END::numeric(18, 2) AS income_part,
      CASE
        WHEN type = 'expense' AND net_pln < 0 THEN -net_pln
        ELSE 0
      END::numeric(18, 2) AS expense_part
    FROM entry_sums
    WHERE type IN ('income', 'expense')
  )
  SELECT
    f.date AS day,
    COALESCE(SUM(f.income_part), 0)::numeric(18, 2),
    COALESCE(SUM(f.expense_part), 0)::numeric(18, 2),
    COUNT(*)::bigint
  FROM flows f
  GROUP BY f.date
  ORDER BY f.date DESC;
$$;
