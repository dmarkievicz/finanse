# Faza 1 — Uruchomienie lokalne i online

## Lokalnie

```powershell
cd c:\projekty\finanse
npm run dev
```

Otwórz: **http://localhost:3000**

## Konto użytkownika (Supabase)

Sign-ups są wyłączone — utwórz konto ręcznie:

1. [Supabase Dashboard](https://supabase.com/dashboard) → projekt `finanse-dev`
2. **Authentication** → **Users** → **Add user** → **Create new user**
3. Podaj swój email i hasło (min. 12 znaków)
4. Zaznacz **Auto Confirm User**
5. Zaloguj się w aplikacji na `/login`

## Vercel (deploy online)

1. [vercel.com/new](https://vercel.com/new) → Import repo `dmarkievicz/finanse`
2. **Environment Variables** — dodaj:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy → dostaniesz URL typu `https://finanse-xxx.vercel.app`

> `SUPABASE_SERVICE_ROLE_KEY` tylko lokalnie / Edge Functions — **nie** dodawaj do Vercel jeśli nie jest potrzebny w buildzie.

## MFA (następny krok)

Supabase Dashboard → **Authentication** → **MFA** → włącz **TOTP**.
