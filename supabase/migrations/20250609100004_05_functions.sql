-- Funkcje agregujące — dashboard i raporty

-- Saldo konta w PLN (suma entries do daty)
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2)
  FROM transaction_entries te
  JOIN transactions t ON t.id = te.transaction_id
  WHERE te.account_id = p_account_id
    AND t.deleted_at IS NULL
    AND t.date <= p_as_of_date
    AND t.user_id = auth.uid();
$$;

-- Salda wszystkich kont użytkownika
CREATE OR REPLACE FUNCTION get_account_balances(
  p_as_of_date date DEFAULT CURRENT_DATE
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
    COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2)
  FROM accounts a
  LEFT JOIN transaction_entries te ON te.account_id = a.id
  LEFT JOIN transactions t ON t.id = te.transaction_id
    AND t.deleted_at IS NULL
    AND t.date <= p_as_of_date
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
    AND a.is_active = true
  GROUP BY a.id, a.name, a.account_type, a.default_currency
  ORDER BY a.name;
$$;

-- Cashflow miesięczny (bez transferów i exchange)
CREATE OR REPLACE FUNCTION get_monthly_cashflow(
  p_year  int,
  p_month int
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
  WITH month_tx AS (
    SELECT t.type, te.amount_pln
    FROM transactions t
    JOIN transaction_entries te ON te.transaction_id = t.id
    WHERE t.user_id = auth.uid()
      AND t.deleted_at IS NULL
      AND EXTRACT(YEAR FROM t.date) = p_year
      AND EXTRACT(MONTH FROM t.date) = p_month
      AND t.type IN ('income', 'expense')
      AND t.status != 'needs_review'
  )
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount_pln ELSE 0 END), 0)::numeric(18, 2),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount_pln) ELSE 0 END), 0)::numeric(18, 2),
    (
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount_pln ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount_pln) ELSE 0 END), 0)
    )::numeric(18, 2)
  FROM month_tx;
$$;

-- Majątek netto (suma sald kont — bez inwestycji na razie)
CREATE OR REPLACE FUNCTION get_net_worth(
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(balance_pln), 0)::numeric(18, 2)
  FROM get_account_balances(p_as_of_date);
$$;

-- Wydatki wg kategorii w zakresie dat
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_from date,
  p_to   date
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
  SELECT
    c.id,
    c.name,
    COALESCE(SUM(ABS(te.amount_pln)), 0)::numeric(18, 2),
    COUNT(DISTINCT t.id)
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  LEFT JOIN categories c ON c.id = t.category_id
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.type = 'expense'
    AND t.date BETWEEN p_from AND p_to
    AND t.status != 'needs_review'
  GROUP BY c.id, c.name
  ORDER BY total_pln DESC;
$$;

-- Liczba transakcji wymagających przeglądu
CREATE OR REPLACE FUNCTION get_needs_review_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(*)
  FROM transactions
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    AND status = 'needs_review';
$$;
