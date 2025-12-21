# Supabase Integration Guide

## Quick Setup

1. **Zainstaluj pakiet Supabase**:
```powershell
npm install @supabase/supabase-js
```

2. **Utwórz projekt w Supabase**:
   - Idź na https://supabase.com
   - Kliknij "New Project"
   - Wybierz organizację i region (np. Frankfurt dla Polski)
   - Ustaw hasło do bazy (zapisz je!)

3. **Znajdź credentials**:
   - Settings → API
   - Skopiuj **Project URL** (np. `https://pqauqjzjlmbuwlecsrok.supabase.co`)
   - Skopiuj **service_role key** (secret!)

4. **Zaktualizuj `.env`**:
```env
PORT=3000
SUPABASE_URL=https://pqauqjzjlmbuwlecsrok.supabase.co
SUPABASE_SERVICE_KEY=twój-service-role-key-tutaj
SUPABASE_PUBLIC_KEY=twój-anon-key-tutaj
DATABASE_URL=postgresql://...
```

5. **Uruchom migrację bazy**:
   - Otwórz Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
   - Skopiuj cały kod z `database/migrations/001_initial_schema.sql`
   - Wklej i kliknij "Run"
   - Sprawdź czy tabele się utworzyły: Table Editor → graves

6. **Uruchom backend**:
```powershell
npm install
npm run start:dev
```

7. **Testuj API**:
   - Swagger UI: http://localhost:3000/api/docs
   - Health check: http://localhost:3000/api/health
   - Utwórz pierwszy grób przez POST /api/graves

## Struktura bazy danych

### Tabela `graves` (lokalizacja i płatności)
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | Klucz główny |
| user_id | UUID | FK do users |
| latitude | DOUBLE | Szerokość geograficzna |
| longitude | DOUBLE | Długość geograficzna |
| accuracy | DOUBLE | Dokładność GPS (metry) |
| cemetery_name | VARCHAR(255) | Nazwa cmentarza |
| grave_number | VARCHAR(50) | Numer grobu |
| sector | VARCHAR(50) | Sektor cmentarza |
| notes | TEXT | Notatki o lokalizacji |
| payment_expiry_date | DATE | Do kiedy opłacone miejsce |
| last_payment_amount | DECIMAL(10,2) | Kwota ostatniej opłaty |
| payment_duration_months | INTEGER | Na ile miesięcy kupiono |
| payment_currency | VARCHAR(3) | Waluta (domyślnie PLN) |
| photos | TEXT[] | Tablica URL-i zdjęć |
| created_at | TIMESTAMPTZ | Data utworzenia |
| updated_at | TIMESTAMPTZ | Data aktualizacji |

### Tabela `deceased_persons` (wiele osób w jednym grobie)
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | Klucz główny |
| grave_id | UUID | FK do graves |
| first_name | VARCHAR(100) | Imię zmarłego |
| last_name | VARCHAR(100) | Nazwisko zmarłego |
| birth_date | DATE | Data urodzenia |
| death_date | DATE | Data śmierci |
| maiden_name | VARCHAR(100) | Nazwisko panieńskie |
| notes | TEXT | Notatki o osobie |
| created_at | TIMESTAMPTZ | Data utworzenia |
| updated_at | TIMESTAMPTZ | Data aktualizacji |

**Dlaczego taka struktura?**
- ✅ Jeden grób może mieć wiele osób (grób rodzinny)
- ✅ Brak pola `relationship` - bo dane mogą być eksportowane i współdzielone
- ✅ Zarządzanie płatnościami z przypomnieniami o wygasających opłatach
- ✅ Elastyczność przy imporcie/eksporcie danych

## Bezpieczeństwo (Row Level Security)

Baza ma włączone RLS policies, które:
- ✅ Użytkownicy widzą tylko swoje groby
- ✅ Service role key może obejść RLS (dla backendu)
- ✅ Anon key wymaga auth.uid() (dla frontendu w przyszłości)

## Troubleshooting

**Problem: "Cannot find module '@supabase/supabase-js'"**
```powershell
npm install @supabase/supabase-js
```

**Problem: "Database error" przy tworzeniu grobu**
- Sprawdź czy tabele istnieją w Supabase Table Editor
- Sprawdź czy SUPABASE_SERVICE_KEY jest poprawny
- Sprawdź logi w Supabase Dashboard → Logs

**Problem: "RLS policy violation"**
- Używasz service_role key, nie anon key
- Możesz tymczasowo wyłączyć RLS: `ALTER TABLE graves DISABLE ROW LEVEL SECURITY;`

## Next Steps

- [ ] Dodaj autentykację użytkowników (Supabase Auth)
- [ ] Zaimplementuj upload zdjęć (Supabase Storage)
- [ ] Dodaj PostGIS dla zaawansowanych zapytań geospatial
- [ ] Skonfiguruj Realtime subscriptions dla live updates
