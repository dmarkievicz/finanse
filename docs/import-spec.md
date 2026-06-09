# Specyfikacja importu — Excel/CSV → baza danych

> **Wersja:** 0.1 (Faza 0)  
> **Status:** Szkic — uzupełnić po audycie danych (`source-data-audit.md`)

---

## 1. Przepływ importu

```
Excel (.xlsx)
    │
    ▼
Eksport CSV UTF-8
    │
    ▼
Upload → data/raw/ (lokalnie) lub Storage (aplikacja)
    │
    ▼
Tabela import_rows (staging)
    │
    ▼
Walidacja + podgląd błędów
    │
    ▼
Mapowanie: nieznane konta/kategorie → słowniki
    │
    ▼
Transformacja → transactions + transaction_entries
    │
    ▼
Raport: imported / skipped / errors
```

**Zasady:**
- Import batchami po 500–1000 wierszy.
- Każdy wiersz ma `import_hash` — ponowny import tego samego wiersza = skip.
- Kurs i `amount_pln` bierzemy z pliku — **nie przeliczamy aktualnym kursem**.
- Surowe dane zostają w `import_rows.raw_data` na zawsze.

---

## 2. Mapowanie kolumn

> **Źródło:** `data/raw/Zeszyt1.xlsx` — 22 442 wierszy, audyt 2026-06-09

| Kolumna Excel | Pole staging | Pole docelowe | Transformacja |
|---------------|--------------|---------------|---------------|
| Date | `date` | `transactions.date` | Excel serial number → `YYYY-MM-DD` (np. 37987 → 2004-01-01) |
| Type | `type` | `transactions.type` | Mapowanie — sekcja 3 |
| Category | `category` | `transactions.category_id` | Lookup lub auto-create. Puste OK dla transferów |
| Subcategory | `subcategory` | `transactions.subcategory_id` | Lookup lub auto-create |
| ` Amount ` ⚠️ | `amount` | `transaction_entries.amount` | Uwaga: nagłówek ze spacjami! |
| Currency of Amount | `currency` | `transaction_entries.currency` | Puste → `PLN`. `EURO`/`Euro` → `EUR` |
| Source Account | `source_account` | `transaction_entries.account_id` | Tylko Expenses i Transfer (Source) |
| Target Account | `target_account` | `transaction_entries.account_id` | **Income i Transfer (Target)** |
| ` Exchange Rate ` ⚠️ | `exchange_rate` | `transaction_entries.exchange_rate` | Puste → `1.0` |
| _(brak w Excelu)_ | `amount_pln` | `transaction_entries.amount_pln` | **`amount × exchange_rate`** |
| Details | `details` | `transactions.details` | String, trim |

---

## 3. Mapowanie typów (Type)

> **Uzupełnij po audycie** — poniżej domyślna propozycja:

| Wartość w Excelu | `transactions.type` | Entries | Uwagi |
|------------------|---------------------|---------|-------|
| `Income` | `income` | 1: `+amount` na **Target Account** | Source zawsze puste w Excelu! |
| `Expenses` | `expense` | 1: `−amount` na **Source Account** | |
| `Transfer` | `transfer` | 2: `−amount` Source, `+amount` Target | category = NULL |
| `Exchange` / `Przewalutowanie` | `exchange` | 2: jak transfer, różne waluty | Nie występuje jako osobny typ — to Transfer z EUR |
| `Adjustment` / `Korekta` | `adjustment` | 1: `±amount` | Ręcznie w aplikacji |
| _nieznany_ | — | — | Błąd walidacji |

### Znak kwoty (Amount) — Amount zawsze dodatni w Excelu

| Typ | Source Account | Target Account |
|-----|----------------|----------------|
| income | — | `+abs(amount)` |
| expense | `−abs(amount)` | — |
| transfer | `−abs(amount)` | `+abs(amount)` |

### Normalizacja nazw kont (przed importem)

| Warianty w Excelu | Kanoniczna nazwa |
|-------------------|------------------|
| `portfel PLN` / `Portfel PLN` | Portfel PLN |
| `portfel EURO` / `Portfel EURO` | Portfel EURO |
| `permanent EURO` / `Permanent EURO` | Permanent EURO |
| `pożyczone [od]` / `Pożyczone [od]` | Pożyczone [od] |
| `mBank` | mBank PLN ✅ |
| `portfel` | Portfel PLN ✅ |

---

## 4. Walidacja wiersza

### Błędy krytyczne (wiersz odrzucony)

| Kod | Warunek | Komunikat |
|-----|---------|-----------|
| `E001` | Brak daty | „Brak daty transakcji" |
| `E002` | Nieprawidłowa data | „Nie można sparsować daty: {value}" |
| `E003` | Brak typu | „Brak typu transakcji" |
| `E004` | Nieznany typ | „Nieznany typ: {value}" |
| `E005` | Brak kwoty | „Brak kwoty" |
| `E006` | Kwota = 0 | „Kwota równa zero" |
| `E007` | Brak waluty | „Brak waluty" |
| `E008` | Nieznana waluta | „Nieobsługiwana waluta: {value}" |
| `E009` | Expense bez Source Account | „Brak konta źródłowego" — **wyjątek:** 51 świadomych wpisów gotówkowych → `W006` |
| `E010` | Transfer bez Target | „Transfer wymaga konta docelowego" |
| `E011` | Nieznane konto | „Nieznane konto: {value}" |

