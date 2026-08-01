# Import lokalizacji grobu z pinezki Google Maps

Data: 2026-08-01
Aplikacja: `grave-app/frontend/grave-app-front`

## Cel

Umożliwić dodanie grobu przez wklejenie linku do **pojedynczej pinezki** Google Maps.
Apka wyłuskuje współrzędne z linku i wypełnia krok „Lokalizacja" w istniejącym
kreatorze „Dodaj grób". Resztę (kto pochowany, cmentarz, notatka) użytkownik
uzupełnia w kolejnych krokach kreatora — bez nowych ekranów.

## Ograniczenia i ustalenia (dlaczego akurat tak)

- Aplikacja jest **wyłącznie frontendowa** (Angular SPA + IndexedDB/Dexie), wdrażana
  jako statyczne pliki na hostingu. Brak backendu w czasie działania — rozwiązanie
  musi działać w całości w przeglądarce.
- **Link do zapisanej listy** Google Maps (`…!11m2!2s<ID>!3e3`) zawiera tylko ID
  listy — żadnych współrzędnych. Odczyt zawartości listy wymaga scrapowania serwerów
  Google (ściana zgody, JS, brak publicznego API) → **poza zakresem**.
- **Krótki link** `maps.app.goo.gl/…` nie da się rozwinąć z przeglądarki (CORS).
  Dlatego apka nie rozwija krótkich linków sama.
- **Rozwinięty (długi) URL** pinezki zawiera współrzędne w `!3d<lat>!4d<lng>` — to
  parsujemy lokalnie.

## Zakres (v1)

Obsługiwane wejścia w polu importu (parsowane po kolei):

1. Długi URL Google Maps z `!3d<lat>!4d<lng>` — **pozycja pinezki** (preferowane).
2. Długi URL z `@<lat>,<lng>` — środek widoku (fallback, gdy brak `!3d/!4d`).
3. Ścieżka `/place/<DMS>` w formacie `49°36'45.4"N 21°38'55.7"E` — parsowanie DMS.
4. Same współrzędne dziesiętne, np. `49.6126, 21.6488`.

Gdy wejście to **goły krótki link** `maps.app.goo.gl` / `goo.gl/maps` bez współrzędnych:
apka **nie** próbuje go rozwijać — pokazuje podpowiedź „Otwórz w Google Maps i skopiuj
pełny adres" + przycisk otwierający wklejony link w nowej karcie.

Poza zakresem v1: import list, rozwijanie krótkich linków przez proxy, Plus Codes,
odczyt nazwy/opisu miejsca z Google (opis wpisuje użytkownik ręcznie).

## Architektura

### 1. Czysta funkcja parsująca (bez zależności, testowalna)

Plik: `src/app/shared/utils/google-maps-location.ts`

```ts
export type GmapsParseResult =
  | { kind: 'coords'; lat: number; lng: number; source: 'pin' | 'viewport' | 'dms' | 'raw' }
  | { kind: 'needs-expand'; url: string }   // krótki link bez współrzędnych
  | { kind: 'invalid' };                      // nic sensownego nie znaleziono

export function parseGoogleMapsLocation(input: string): GmapsParseResult;
```

Zasady:
- Trim; pusty string → `invalid`.
- Kolejność dopasowań: `!3d..!4d..` (pin) → `@lat,lng` (viewport) → DMS w `/place/` →
  same współrzędne dziesiętne.
- Walidacja zakresów: lat ∈ [-90, 90], lng ∈ [-180, 180]; poza zakresem → dalej szukaj,
  a jeśli nic → `invalid`.
- Wykrycie krótkiego linku: host `maps.app.goo.gl` lub `goo.gl/maps` i brak współrzędnych
  → `needs-expand` z oryginalnym URL.

### 2. Integracja z kreatorem (krok „Lokalizacja")

Pliki: `features/graves/components/grave-form/grave-form.component.{html,ts,scss}`

- W kroku 1, nad polami współrzędnych, sekcja „Wklej pinezkę Google Maps":
  - `input` na link/współrzędne + przycisk **„Wypełnij"**.
  - Po `coords` → ustawia `location.latitude/longitude` w formularzu, pokazuje
    potwierdzenie (zielony komunikat z wartościami). Dla `viewport` dodatkowa adnotacja,
    że to środek widoku, nie sama pinezka (mniejsza precyzja).
  - Po `needs-expand` → komunikat-podpowiedź + przycisk **„Otwórz w Google Maps"**
    (`window.open(url)`).
  - Po `invalid` → komunikat błędu „Nie rozpoznano współrzędnych…".
- Ręczne pola współrzędnych i „Użyj aktualnej lokalizacji" zostają bez zmian.

### Przepływ danych

```
wklejony tekst
  → parseGoogleMapsLocation()
     ├─ coords      → patchValue(location) → dalej kroki 2–4 (opis) → zapis do IndexedDB
     ├─ needs-expand→ podpowiedź + „Otwórz w Google Maps"
     └─ invalid     → komunikat błędu
```

## Obsługa błędów

- Nieprawidłowy/nieobsługiwany link → czytelny komunikat, brak zmian w formularzu.
- Krótki link → instrukcja jak zdobyć pełny adres (nie „cichy" błąd).
- Współrzędne poza zakresem → traktowane jak brak dopasowania.

## Testy

- Vitest, `google-maps-location.spec.ts` — parser (podejście test-first):
  - długi URL z `!3d/!4d` (przykład rzeczywisty: `…!3d49.6126172!4d21.6487939`),
  - URL tylko z `@lat,lng`,
  - `/place/` z DMS `49°36'45.4"N 21°38'55.7"E`,
  - same współrzędne `49.6126, 21.6488`,
  - krótki link `maps.app.goo.gl/…` → `needs-expand`,
  - śmieci/pusty → `invalid`,
  - współrzędne poza zakresem → `invalid`.

## Kryteria akceptacji

- Wklejenie rozwiniętego linku pinezki wypełnia współrzędne i pozwala dokończyć dodawanie grobu.
- Wklejenie krótkiego linku pokazuje podpowiedź z otwarciem w Google Maps (nie myli błędem).
- Deployment pozostaje statyczny — brak nowych wywołań sieciowych ani zależności od backendu.
