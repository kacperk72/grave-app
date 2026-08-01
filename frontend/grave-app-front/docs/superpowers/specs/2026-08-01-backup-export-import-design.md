# Kopia zapasowa: eksport i import grobów

Data: 2026-08-01
Aplikacja: `grave-app/frontend/grave-app-front`

## Cel

Umożliwić eksport wszystkich grobów do pliku i import z pliku, żeby użytkownik mógł
udostępnić swoją mapę rodzinie. W całości lokalnie (IndexedDB), bez backendu.

## Zakres

- **Eksport** → jeden plik `.json` ze wszystkimi grobami. Na telefonie odpala natywne
  „Udostępnij" (Web Share API z plikiem); fallback: pobranie pliku.
- **Import** → wybór pliku, walidacja, dodanie grobów. Dwa tryby:
  - **Scalanie** (domyślny): dokłada nowe, groby o istniejącym `id` pomija.
  - **Zastąp wszystko** (drugorzędny, z potwierdzeniem): czyści bazę i wgrywa plik 1:1.
- Podsumowanie po imporcie: „Dodano X, pominięto Y (już istniały)".

Poza zakresem: synchronizacja przez sieć, scalanie pól w obrębie tego samego `id`
(kolizja `id` = pominięcie, nie merge pól), zdjęcia jako osobne pliki (lecą w JSON jak są).

## Format pliku

```json
{ "app": "GraveMap", "version": 1, "exportedAt": "<ISO>", "graves": [ <Grave>… ] }
```

Import akceptuje też „goły" tablicowy JSON grobów (tolerancyjnie).

## Architektura

### 1. Czysta logika (testowalna, bez API przeglądarki)

`shared/utils/grave-backup.ts`:
- `serializeBackup(graves, now?): string` — buduje wrapper i serializuje.
- `parseBackup(text): { ok: true; graves: Grave[]; skippedInvalid: number } | { ok: false; error: string }`
  — parsuje JSON, waliduje/normalizuje każdy grób (wymagane: `latitude`, `longitude`,
  `cemeteryName`; braki opcjonalnych uzupełniane; brak `id` → nowy UUID). Odrzuca plik
  bez prawidłowych grobów.
- `partitionByExisting(incoming, existingIds): { toAdd, skippedExisting }` — dedup po `id`.

Testy Vitest: prawidłowy wrapper, goła tablica, zły JSON, brak `graves`, grób bez
współrzędnych (pominięty), round-trip serialize→parse, dedup po `id`.

### 2. `core/services/backup.service.ts` (integracja przeglądarka + IndexedDB)

- `exportGraves(): Promise<number>` — pobiera groby z IndexedDB, serializuje, tworzy
  `File` `gravemap-YYYY-MM-DD.json`; próbuje `navigator.share({ files })`, w razie braku
  wsparcia — pobranie przez `<a download>`. Zwraca liczbę grobów.
- `importGraves(file, mode: 'merge' | 'replace'): Promise<ImportResult>` — czyta plik,
  `parseBackup`; dla `replace` czyści bazę; dla `merge` dedup po istniejących `id`;
  zapisuje do IndexedDB; przeładowuje `GraveService`. Zwraca `{ added, skippedExisting, skippedInvalid }`.

### 3. UI — `features/settings/settings-page.component.ts`, karta „Twoje dane"

- Przycisk **„Eksportuj / udostępnij"** (aktywny, gdy są groby) → `exportGraves`.
- Przycisk **„Wczytaj z pliku (scal)"** → ukryty `<input type=file accept=application/json>`, tryb `merge`.
- Drugorzędny **„Zastąp wszystko z pliku…"** → ten sam input, tryb `replace`, `confirm()` przed zapisem.
- Obszar komunikatu (sukces/błąd) z podsumowaniem.

## Obsługa błędów

- Zły plik / nie-JSON / brak grobów → czytelny komunikat, brak zmian w bazie.
- Eksport przy 0 grobów → komunikat „Brak grobów do eksportu".
- `navigator.share` odrzucony przez użytkownika → cicho (bez błędu), bez fallbacku pobierania.

## Kryteria akceptacji

- Eksport tworzy plik JSON ze wszystkimi grobami; na mobile działa udostępnianie.
- Import scalający dodaje brakujące groby i pomija istniejące (podsumowanie z liczbami).
- Import „Zastąp wszystko" po potwierdzeniu daje bazę identyczną z plikiem.
- Zły plik nie psuje istniejących danych. Deployment pozostaje statyczny (bez backendu).
