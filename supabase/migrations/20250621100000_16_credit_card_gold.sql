-- Karty kredytowe jako typ konta; złoto = instrument GOLD, nie konto operacyjne

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN (
    'bank', 'cash', 'broker', 'deposit', 'loan', 'real_estate',
    'investment', 'credit_card', 'other'
  ));

UPDATE accounts
SET
  show_on_dashboard = false,
  include_in_net_worth = false,
  needs_review = true,
  notes = CASE
    WHEN notes IS NULL OR trim(notes) = '' THEN
      'Złoto należy do modułu Inwestycje (instrument typu GOLD), nie do kont operacyjnych.'
    WHEN notes NOT ILIKE '%instrument typu GOLD%' THEN
      notes || E'\n\nZłoto należy do modułu Inwestycje (instrument typu GOLD), nie do kont operacyjnych.'
    ELSE notes
  END
WHERE deleted_at IS NULL
  AND name ~* 'złoto|zlot';
