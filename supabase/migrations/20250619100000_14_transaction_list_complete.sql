-- Rozszerzenie filtrów: konto źródłowe/docelowe, widok miesięczny, sortowanie listy

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
      COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2) AS net_pln,
      MAX(CASE WHEN te.amount_pln > 0 THEN te.amount_pln END)::numeric(18, 2) AS max_pos,
      MIN(CASE WHEN te.amount_pln < 0 THEN te.amount_pln END)::numeric(18, 2) AS max_neg
    FROM base b
    LEFT JOIN transaction_entries te ON te.transaction_id = b.id
    GROUP BY b.id, b.type
  )
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(CASE WHEN type = 'income' THEN GREATEST(net_pln, 0) ELSE 0 END), 0)::numeric(18, 2),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(LEAST(net_pln, 0)) ELSE 0 END), 0)::numeric(18, 2),
    COALESCE(MAX(CASE WHEN type = 'income' THEN max_pos END), 0)::numeric(18, 2),
    COALESCE(MAX(CASE WHEN type = 'expense' THEN ABS(max_neg) END), 0)::numeric(18, 2)
  FROM entry_totals;
$$;

-- Dzienne podsumowanie dla widoku miesięcznego (pełny zakres filtrów)
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
            AND te_s.account_id = p_source_account_id AND te_s.amount_pln < 0
        )
      )
      AND (
        p_target_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te_t
          WHERE te_t.transaction_id = t.id
            AND te_t.account_id = p_target_account_id AND te_t.amount_pln > 0
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
  )
  SELECT
    e.date AS day,
    COALESCE(SUM(CASE WHEN e.type = 'income' THEN GREATEST(e.net_pln, 0) ELSE 0 END), 0)::numeric(18, 2),
    COALESCE(SUM(CASE WHEN e.type = 'expense' THEN ABS(LEAST(e.net_pln, 0)) ELSE 0 END), 0)::numeric(18, 2),
    COUNT(*)::bigint
  FROM entry_sums e
  GROUP BY e.date
  ORDER BY e.date DESC;
$$;

-- ID transakcji z sortowaniem i paginacją
CREATE OR REPLACE FUNCTION get_transaction_page_ids(
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
  p_include_reconciled boolean DEFAULT false,
  p_sort text DEFAULT 'date',
  p_sort_dir text DEFAULT 'desc',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (id uuid, total_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT
      t.id,
      t.date AS tx_date,
      t.created_at,
      t.type AS tx_type,
      c.name AS category_name,
      COALESCE(
        (
          SELECT MAX(ABS(te.amount_pln))
          FROM transaction_entries te
          WHERE te.transaction_id = t.id
        ),
        0
      )::numeric(18, 2) AS sort_amount
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
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
            AND te_s.account_id = p_source_account_id AND te_s.amount_pln < 0
        )
      )
      AND (
        p_target_account_id IS NULL
        OR EXISTS (
          SELECT 1 FROM transaction_entries te_t
          WHERE te_t.transaction_id = t.id
            AND te_t.account_id = p_target_account_id AND te_t.amount_pln > 0
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
  counted AS (
    SELECT COUNT(*)::bigint AS cnt FROM base
  ),
  ordered AS (
    SELECT b.id
    FROM base b
    ORDER BY
      CASE WHEN p_sort = 'amount' AND p_sort_dir = 'asc' THEN b.sort_amount END ASC NULLS LAST,
      CASE WHEN p_sort = 'amount' AND p_sort_dir = 'desc' THEN b.sort_amount END DESC NULLS LAST,
      CASE WHEN p_sort = 'category' AND p_sort_dir = 'asc' THEN b.category_name END ASC NULLS LAST,
      CASE WHEN p_sort = 'category' AND p_sort_dir = 'desc' THEN b.category_name END DESC NULLS LAST,
      CASE WHEN p_sort_dir = 'asc' THEN b.tx_date END ASC NULLS LAST,
      CASE WHEN p_sort_dir = 'desc' THEN b.tx_date END DESC NULLS LAST,
      CASE WHEN p_sort_dir = 'asc' THEN b.created_at END ASC NULLS LAST,
      CASE WHEN p_sort_dir = 'desc' THEN b.created_at END DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset
  )
  SELECT o.id, c.cnt FROM ordered o CROSS JOIN counted c;
$$;
