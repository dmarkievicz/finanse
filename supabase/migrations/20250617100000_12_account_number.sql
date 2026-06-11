-- Numer konta (IBAN, rachunek maklerski itd.) — opcjonalny, do edycji przez użytkownika

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS account_number text;

COMMENT ON COLUMN accounts.account_number IS 'Opcjonalny numer rachunku / IBAN / konta maklerskiego';
