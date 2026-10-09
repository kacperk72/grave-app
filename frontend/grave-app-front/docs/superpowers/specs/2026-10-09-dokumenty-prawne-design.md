# Dokumenty prawne, zgoda i usuwanie konta — projekt

Data: 2026-10-09 · Status: do akceptacji · Makieta: `docs/makiety/dokumenty-prawne.html`

## Cel

znajdzgroby.pl jest w 100% bezpłatna (bez opłat, subskrypcji, reklam), ale od 8.10.2026 ma konta i przetwarza
dane osobowe na serwerze. Potrzebne są: regulamin świadczenia usług drogą elektroniczną, polityka prywatności
(klauzula RODO), akceptacja przy przekazaniu danych na serwer, stały dostęp do dokumentów i samodzielne usunięcie
konta. Polityka ma opisywać faktyczny przepływ danych w tej aplikacji, nie ogólny szablon.

Treść dokumentów to **projekt, nie porada prawna** — do przeczytania przez właściciela (najlepiej z prawnikiem)
przed wdrożeniem.

## Ustalenia z rozmowy

| Temat | Decyzja |
|---|---|
| Administrator / usługodawca | Kacper Kubit, `kontakt@znajdzgroby.pl` (przekierowanie w hPanelu na skrzynkę właściciela — konfiguruje użytkownik) |
| Usunięcie konta a mapy rodzinne | wyjście ze wszystkich map; rola założyciela przechodzi na najdłużej obecnego członka; mapa, w której zostaje się samemu, jest usuwana |
| Gdzie zgoda | checkbox przy zakładaniu konta **oraz** przy tworzeniu mapy rodzinnej i dołączaniu do niej |
| Wiek | 18+ (konto i mapy rodzinne) |
| Zamknięcie serwisu | co najmniej 30 dni uprzedzenia |

## Przepływ danych (podstawa treści polityki)

| Odbiorca | Dane | Uwagi |
|---|---|---|
| Cloudflare (Worker, D1, KV) | e-mail, hash hasła (PBKDF2-SHA256), sesje, skrót SHA-256 adresu IP przy prośbie o kod, imię i kolor w mapach, groby (GPS, opisy, daty), zdjęcia, kto ostatnio zmienił grób, logi Workera | D1 w regionie EEUR, bez gwarancji jurysdykcji UE; firma z USA |
| Resend | adres e-mail przy wysyłce kodu | region EU, firma z USA |
| Hostinger | adres IP w logach serwera strony | UE |
| OpenStreetMap, Esri | adres IP przy pobieraniu kafelków mapy | OSMF — Wielka Brytania; Esri — USA |
| Telefon (IndexedDB, localStorage) | groby bez konta, ustawienia, sesja, zaakceptowana wersja regulaminu | niezbędne do działania → bez banera cookies |

Google Fonts znika z listy: czcionka Onest trafia na własny serwer (punkt E).

## Część 1: Co i gdzie

### A. Dokumenty
- `/regulamin` i `/prywatnosc` — strony w aplikacji (działają offline), ładowane leniwie, bez dolnej nawigacji,
  z przyciskiem „Wróć” (historia, a gdy jej brak — `/settings`). Na górze „Wersja N z DD.MM.RRRR”.
- Treść jako szablony komponentów (HTML), nie Markdown — bez nowej zależności.
- Numer i data wersji regulaminu w jednym miejscu (`legal.ts`): `TERMS_VERSION = 1`, data publikacji.
  Ta sama stała po stronie Workera.
- Strony dostępne bez onboardingu (link z ekranu powitalnego nie może przekierować na `/welcome`).

### B. Stały dostęp
- **Ustawienia**, na dole: sekcja „Informacje” — Regulamin, Polityka prywatności, „Kontakt: kontakt@znajdzgroby.pl”
  (`mailto:`); pod nią dotychczasowa linijka z wersją aplikacji.
- **Ekran powitalny**: drobna linijka linków pod przyciskami.
- **Ekran logowania**: linki pod formularzem (krok „login”).

### C. Zgoda
- Wspólny komponent `TermsCheckboxComponent`: niezaznaczony checkbox „Akceptuję Regulamin i zapoznałem/am się
  z Polityką prywatności” (oba słowa to linki otwierające dokument; powrót przywraca wypełniony formularz — linki
  otwierają dokument w nowej karcie/oknie, żeby nie gubić stanu formularza).
