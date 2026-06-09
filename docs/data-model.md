# Model danych — Finanse Damian

> **Wersja:** 0.1 (Faza 0)  
> **Baza:** PostgreSQL (Supabase)  
> **Waluta bazowa:** PLN

---

## Zasady ogólne

1. **Każda tabela z danymi użytkownika** ma kolumnę `user_id` + RLS.
2. **Pieniądze** — typ `numeric(18,2)`, nigdy `float` / `double precision`.
3. **Ilości instrumentów** (ETF, złoto) — `numeric(28,8)`.
4. **Kursy walut** — `numeric(18,6)`.
5. **Soft delete** — kolumna `deleted_at timestamptz` zamiast fizycznego usuwania.
6. **Audyt** — tabela `audit_log` dla zmian krytycznych.
7. **Transfery** — modelowane przez `transaction_entries` (dwie nogi), nie jako expense/income.

---

## Diagram relacji (rdzeń)

```
users (Supabase Auth)
  │
  ├── accounts
  ├── categories ── subcategories
  ├── currencies
  ├── exchange_rates
  │
  ├── imports ── import_rows
  │
  ├── transactions ── transaction_entries ── accounts
  │                      │
  │                      └── currencies
  │
  ├── audit_log
  └── monthly_snapshots

users
  │
  ├── instruments (assets)
  ├── investment_transactions ── instruments
  ├── instrument_prices
  └── portfolio_snapshots
```

---

## Moduł 1: Słowniki

### `currencies`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| code | text UNIQUE | `PLN`, `EUR`, `USD` |
| name | text | Pełna nazwa |
| symbol | text | `zł`, `€`, `$` |
| is_base | boolean | `true` tylko dla PLN |

### `accounts`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| name | text | np. „mBank", „XTB" |
| account_type | text | `bank`, `cash`, `broker`, `deposit`, `loan`, `real_estate`, `other` |
| default_currency | text FK → currencies.code | |
| is_active | boolean | |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | Soft delete |

### `categories`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | np. „Jedzenie" |
| type | text | `income`, `expense`, `both` |
| color | text | Hex do wykresów |
| icon | text | Opcjonalnie |
| sort_order | int | |
| deleted_at | timestamptz | |

### `subcategories`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| category_id | uuid FK → categories | |
| user_id | uuid FK | |
| name | text | np. „Restauracje" |
| deleted_at | timestamptz | |

### `exchange_rates`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| date | date | Data kursu |
| from_currency | text FK | np. `EUR` |
| to_currency | text FK | zawsze `PLN` |
| rate | numeric(18,6) | |
| source | text | `nbp`, `manual`, `import` |
| created_at | timestamptz | |

UNIQUE: `(date, from_currency, to_currency)`

---

## Moduł 2: Transakcje (rdzeń systemu)

### `transactions` — nagłówek transakcji

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date | Data transakcji |
| type | text | `income`, `expense`, `transfer`, `exchange`, `adjustment` |
| description | text | Skrócony opis |
| details | text | Wolny tekst (z Excela: Details) |
| category_id | uuid FK → categories | NULL dla transferów |
| subcategory_id | uuid FK → subcategories | |
| import_id | uuid FK → imports | NULL jeśli ręczna |
| import_row_id | uuid FK → import_rows | |
| status | text | `confirmed`, `pending`, `reconciled`, **`needs_review`** 🔴 |
| validation_issues | jsonb | Lista kodów błędów/ostrzeżeń, np. `[{"code":"R001","message":"..."}]` |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | |

### `transaction_entries` — nogi księgowe

> Serce systemu. Jedna transakcja = 1 lub więcej entries.

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| transaction_id | uuid FK → transactions | |
| user_id | uuid FK | |
| account_id | uuid FK → accounts | |
| amount | numeric(18,2) | Z **znakiem**: + wpływ, − wypływ |
| currency | text FK → currencies.code | |
| exchange_rate | numeric(18,6) | Kurs do PLN w dniu transakcji |
| amount_pln | numeric(18,2) | `amount × exchange_rate` (zaokrąglone) |
| sort_order | int | Kolejność nóg |
| created_at | timestamptz | |

**Przykłady:**

| Scenariusz | Entries |
|------------|---------|
| Wydatek 100 PLN z mBank | mBank: `-100 PLN` |
| Przelew 5000 PLN mBank → XTB | mBank: `-5000`, XTB: `+5000` |
| Przewalutowanie 1000 PLN → 230 EUR | mBank PLN: `-1000`, Revolut EUR: `+230` (z kursem) |
| Zakup ETF za 3000 PLN | XTB cash: `-3000`, XTB ETF: `+3000` (moduł inwestycji) |

---

## Moduł 3: Import

### `imports`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| filename | text | Oryginalna nazwa pliku |
| file_hash | text | SHA-256 pliku |
| status | text | `staged`, `validated`, `imported`, `failed` |
| total_rows | int | |
| imported_rows | int | |
| skipped_rows | int | |
| error_rows | int | |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| error_log | jsonb | |

