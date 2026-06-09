# Bezpieczeństwo — Finanse Damian

> **Wersja:** 0.1 (Faza 0)  
> **Zasada:** Dane finansowe prywatne — bezpieczeństwo jest fundamentem, nie dodatkiem.

---

## 1. Model zagrożeń

| Zagrożenie | Wpływ | Mitygacja |
|------------|-------|-----------|
| Nieautoryzowany dostęp do danych | Krytyczny | Auth + RLS + MFA |
| Wyciek klucza `service_role` | Krytyczny | Tylko server-side / Edge Functions |
| Kradzież sesji | Wysoki | MFA, krótkie sesje, HTTPS |
| Utrata danych | Wysoki | Backupy, PITR, eksport |
| Duplikat / uszkodzenie importu | Średni | Staging, hash, audyt |
| XSS w aplikacji | Średni | Sanityzacja, CSP |
| Vendor lock-in | Średni | Eksport CSV/JSON, standardowy Postgres |

---

## 2. Uwierzytelnianie (Supabase Auth)

### Wymagania

- [ ] Logowanie email + hasło (min. 12 znaków)
- [ ] **MFA obowiązkowe** (TOTP — Google Authenticator / Authy)
- [ ] Brak publicznej rejestracji — konto tworzone ręcznie (single user)
- [ ] Wylogowanie na wszystkich urządzeniach — dostępne w ustawieniach

### Konfiguracja Supabase (do wykonania w Fazie 1)

```
Authentication → Providers → Email: enabled
Authentication → MFA → TOTP: enabled, enforced
Authentication → Sign In / Providers → Disable sign-ups (invite only)
```

---

## 3. Row Level Security (RLS)

**Każda tabela z danymi użytkownika** musi mieć RLS włączone.

### Wzorzec polityki

```sql
-- Odczyt
CREATE POLICY "Users can read own data"
  ON transactions FOR SELECT
  USING (user_id = auth.uid());

-- Zapis
CREATE POLICY "Users can insert own data"
  ON transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Aktualizacja
CREATE POLICY "Users can update own data"
  ON transactions FOR UPDATE
  USING (user_id = auth.uid());

-- Usuwanie (soft delete przez UPDATE)
CREATE POLICY "Users can delete own data"
  ON transactions FOR DELETE
  USING (user_id = auth.uid());
```

### Tabele wymagające RLS

- `accounts`, `categories`, `subcategories`
- `transactions`, `transaction_entries`
- `imports`, `import_rows`
- `instruments`, `investment_transactions`
- `instrument_prices`, `portfolio_snapshots`
- `goals`, `attachments`, `audit_log`
- `monthly_snapshots`
- `exchange_rates` (jeśli per-user) lub publiczne read-only dla kursów NBP

### Test RLS

1. Utwórz dwóch użytkowników testowych.
2. Dodaj dane jako User A.
3. Zaloguj się jako User B — **nie powinien widzieć niczego User A**.

---

## 4. Klucze API

| Klucz | Gdzie używać | Gdzie NIGDY |
|-------|--------------|-------------|
| `anon` (public) | Przeglądarka, Server Components z RLS | — |
| `service_role` | Edge Functions, skrypty migracji (lokalnie) | Przeglądarka, klient JS, repo Git |

### Zmienne środowiskowe

```env
# .env.local — NIE COMMITOWAĆ
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # tylko server-side
```

`.gitignore` musi zawierać `.env*` (już skonfigurowane).

---

## 5. Supabase Storage (załączniki)

### Bucket: `attachments`

- **Private** — brak publicznego dostępu
- RLS na `storage.objects`:

```sql
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

Ścieżka pliku: `{user_id}/{transaction_id}/{filename}`

### Limity

- Max rozmiar pliku: 10 MB
- Dozwolone typy: `image/*`, `application/pdf`

---

## 6. Środowiska

| Środowisko | Supabase | Vercel | Dane |
|------------|----------|--------|------|
| **Local** | `supabase start` (Docker) | `next dev` | Dane testowe |
| **Preview** | Projekt dev | PR deployment | Dane testowe |
| **Production** | Osobny projekt | `main` branch | Prawdziwe dane |

**Zasady:**
- Nigdy nie importuj produkcyjnych danych do dev bez anonimizacji.
- Osobne klucze API per środowisko.
- Migracje testowane lokalnie → dev → production.

---

## 7. Backup i odzyskiwanie

### Supabase (produkcja)

- [ ] Włączyć **codzienne backupy** (w zestawie w planie Pro)
- [ ] Rozważyć **PITR** (Point-in-Time Recovery) — przywracanie do dowolnej sekundy
- [ ] Przetestować restore na sucho (raz na kwartał)

### Własny backup

- [ ] Przycisk „Eksport wszystkich danych" (CSV + JSON → ZIP)
- [ ] Opcjonalnie: cron (Edge Function) → upload do Storage lub pobranie lokalne
- [ ] Przechowywać kopie poza Supabase (np. zaszyfrowany dysk)

---

## 8. Audyt zmian

Tabela `audit_log` — trigger na `UPDATE` i `DELETE` dla:

- `transactions`
- `transaction_entries`
- `accounts`
- `instruments`
- `investment_transactions`

Pola: `who` (user_id), `when`, `what` (tabela), `old_data`, `new_data`.

Nawet przy single-user — po 6 miesiącach wiesz, dlaczego saldo się nie zgadza.

---

## 9. Aplikacja (Next.js)

### Headers bezpieczeństwa (Vercel / next.config)

- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (doprecyzować w Fazie 1)

### Dobre praktyki

- Walidacja danych wejściowych (Zod) po stronie serwera
- Parametryzowane zapytania (Supabase client — domyślnie)
- Brak logowania kwot / danych finansowych w konsoli produkcyjnej
- Rate limiting na endpointach importu

---

## 10. GitHub

- [ ] Repozytorium **prywatne**
- [ ] Branch protection na `main` (wymagany PR, brak force push)
- [ ] GitHub Actions — sekrety w Settings → Secrets (nie w kodzie)
- [ ] Dependabot — automatyczne alerty o podatnościach

---

## 11. Checklist przed produkcją

- [ ] MFA włączone i przetestowane
- [ ] RLS na wszystkich tabelach — test z dwoma kontami
- [ ] `service_role` nie w bundle przeglądarki (sprawdź: build + search)
- [ ] `.env` w `.gitignore` — `git log` nie zawiera kluczy
- [ ] Backup skonfigurowany i przetestowany restore
- [ ] Eksport danych działa
- [ ] HTTPS only (Vercel — domyślnie)
- [ ] Sign-ups wyłączone — tylko Twoje konto

---

## Historia wersji

| Wersja | Data | Zmiany |
|--------|------|--------|
| 0.1 | 2025-06-09 | Wersja początkowa — Faza 0 |