- **„Załóż konto”**: checkbox w kroku „Ustaw hasło”; bez zaznaczenia przycisk „Zapisz hasło” nieaktywny.
  Tryb „Nie pamiętam hasła” — bez checkboxa.
- **Tworzenie mapy rodzinnej i dołączanie**: checkbox nad przyciskiem formularza profilu; ukryty, gdy
  `localStorage['znajdzgroby-terms'] >= TERMS_VERSION`.
- Po akceptacji: zapis wersji w `localStorage` i wysłanie jej do API.

### D. Usunięcie konta
- **Ustawienia → Konto**: pod „Wyloguj” czerwony wiersz „Usuń konto”.
- Okno (natywny `<dialog>`, jak arkusz przełącznika map):
  1. Podsumowanie z `GET /account/deletion`: „Moje: N grobów i M zdjęć zostanie usuniętych”, a dla każdej mapy
     rodzinnej jedna linijka (wychodzisz / rola założyciela przejdzie na X / mapa zostanie usunięta).
  2. Pole „Hasło”, przycisk „Usuń konto na zawsze” (czerwony), „Anuluj”.
  3. Błędy: złe hasło → „Hasło jest nieprawidłowe”; blokada → komunikat 429; brak sieci → „Bez internetu nie da
     się usunąć konta”.
- Po sukcesie: to samo co wylogowanie (mapy konta znikają z przeglądarki, sesja czyszczona), ekran Ustawień
  z komunikatem „Konto zostało usunięte”.

### E. Zmiany techniczne
- Onest z własnego serwera: pliki woff2 (400/500/600/700, podzbiory latin + latin-ext) w `public/fonts/`,
  `@font-face` w `styles.scss`, usunięte `<link>` do fonts.googleapis.com i fonts.gstatic.com. Licencja OFL —
  plik licencji obok czcionek.
- Codzienny cron Workera (już działa, `17 3 * * *`) dodatkowo: `DELETE FROM login_codes WHERE created_at < now-24h`,
  `DELETE FROM sessions WHERE expires_at < now`.

## Część 2: Serwer

### Migracja `0007_legal.sql` (tylko dodaje)
```sql
ALTER TABLE users ADD COLUMN terms_version INTEGER;
ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER;
ALTER TABLE members ADD COLUMN terms_version INTEGER;
```

### Zgoda
- `POST /auth/password`: gdy konto **nie istnieje** (zakładanie), wymagane `acceptTerms: number` równe
  `TERMS_VERSION` → inaczej 400 „Zaakceptuj regulamin, żeby założyć konto”. Zapis `terms_version`,
  `terms_accepted_at`. Reset hasła istniejącego konta — pole ignorowane.
- `POST /spaces` i `POST /join`: opcjonalne `acceptTerms` w ciele → zapis w `members.terms_version`. Brak pola
  nie blokuje (stare wersje aplikacji w telefonach muszą dalej dołączać do czasu aktualizacji).

### `GET /account/deletion` (sesja)
Zwraca:
```json
{ "personal": { "graves": 12, "photos": 30 },
  "families": [ { "spaceId": "…", "name": "Rodzinna Kubit", "effect": "transfer", "heir": "Weronika" },
                { "spaceId": "…", "name": "Rodzinna Kępa", "effect": "leave" } ] }
```
`effect`: `leave` (zwykły członek), `transfer` (założyciel, są inni — `heir` = aktywny członek o najwcześniejszym
`joined_at`), `delete` (jedyny aktywny członek i brak niedawnej aktywności starych telefonów), `leave` także dla
jedynego członka mapy, z której niedawno korzystały telefony bez podpisu (`invite_seen_at` w oknie
`LEGACY_ACTIVITY_MS`).

