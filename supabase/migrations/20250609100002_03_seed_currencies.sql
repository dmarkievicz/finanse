-- Waluty bazowe (globalne, bez user_id)

INSERT INTO currencies (code, name, symbol, is_base) VALUES
  ('PLN', 'Polski złoty', 'zł', true),
  ('EUR', 'Euro', '€', false),
  ('USD', 'Dolar amerykański', '$', false)
ON CONFLICT (code) DO NOTHING;
