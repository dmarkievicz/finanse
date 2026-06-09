-- Faza 2: moduł inwestycji (schema — UI w Fazie 7)

CREATE TABLE instruments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  symbol           text,
  instrument_type  text NOT NULL
    CHECK (instrument_type IN ('ETF', 'GOLD', 'BOND', 'DEPOSIT', 'CASH', 'REAL_ESTATE', 'LOAN', 'CRYPTO', 'OTHER')),
  currency         text NOT NULL REFERENCES currencies(code) DEFAULT 'PLN',
  account_id       uuid REFERENCES accounts(id) ON DELETE SET NULL,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

CREATE TABLE investment_transactions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id          uuid NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
  date                   date NOT NULL,
  type                   text NOT NULL
    CHECK (type IN ('buy', 'sell', 'dividend', 'coupon', 'interest', 'fee', 'tax', 'transfer', 'split')),
  quantity               numeric(28, 8),
  price_per_unit         numeric(18, 6),
  amount                 numeric(18, 2) NOT NULL,
  currency               text NOT NULL REFERENCES currencies(code),
  exchange_rate          numeric(18, 6) NOT NULL DEFAULT 1,
  amount_pln             numeric(18, 2) NOT NULL,
  fees                   numeric(18, 2) NOT NULL DEFAULT 0,
  linked_transaction_id  uuid REFERENCES transactions(id) ON DELETE SET NULL,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz
);

CREATE TABLE instrument_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id  uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           date NOT NULL,
  price          numeric(18, 6) NOT NULL,
  currency       text NOT NULL REFERENCES currencies(code),
  source         text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'api', 'nbp')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instrument_id, date)
);

CREATE TABLE portfolio_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_instruments_user ON instruments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_investment_transactions_instrument ON investment_transactions(instrument_id, date DESC);
CREATE INDEX idx_instrument_prices_date ON instrument_prices(instrument_id, date DESC);