### `POST /account/delete` (sesja + `{ password }`)
1. Hasło sprawdzane jak przy logowaniu (atomowy licznik prób, blokada 429, 401 „Hasło jest nieprawidłowe”).
2. Plan liczony tą samą funkcją co podgląd (`planAccountDeletion`), wykonanie w **jednym** `DB.batch`:
   - mapa prywatna i mapy z efektem `delete`: kolejka `photo_purge` z `photo_objects`, `DELETE` grobów,
     kluczy członków, członków, mapy (jak `deleteSpace`);
   - `transfer`: założyciel → `member`, następca → `owner` (kolejność zgodna z indeksem `members_one_owner`);
   - wszyscy członkowie z `user_id = konto` (także usunięci i scaleni): `name = 'Usunięte konto'`,
     `user_id = NULL`, `removed_at = COALESCE(removed_at, now)`; `DELETE FROM member_tokens` dla nich;
   - `DELETE` sesji, kodów (`login_codes` po e-mailu), wiersza `users`.
3. Odpowiedź `{ ok: true }`. Zdjęcia znikają z KV w ciągu 1–3 dni przez istniejący `purgePhotos`.

## Część 3: Treść dokumentów (zarys)

**Polityka prywatności:** administrator; dane w trzech trybach (bez konta i mapy / mapa rodzinna / konto); cele
i podstawy (art. 6 ust. 1 lit. b — usługa, lit. f — bezpieczeństwo: limity prób, skrót IP, logi); kto widzi dane
(członkowie tej samej mapy; odbiorcy z tabeli wyżej); przekazywanie poza EOG (SCC / Data Privacy Framework —
podstawę każdej firmy sprawdzić przed publikacją); okresy (kody 24 h, sesje do 365 dni lub wylogowania, logi
Workera do 3 dni, konto do usunięcia, zdjęcia usuniętych map do 3 dni); prawa (dostęp, sprostowanie, usunięcie —
przycisk lub e-mail, ograniczenie, przenoszenie, sprzeciw, skarga do Prezesa UODO); pamięć urządzenia bez
cookies śledzących, analityki, reklam i profilowania; dobrowolność; zmiany polityki.

**Regulamin:** usługodawca, definicje, bezpłatność; usługi (aplikacja, mapy rodzinne, konto); wymagania
techniczne; konto (kod z maila, tajność hasła, **18+**, usunięcie w Ustawieniach lub mailem, skutki dla map);
mapy rodzinne (link jak klucz, rola założyciela, kto co widzi); treści (zakaz bezprawnych, odpowiedzialność za
zdjęcia i opisy żyjących osób, zgłaszanie mailem, usuwanie przez usługodawcę); odpowiedzialność („as is”, bez
gwarancji ciągłości, limity darmowej infrastruktury, w granicach praw konsumenta); reklamacje (e-mail,
odpowiedź do 14 dni); zakończenie (użytkownik w każdej chwili; zamknięcie serwisu z co najmniej 30-dniowym
uprzedzeniem); zmiany regulaminu (nowa wersja przy kolejnej akceptacji); prawo polskie.

## Testy

- **Worker (`npm run smoke`, lokalnie):** zakładanie konta bez `acceptTerms` → 400, z → zapis wersji; reset hasła
  bez pola → OK; `/join` z `acceptTerms` → zapis w `members`; podgląd usunięcia (leave / transfer z następcą /
  delete); usunięcie: złe hasło 401, dobre → mapa prywatna i samotna mapa usunięte, `photo_purge` zapełniony,
  następca jest założycielem, członkowie zanonimizowani bez kluczy, sesje i konto skasowane, stary klucz urządzenia
  → 401; cron kasuje stare kody i wygasłe sesje.
- **Front (Vitest):** funkcja „czy pokazać checkbox” (wersja w pamięci vs `TERMS_VERSION`), tekst skutku dla
  każdej mapy.
- **E2E (lokalnie, izolowane konteksty):** rejestracja wymaga checkboxa; dołączenie do mapy wymaga checkboxa,
  drugie dołączenie na tym samym urządzeniu — bez; usunięcie konta z podsumowaniem i hasłem; strony dokumentów
  z linków w Ustawieniach, na powitaniu i przy logowaniu; brak zapytań do fonts.googleapis.com.

## Ryzyka

- Usunięcie konta jest nieodwracalne — dlatego hasło, podsumowanie i jeden `batch` (wszystko albo nic).
- Limit zapytań D1 na wywołanie (darmowy plan): batch rośnie z liczbą map (ok. 6 instrukcji na mapę) — przy
  realnych 2–3 mapach daleko od limitu.
- Treść dokumentów bez weryfikacji prawnika może zawierać nieścisłości — oznaczona jako projekt.
