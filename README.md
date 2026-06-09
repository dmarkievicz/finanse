# Finanse Damian

Prywatny system zarządzania finansami osobistymi — transfery, cashflow, inwestycje, majątek netto.

**Stack:** Next.js · Supabase · Vercel · GitHub

---

## Status projektu

| Faza | Status | Opis |
|------|--------|------|
| **0 — Przygotowanie** | ✅ | Audyt danych, dokumentacja, Supabase, GitHub |
| **1 — Fundament** | 🟡 W trakcie | Next.js, Auth, layout |
| 2 — Schemat bazy | ⬜ | Migracje SQL, RLS |
| 3 — Import Excel | ⬜ | 22k+ wierszy |
| … | | |

Szczegóły: [`docs/phase-0-checklist.md`](docs/phase-0-checklist.md)

---

## Uruchomienie (Faza 1)

```bash
npm run dev
```

→ http://localhost:3000

Szczegóły: [`docs/phase-1-setup.md`](docs/phase-1-setup.md)

---

## Faza 0 — archiwum

### 1. Eksportuj dane z Excela

```
Excel → Zapisz jako → CSV UTF-8 → data/raw/transactions.csv
```

### 2. Uruchom audyt

```bash
npm run audit          # Excel (.xlsx) w data/raw/
npm run audit:csv      # CSV w data/raw/
```

### 3. Uzupełnij dokumentację

- [`docs/source-data-audit.md`](docs/source-data-audit.md) — na podstawie raportu
- Przejrzyj [`docs/data-model.md`](docs/data-model.md) i [`docs/import-spec.md`](docs/import-spec.md)

### 4. Załóż Supabase + GitHub

**Pełna instrukcja:** [`docs/setup-supabase-github.md`](docs/setup-supabase-github.md)

```bash
cp .env.example .env.local
# uzupełnij klucze Supabase
```

---

## Dokumentacja

| Plik | Opis |
|------|------|
| [`docs/phase-0-checklist.md`](docs/phase-0-checklist.md) | Checklist Fazy 0 |
| [`docs/source-data-audit.md`](docs/source-data-audit.md) | Audyt danych z Excela |
| [`docs/data-model.md`](docs/data-model.md) | Schemat bazy danych |
| [`docs/import-spec.md`](docs/import-spec.md) | Specyfikacja importu CSV |
| [`docs/security.md`](docs/security.md) | Bezpieczeństwo, RLS, MFA |

---

## Struktura projektu

```
finanse/
├── data/
│   ├── raw/          # CSV z Excela (nie w Git — .gitignore)
│   ├── processed/    # Raporty audytu
│   └── samples/      # Próbki testowe
├── docs/             # Dokumentacja
├── scripts/          # Narzędzia (audyt CSV)
└── README.md
```

---

## Narzędzia lokalne

| Narzędzie | Wersja | Status |
|-----------|--------|--------|
| Node.js | v24+ | ✅ |
| Git | 2.53+ | ✅ |
| Supabase CLI | 2.105+ | ✅ |

---

## Bezpieczeństwo

- Pliki CSV z danymi finansowymi **nie trafiają do Git** (`.gitignore`)
- Klucze API tylko w `.env.local` (nie commituj)
- MFA obowiązkowe na produkcji

Szczegóły: [`docs/security.md`](docs/security.md)
