# Faza 0 — Checklist

> Nazwa robocza: **Finanse Damian** (Wealth Dashboard)

---

## Krok 0.1 — Dane źródłowe

- [x] Excel wrzucony → `data/raw/Zeszyt1.xlsx` (22 442 wierszy)
- [x] Uruchomiono `npm run audit` — raport w `data/processed/`
- [x] `docs/source-data-audit.md` uzupełniony na podstawie audytu
- [x] **Weryfikacja reguł biznesowych** — potwierdzone 2026-06-09
- [x] 103 Income bez Target — oznaczyć 🔴 `needs_review` w bazie, poprawa później w aplikacji
- [x] 51 Expenses bez konta — OK (gotówka), flaga `W006` przy imporcie

## Krok 0.2 — Konta i narzędzia

### Lokalnie (na tym komputerze)

- [x] Node.js — v24.14.0
- [x] npm — 11.9.0
- [x] Git — 2.53.0
- [x] Supabase CLI — 2.105.0
- [ ] GitHub CLI (`gh`) — opcjonalnie, do instalacji

### W chmurze (wymaga Twojej akcji)

> **Instrukcja krok po kroku:** [`docs/setup-supabase-github.md`](setup-supabase-github.md)

- [x] **Supabase** — projekt `finanse-dev` + klucze w `.env.local`
- [x] **GitHub** — repo `finanse` + `git push` → https://github.com/dmarkievicz/finanse
- [ ] **Vercel** — opcjonalnie teraz, wymagane przed Fazą 1

### Zapisz dane projektu

Utwórz lokalnie `.env.local` (nie commituj!) — szablon w `.env.example`:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

## Krok 0.3 — Dokumentacja modelu

- [x] `docs/data-model.md` — schemat tabel
- [x] `docs/import-spec.md` — mapowanie kolumn
- [x] `docs/security.md` — RLS, MFA, backup
- [ ] Przejrzeć dokumenty i dopasować po audycie Excela

---

## Kryterium zakończenia Fazy 0

Faza 0 jest **gotowa**, gdy:

1. CSV z Excela leży w `data/raw/` i audyt jest wypełniony
2. Projekt Supabase (dev) istnieje, klucze zapisane w `.env.local`
3. Repo GitHub istnieje i kod jest wypchnięty
4. Vercel podłączony do repo (może być pusty)
5. Dokumentacja modelu jest zweryfikowana względem rzeczywistych danych

**Następny krok:** Faza 1 — szkielet Next.js + Auth + MFA
