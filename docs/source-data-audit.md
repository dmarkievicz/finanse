# Audyt danych źródłowych (Excel → aplikacja)

> **Status:** ✅ Audyt wykonany — `data/raw/Zeszyt1.xlsx`  
> **Data audytu:** 2026-06-09  
> **Raport:** `data/processed/audit-report.json`

---

## 1. Pliki źródłowe

| Plik | Arkusz | Liczba wierszy | Uwagi |
|------|--------|----------------|-------|
| `data/raw/Zeszyt1.xlsx` | Arkusz1 | **22 442** | Jedyny arkusz, pełne dane transakcyjne |
| Inwestycje (osobny arkusz) | — | — | **Brak** — inwestycje jako konta docelowe transferów |

### Kolumny w pliku (rzeczywiste)

```
Date | Type | Category | Subcategory |  Amount  | Currency of Amount |
Source Account | Target Account |  Exchange Rate  | Details
```

**Uwaga:** Nagłówki `Amount` i `Exchange Rate` mają spacje na końcach.  
**Brakuje** kolumny `Amount (Base Currency)` — liczona jako `Amount × Exchange Rate`.

---

## 2. Zakres danych

| Metryka | Wartość |
|---------|---------|
| Wierszy | 22 442 |
| Okres | **2004-01-01** → **2026-03-31** |
| Suma Income (PLN) | 4 235 710,43 PLN |
| Suma Expenses (PLN) | 3 454 389,99 PLN |
| Suma Transfer (PLN) | 14 717 603,35 PLN (nie wpływa na cashflow) |

---

## 3. Typy transakcji (Type)

| Wartość w Excelu | Liczba | Mapowanie docelowe |
|------------------|--------|-------------------|
| `Expenses` | 17 534 | `expense` |
| `Transfer` | 3 050 | `transfer` |
| `Income` | 1 858 | `income` |

### Kluczowa reguła — różne kolumny kont

| Typ | Konto w Excelu | Entry w bazie |
|-----|----------------|---------------|
| **Income** | `Target Account` (Source puste!) | `+amount` na Target |
| **Expenses** | `Source Account` | `−amount` na Source |
| **Transfer** | Source + Target | `−amount` Source, `+amount` Target |

> 100% wierszy Income ma puste Source Account — to **nie błąd**, tylko konwencja Excela.

---

## 4. Waluty

| Waluta (po normalizacji) | Liczba | Uwagi |
|--------------------------|--------|-------|
| PLN | 19 482 | Puste pole Currency = PLN (11 298 wierszy) |
| EUR | 2 956 | W Excelu: `EURO`, `Euro` → normalizuj do `EUR` |
| USD | 4 | |

Kursy EUR: 59 unikalnych wartości, zakres 1,0 – 4,65.

---

## 5. Konta — Source Account (38 unikalnych po normalizacji)

| Konto | Wierszy | Typ (propozycja) |
|-------|---------|------------------|
| mBank PLN | 9 543 | bank |
| Portfel PLN | 4 161 | cash |
| Portfel EURO | 2 300 | cash |
| CC-Revolut PLN | 760 | bank |
| REVOLUT PLN | 586 | bank |
| mBank Magda | 428 | bank |
| Permanent EURO | 399 | cash |
| ING PLN | 364 | bank |
| BPH PLN | 335 | bank |
| LOKATY PLN | 92 | deposit |
| Obligacje | 5 | investment |
| XTB | 3 | broker |
| hipoteczny mBank | 1 | loan |
| _+ 25 innych_ | | |

### Duplikaty pisowni (do scalenia przy imporcie)

| Warianty w Excelu | Kanoniczna nazwa |
|-------------------|------------------|
| `portfel PLN` / `Portfel PLN` | Portfel PLN |
| `portfel EURO` / `Portfel EURO` | Portfel EURO |
| `permanent EURO` / `Permanent EURO` | Permanent EURO |
| `pożyczone [od]` / `Pożyczone [od]` | Pożyczone [od] |

---

## 6. Konta — Target Account (55 unikalnych)

Najczęstsze — zwłaszcza dla Income i Transferów:

