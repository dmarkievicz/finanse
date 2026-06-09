# Instrukcja: Supabase + GitHub

> Krok po kroku — co zrobić w przeglądarce i w terminalu.  
> Szacowany czas: **20–30 minut**.

---

## Część A — Supabase

### A1. Załóż konto i projekt

1. Wejdź na **[supabase.com](https://supabase.com)** → **Start your project** (lub Zaloguj się przez GitHub).
2. **New project**:
   - **Name:** `finanse-dev` (środowisko deweloperskie)
   - **Database Password:** wygeneruj silne hasło → **zapisz w menedżerze haseł** (np. Bitwarden)
   - **Region:** `Central EU (Frankfurt)` — najbliżej Polski
   - **Plan:** Free (na start wystarczy)
3. Kliknij **Create new project** — poczekaj ~2 minuty.

### A2. Skopiuj klucze API

1. W projekcie: **Project Settings** (ikona koła zębatego) → **API**.
2. Skopiuj i zapisz:

| Pole w Supabase | Zmienna w `.env.local` |
|-----------------|------------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> **Uwaga:** `service_role` to klucz z pełnym dostępem — **nigdy** nie commituj, nie wklejaj w przeglądarce.

### A3. Utwórz `.env.local` na swoim komputerze

W folderze `c:\projekty\finanse`:

```powershell
copy .env.example .env.local
```

Otwórz `.env.local` i wklej trzy wartości z Supabase.

### A4. Wyłącz publiczną rejestrację (bezpieczeństwo)

1. Supabase Dashboard → **Authentication** → **Providers**.
2. **Email** — zostaw włączone.
3. **Authentication** → **Sign In / Up** (lub Settings):
   - Wyłącz **Enable email signups** (tylko Ty masz konto — utworzysz je ręcznie w Fazie 1).

### A5. Połącz projekt lokalny z Supabase (opcjonalnie teraz, wymagane w Fazie 2)

W terminalu:

```powershell
cd c:\projekty\finanse
supabase login
supabase link --project-ref TWOJ_PROJECT_REF
```

**Project ref** znajdziesz w: Project Settings → General → **Reference ID** (np. `abcdefghijklmnop`).

---

## Część B — GitHub

### B1. Załóż repozytorium

1. Wejdź na **[github.com/new](https://github.com/new)**.
2. Ustawienia:
   - **Repository name:** `finanse`
   - **Visibility:** **Private** ← obowiązkowo (dane finansowe w dokumentacji)
   - **NIE** zaznaczaj „Add a README" — mamy już lokalny projekt
3. Kliknij **Create repository**.

### B2. Wypchnij kod z komputera

GitHub pokaże instrukcje — użyj tych poleceń w PowerShell:

```powershell
cd c:\projekty\finanse

git add -A
git commit -m "Faza 0: dokumentacja, audyt Excel, struktura projektu"

git branch -M main
git remote add origin https://github.com/TWOJ_USERNAME/finanse.git
git push -u origin main
```

Zamień `TWOJ_USERNAME` na swoją nazwę użytkownika GitHub.

> Przy pierwszym `git push` GitHub poprosi o logowanie (przeglądarka lub token).

### B3. Sprawdź na GitHubie

- Repo jest **prywatne**
- Widać foldery: `docs/`, `scripts/`, `data/` (bez plików `.xlsx` — są w `.gitignore`)
- **Nie ma** pliku `.env.local` (jest w `.gitignore`)

---

## Część C — Vercel (opcjonalnie teraz, przed Fazą 1)

1. **[vercel.com](https://vercel.com)** → Zaloguj przez GitHub.
2. **Add New Project** → wybierz repo `finanse`.
3. Na razie deploy może **nie przejść** (brak aplikacji Next.js) — to normalne.
4. Po Fazie 1 dodasz zmienne środowiskowe w Vercel:
   - Settings → Environment Variables → te same co w `.env.local`

---

## Checklist — odhacz po wykonaniu

```
[ ] Supabase: projekt finanse-dev utworzony
[ ] Supabase: klucze skopiowane do .env.local
[ ] Supabase: sign-ups wyłączone
[ ] GitHub: prywatne repo finanse utworzone
[ ] GitHub: kod wypchnięty (git push)
[ ] (opcjonalnie) Vercel: repo podłączone
[ ] (opcjonalnie) supabase link wykonany lokalnie
```

---

## Co mi daj znać po zrobieniu

Wystarczy napisać:

> „Supabase i GitHub gotowe"

Opcjonalnie podaj (bez `service_role`!):
- czy `.env.local` jest uzupełniony
- URL repo GitHub (np. `github.com/damian/finanse`)

Wtedy przechodzimy do **Fazy 1** — szkielet Next.js + logowanie.

---

## Typowe problemy

| Problem | Rozwiązanie |
|---------|-------------|
| `git push` odrzucony — auth | Zainstaluj [GitHub Desktop](https://desktop.github.com) lub wygeneruj Personal Access Token w GitHub → Settings → Developer settings |
| Nie widzę `service_role` key | Project Settings → API → sekcja Project API keys → `service_role` (kliknij Reveal) |
| `.env.local` w git status | Sprawdź `.gitignore` — plik nie powinien być commitowany |
| Excel w repo na GitHubie | `.gitignore` blokuje `*.xlsx` — jeśli widać, usuń z historii przed pushem |