### `import_rows` — staging

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| import_id | uuid FK | |
| user_id | uuid FK | |
| row_number | int | Numer wiersza w pliku |
| raw_data | jsonb | Surowy wiersz z CSV |
| import_hash | text UNIQUE per user | Hash antyduplikatowy |
| status | text | `pending`, `valid`, `error`, `imported`, `skipped` |
| validation_errors | jsonb | |
| transaction_id | uuid FK | Po imporcie |

**import_hash** = hash z: `date + type + amount + currency + source_account + target_account + details`

---

## Moduł 4: Audyt i snapshoty

### `audit_log`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| table_name | text | |
| record_id | uuid | |
| action | text | `insert`, `update`, `delete` |
| old_data | jsonb | |
| new_data | jsonb | |
| created_at | timestamptz | |

### `monthly_snapshots`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| year | int | |
| month | int | |
| snapshot_date | date | Ostatni dzień miesiąca |
| data | jsonb | Salda kont, podsumowania, net worth |
| created_at | timestamptz | |

UNIQUE: `(user_id, year, month)`

---

## Moduł 5: Inwestycje

### `instruments`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | np. „iShares MSCI World" |
| symbol | text | Ticker / ISIN |
| instrument_type | text | `ETF`, `GOLD`, `BOND`, `DEPOSIT`, `CASH`, `REAL_ESTATE`, `LOAN`, `CRYPTO`, `OTHER` |
| currency | text FK | Waluta nominacji |
| account_id | uuid FK → accounts | Konto powiązane (np. XTB) |
| metadata | jsonb | Oprocentowanie, data zapadalności itd. |
| is_active | boolean | |
| deleted_at | timestamptz | |

### `investment_transactions`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| instrument_id | uuid FK | |
| date | date | |
| type | text | `buy`, `sell`, `dividend`, `coupon`, `interest`, `fee`, `tax`, `transfer`, `split` |
| quantity | numeric(28,8) | Ilość jednostek |
| price_per_unit | numeric(18,6) | |
| amount | numeric(18,2) | Kwota w walucie instrumentu |
| currency | text FK | |
| exchange_rate | numeric(18,6) | |
| amount_pln | numeric(18,2) | |
| fees | numeric(18,2) | Prowizja |
| linked_transaction_id | uuid FK → transactions | Powiązanie z transferem gotówki |
| notes | text | |
| deleted_at | timestamptz | |

### `instrument_prices`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| instrument_id | uuid FK | |
| date | date | |
| price | numeric(18,6) | Cena jednostkowa |
| currency | text FK | |
| source | text | `manual`, `api`, `nbp` |

UNIQUE: `(instrument_id, date)`

### `portfolio_snapshots`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date | |
| data | jsonb | Wartość per instrument, alokacja, zysk/strata |
| created_at | timestamptz | |

---

## Moduł 6: Cele

### `goals`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | np. „1 mln PLN do 2029" |
| goal_type | text | `net_worth`, `liquid_assets`, `retirement`, `allocation`, `emergency_fund` |
| target_amount | numeric(18,2) | |
| target_date | date | |
| current_amount | numeric(18,2) | Aktualizowane przez funkcję |
| parameters | jsonb | Np. `{ "min_etf_pct": 30, "max_bonds_pct": 40 }` |
| is_active | boolean | |

---

## Moduł 7: Załączniki

Pliki w **Supabase Storage** (bucket `attachments`), metadane w tabeli:

### `attachments`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| transaction_id | uuid FK | Opcjonalnie |
| investment_transaction_id | uuid FK | Opcjonalnie |
| storage_path | text | Ścieżka w bucket |
| filename | text | |
| mime_type | text | |
| size_bytes | int | |
| created_at | timestamptz | |

---

## Funkcje SQL (do implementacji w Fazie 2)

| Funkcja | Opis |
|---------|------|
| `get_account_balance(account_id, as_of_date)` | Saldo konta w PLN |
| `get_account_balances(user_id, as_of_date)` | Salda wszystkich kont |
| `get_monthly_cashflow(user_id, year, month)` | Przychody, wydatki, nadwyżka (bez transferów) |
| `get_net_worth(user_id, as_of_date)` | Majątek netto |
| `get_category_breakdown(user_id, from, to)` | Wydatki per kategoria |
| `refresh_portfolio_snapshot(user_id, date)` | Przeliczenie snapshotu inwestycji |

---

## Indeksy (kluczowe)

```sql
-- Transakcje
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_transaction_entries_account ON transaction_entries(account_id);
CREATE INDEX idx_transaction_entries_user ON transaction_entries(user_id);

-- Import
CREATE UNIQUE INDEX idx_import_rows_hash ON import_rows(user_id, import_hash);

-- Kursy
CREATE UNIQUE INDEX idx_exchange_rates_date ON exchange_rates(date, from_currency, to_currency);

-- Inwestycje
CREATE INDEX idx_investment_transactions_instrument ON investment_transactions(instrument_id, date DESC);
CREATE INDEX idx_instrument_prices_date ON instrument_prices(instrument_id, date DESC);
```

---

## Historia wersji

| Wersja | Data | Zmiany |
|--------|------|--------|
| 0.1 | 2025-06-09 | Wersja początkowa — Faza 0 |
