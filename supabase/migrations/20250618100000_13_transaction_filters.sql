-- Indeksy i agregacja dla filtrowania transakcji (22k+ rekordów)

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_type
  ON transactions (user_id, type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_status
  ON transactions (user_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_category
  ON transactions (user_id, category_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_entries_account
  ON transaction_entries (account_id, transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_entries_currency
  ON transaction_entries (currency);

-- Podsumowanie transakcji dla aktywnych filtrów (bez paginacji)
CREATE OR REPLACE FUNCTION get_transactions_summary(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_subcategory_id uuid DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
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
    LEFT JOIN transaction_entries te ON te.transaction_id = t.id
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

-- Pomocnicze: ID transakcji pasujących do filtra kwoty (ABS amount_pln)
CREATE OR REPLACE FUNCTION get_transaction_ids_by_amount(
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT DISTINCT t.id
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND (p_amount_min IS NULL OR ABS(te.amount_pln) >= p_amount_min)
    AND (p_amount_max IS NULL OR ABS(te.amount_pln) <= p_amount_max);
$$;
