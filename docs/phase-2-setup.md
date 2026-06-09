# Faza 2 — Zastosowanie migracji na Supabase

Migracje są w `supabase/migrations/`. Połączony plik: `supabase/apply_all_migrations.sql`.

## Sposób A — SQL Editor (najszybszy, bez CLI)

1. Otwórz [Supabase Dashboard](https://supabase.com/dashboard) → projekt **finanse-dev**
2. **SQL Editor** → **New query**
3. Otwórz lokalnie plik `supabase/apply_all_migrations.sql`
4. Skopiuj całą zawartość → wklej → **Run**
5. Sprawdź **Table Editor** — powinny być tabele: `accounts`, `transactions`, `currencies`…

## Sposób B — Supabase CLI

```powershell
supabase login
cd c:\projekty\finanse
supabase link --project-ref nmmdmjfquldysrawatae
supabase db push
```

## Sposób C — Skrypt Node (connection string)

1. Supabase → **Project Settings** → **Database** → **Connection string** (URI)
2. Dodaj do `.env.local`:
   ```
   SUPABASE_DB_URL=postgresql://postgres.[ref]:[HASLO]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
3. Uruchom:
   ```powershell
   npm install pg
   node scripts/apply-migrations.mjs
   ```

## Weryfikacja

W SQL Editor:

```sql
SELECT code, name FROM currencies;
-- PLN, EUR, USD

SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Tabele (15)

| Tabela | Opis |
|--------|------|
| `currencies` | PLN, EUR, USD |
| `accounts` | Konta bankowe, gotówka, broker… |
| `categories` / `subcategories` | Kategorie wydatków/przychodów |
| `exchange_rates` | Kursy historyczne |
| `transactions` | Nagłówki transakcji |
| `transaction_entries` | Nogi księgowe (+/−) |
| `imports` / `import_rows` | Staging importu Excel |
| `audit_log` | Historia zmian |
| `monthly_snapshots` | Snapshoty miesięczne |
| `goals` | Cele finansowe |
| `instruments` + inwestycje | Moduł inwestycji (Faza 7) |

## Funkcje SQL

| Funkcja | Opis |
|---------|------|
| `get_account_balance(account_id, date)` | Saldo konta w PLN |
| `get_account_balances(date)` | Salda wszystkich kont |
| `get_monthly_cashflow(year, month)` | Przychody / wydatki / nadwyżka |
| `get_net_worth(date)` | Majątek netto |
| `get_category_breakdown(from, to)` | Wydatki wg kategorii |
| `get_needs_review_count()` | Liczba transakcji 🔴 |

Wszystkie funkcje respektują RLS (`auth.uid()`).
