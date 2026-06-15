-- Portfele inwestycyjne powiązane z pseudo-kontami (ZŁOTO, LEGO, ETF).
-- Kapitał = suma transferów na konto; wartość rynkowa = manual_market_value_pln (override).

CREATE TABLE IF NOT EXISTS investment_portfolios (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ledger_account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  portfolio_kind           text NOT NULL
    CHECK (portfolio_kind IN ('gold', 'lego', 'etf')),
  display_name             text NOT NULL,
  manual_market_value_pln  numeric(18, 2),
  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz,
  deleted_at               timestamptz,
  UNIQUE (user_id, ledger_account_id)
);

CREATE INDEX IF NOT EXISTS idx_investment_portfolios_user
  ON investment_portfolios (user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE investment_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_portfolios_select ON investment_portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY investment_portfolios_insert ON investment_portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY investment_portfolios_update ON investment_portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY investment_portfolios_delete ON investment_portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Suma netto transferów na pseudo-konto (wpływy − wypływy).
CREATE OR REPLACE FUNCTION get_ledger_transfer_net_pln(
  p_ledger_account_id uuid,
  p_as_of_date        date DEFAULT CURRENT_DATE
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(te.amount_pln), 0)::numeric(18, 2)
  FROM transactions t
  JOIN transaction_entries te ON te.transaction_id = t.id
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.type = 'transfer'
    AND t.date <= p_as_of_date
    AND te.account_id = p_ledger_account_id;
$$;

-- Suma wartości bieżących pozycji Vault (instrumenty GOLD z metadata.vault_slot).
CREATE OR REPLACE FUNCTION get_portfolio_vault_current_value_pln(
  p_portfolio_id uuid
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(
    COALESCE(
      NULLIF((i.metadata->>'current_value_pln')::numeric, 0),
      NULLIF((i.metadata->>'purchase_price_pln')::numeric, 0),
      0
    )
  ), 0)::numeric(18, 2)
  FROM instruments i
  WHERE i.user_id = auth.uid()
    AND i.deleted_at IS NULL
    AND i.is_active = true
    AND i.instrument_type = 'GOLD'
    AND (i.metadata->>'portfolio_id')::uuid = p_portfolio_id
    AND COALESCE(i.metadata->>'vault_item', 'false') = 'true';
$$;

-- Wartość portfela: override ręczny > suma Vault > NULL (nie wliczaj do NW).
CREATE OR REPLACE FUNCTION get_portfolio_market_value_pln(
  p_portfolio_id uuid
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    p.manual_market_value_pln,
    CASE
      WHEN p.portfolio_kind = 'gold' THEN get_portfolio_vault_current_value_pln(p.id)
      ELSE NULL
    END,
    0
  )::numeric(18, 2)
  FROM investment_portfolios p
  WHERE p.id = p_portfolio_id
    AND p.user_id = auth.uid()
    AND p.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION get_portfolios_market_value_pln(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS numeric(18, 2)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(get_portfolio_market_value_pln(p.id)), 0)::numeric(18, 2)
  FROM investment_portfolios p
  WHERE p.user_id = p_user_id
    AND p.deleted_at IS NULL
    AND (
      p.manual_market_value_pln IS NOT NULL
      OR (p.portfolio_kind = 'gold' AND get_portfolio_vault_current_value_pln(p.id) > 0)
    );
$$;

-- Instrumenty: pomiń pozycje Vault (wliczane przez portfel).
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
      WHEN COALESCE(i.metadata->>'vault_item', 'false') = 'true' THEN 0
      WHEN i.metadata ? 'manual_market_value_pln'
        AND (i.metadata->>'manual_market_value_pln')::numeric > 0
        THEN (i.metadata->>'manual_market_value_pln')::numeric(18, 2)
      WHEN lp.price IS NOT NULL AND ta.qty <> 0 THEN (ta.qty * lp.price)::numeric(18, 2)
      WHEN i.metadata ? 'current_value_pln'
        AND (i.metadata->>'current_value_pln')::numeric > 0
        THEN (i.metadata->>'current_value_pln')::numeric(18, 2)
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
    + get_portfolios_market_value_pln(auth.uid())
  )::numeric(18, 2);
$$;