| Konto | Wierszy | Uwagi |
|-------|---------|-------|
| mBank PLN | 1 838 | |
| Portfel PLN | 733 | |
| ALIOR Bank PLN | 339 | |
| LOKATY PLN | 146 | Lokaty |
| Obligacje | 40 | Inwestycje |
| ZŁOTO | 15 | Inwestycje |
| hipoteczny GE | 75 | Kredyt |
| PZU MISS | 10 | Inwestycje / ubezpieczenie |
| XTB | 1 | Broker |
| mBank | 8 | Brak waluty w nazwie — ujednolicić? |

---

## 7. Kategorie (25 unikalnych)

| Category | Wierszy | Typ |
|----------|---------|-----|
| Spożywcze | 4 605 | expense |
| _(puste)_ | 3 050 | transfery — OK |
| Tipple | 2 529 | expense |
| Rachunki | 2 090 | expense |
| Pensja - D | 743 | income |
| Pensja - M | 101 | income |
| Odsetki | 210 | income |
| Kredyt | 568 | expense |
| _+ 17 innych_ | | |

47 unikalnych par Category → Subcategory (np. `Rachunki → Opłaty, prowizje`).

---

## 8. Problemy wykryte przy audycie

| Problem | Liczba | Priorytet | Proponowane rozwiązanie |
|---------|--------|-----------|-------------------------|
| Expenses bez Source Account | 51 | 🔴 | Ręczna korekta lub domyślne konto „Nieznane" |
| Income bez Target Account | 103 | 🔴 | Ręczna korekta lub odrzucenie |
| Transfer bez Source | 188 | 🟡 | Część to pożyczki — przejrzeć |
| Transfer bez Target | 96 | 🟡 | Przejrzeć |
| Transfer bez obu kont | 66 | 🔴 | Prawdopodobnie błędy w Excelu |
| Kwota = 0 | 78 | 🟡 | Pominąć przy imporcie |
| Brak kwoty | 1 | 🔴 | Odrzucić |
| EUR z kursem = 1 | 308 | 🟡 | Sprawdzić — może błąd kursu |

---

## 9. Inwestycje w danych

Brak osobnego arkusza. Inwestycje widoczne jako **konta docelowe transferów**:

| Konto docelowe | Transferów | Typ instrumentu |
|----------------|------------|-----------------|
| LOKATY PLN | 146 | Lokaty |
| Obligacje | 40 | Obligacje |
| ZŁOTO | 15 | Złoto |
| PZU MISS | 10 | Ubezpieczenie / inwestycja |
| XTB | 1 | ETF / broker |
| Inwestycje PLN | 5 | Ogólne |

**Wniosek:** W Fazie 7 te konta staną się instrumentami w module inwestycji.

---

## 10. Reguły biznesowe (potwierdzone)

| # | Reguła | Status |
|---|--------|--------|
| 1 | Transfer nie wpływa na majątek netto | ✅ 3 050 transferów, category pusta |
| 2 | Income → Target Account | ✅ 100% wierszy |
| 3 | Expenses → Source Account | ✅ (poza 51 wyjątkami) |
| 4 | Pusta waluta = PLN | ✅ |
| 5 | Kurs zapisywany per transakcja | ✅ kolumna Exchange Rate |
| 6 | Zakup obligacji/złota = transfer na konto inwestycyjne | ✅ do weryfikacji |

### Potwierdzone przez Damiana (2026-06-09)

- [x] **51 Expenses bez konta** — świadome wpisy (np. gotówka bez przypisanego źródła). Przy imporcie: domyślne konto „Gotówka / Nieznane" lub pozostawienie z flagą `W001`.
- [x] **103 Income bez Target** — **nie naprawiamy w Excelu na razie**. Przy imporcie: status `needs_review` 🔴 w aplikacji, poprawa później w UI.
- [x] **`mBank`** (bez PLN) = **`mBank PLN`** — normalizacja przy imporcie.
- [x] **`portfel`** (target) = **`Portfel PLN`** — normalizacja przy imporcie.
- [x] **Transfery na ZŁOTO / Obligacje / LOKATY / PZU / XTB** = **zakupy inwestycji** — nie wpływają na cashflow (wydatki konsumpcyjne); w Fazie 7 powiązać z modułem inwestycji.

---

## 11. Następne kroki

1. ✅ Audyt wykonany — `npm run audit`
2. ⬜ Twoja weryfikacja sekcji 10 (pytania do potwierdzenia)
3. ⬜ Założyć Supabase + GitHub + Vercel
4. ⬜ Faza 1 — szkielet aplikacji