### Importowane z flagą 🔴 `needs_review` (czerwone w aplikacji)

Wiersz trafia do bazy, ale `transactions.status = 'needs_review'` — widoczny na czerwono, do poprawy później.

| Kod | Warunek | Komunikat | Zachowanie |
|-----|---------|-----------|------------|
| `R001` | Income bez Target Account | „Przychód bez konta docelowego" | Import nagłówka transakcji, **brak** `transaction_entries`, status `needs_review` 🔴 |
| `R002` | Transfer bez Source lub Target | „Transfer niekompletny" | Jak R001 |
| `R003` | Transfer bez obu kont | „Transfer bez kont" | Jak R001 |

> **103 wiersze Income bez Target** — nie naprawiamy w Excelu na razie; oznaczamy `R001` i poprawiamy w aplikacji.

### Ostrzeżenia (wiersz importowany z flagą żółtą)

| Kod | Warunek | Komunikat |
|-----|---------|-----------|
| `W001` | Brak kategorii przy expense/income | „Brak kategorii" |
| `W006` | Expense bez Source (gotówka) | „Wydatek bez konta — zaakceptowane" |
| `W002` | Brak Exchange Rate przy EUR/USD | „Brak kursu — użyto 1.0 lub lookup" |
| `W003` | `amount_pln ≠ amount × rate` (tolerancja 0.02) | „Rozbieżność kwoty PLN" |
| `W004` | Duplikat import_hash | „Duplikat — pominięto" |
| `W005` | Kategoria przy transferze | „Transfer z kategorią — ignorowano kategorię" |

---

## 5. Hash antyduplikatowy

```
import_hash = SHA256(
  normalize(date) + "|" +
  normalize(type) + "|" +
  normalize(amount) + "|" +
  normalize(currency) + "|" +
  normalize(source_account) + "|" +
  normalize(target_account) + "|" +
  normalize(details)
)
```

`normalize()` = lowercase, trim, collapse whitespace.

---

## 6. Auto-tworzenie słowników

Przy imporcie, jeśli wartość nie istnieje:

| Słownik | Domyślne zachowanie | Konfiguracja |
|---------|---------------------|--------------|
| Account | Utwórz z `account_type = 'other'` | Użytkownik może mapować przed importem |
| Category | Utwórz z `type` wg transakcji | Opcjonalnie: tylko ostrzeżenie |
| Subcategory | Utwórz pod kategorią | |

**Rekomendacja:** Przy pierwszym imporcie 22k wierszy — najpierw **podgląd** z listą nowych kont/kategorii, potem zatwierdzenie.

---

## 7. Reguły specjalne

### 7.1 Transfery

- `category_id` = NULL
- `subcategory_id` = NULL
- Dwie `transaction_entries` — suma wpływu na net worth = 0

### 7.2 Przewalutowanie

- `type` = `exchange`
- Source: kwota w walucie źródłowej (ujemna)
- Target: kwota w walucie docelowej (dodatnia)
- Oba kursy zapisane; `amount_pln` per entry

### 7.3 Transfery inwestycyjne (potwierdzone)

Konta docelowe: `LOKATY PLN`, `Obligacje`, `ZŁOTO`, `PZU MISS`, `PZU ZROWN.`, `XTB`, `Inwestycje PLN`.

- Importuj jako `transfer` — **nie** jako expense (brak wpływu na cashflow)
- `category_id` = NULL
- W Fazie 7: powiązać z `investment_transactions` + `instruments`
- Na dashboardzie cashflow: wykluczyć transfery na konta typu `investment`

### 7.4 Korekta salda

- `type` = `adjustment`
- Jedna entry na wskazanym koncie
- `details` musi zawierać powód

---

## 8. Kolejność importu

1. `currencies` (seed — PLN, EUR, USD)
2. `accounts` (z unikalnych Source + Target)
3. `categories` + `subcategories`
4. `exchange_rates` (opcjonalnie — unikalne pary data+waluta z pliku)
5. `imports` (nagłówek)
6. `import_rows` (staging, batch)
7. `transactions` + `transaction_entries` (po zatwierdzeniu)

---

## 9. Raport po imporcie

```json
{
  "import_id": "uuid",
  "filename": "transactions.csv",
  "total_rows": 22000,
  "imported": 21850,
  "skipped_duplicates": 100,
  "errors": 50,
  "warnings": 320,
  "new_accounts": ["Konto X"],
  "new_categories": ["Kategoria Y"],
  "date_range": { "from": "2010-01-01", "to": "2025-06-01" },
  "totals_pln": {
    "income": 1500000.00,
    "expense": 1200000.00
  }
}
```

---

## 10. Weryfikacja po imporcie

| Test | Jak sprawdzić | Tolerancja |
|------|---------------|------------|
| Liczba wierszy | COUNT vs Excel | 0 |
| Suma income PLN | SUM vs Excel | ±0.01 PLN |
| Suma expense PLN | SUM vs Excel | ±0.01 PLN |
| Salda kont | Per konto vs Excel | ±1 PLN |
| Próbka 50 losowych | Ręczne porównanie | 100% zgodności |

---

## Historia wersji

| Wersja | Data | Zmiany |
|--------|------|--------|
| 0.1 | 2025-06-09 | Wersja początkowa — Faza 0 |
