# Konta i logowanie kodem z maila

Data: 2026-10-05
Aplikacja: `grave-app` (znajdzgroby.pl) — Worker `worker/` (Cloudflare Worker + D1 + KV) i front `frontend/grave-app-front`

## Cel

Dane mają należeć do **konta**, a nie do przeglądarki. Po zalogowaniu w dowolnej przeglądarce, na
dowolnym urządzeniu albo po zmianie domeny widać te same mapy: prywatną „Moje”, rodzinne i zdjęcia.
Dziś każda przeglądarka to osobna aplikacja: „Moje” istnieje tylko w telefonie, a członkostwo
w mapie rodzinnej to klucz zapisany w jednej przeglądarce. Przy zmianie domeny 2.10.2026 skończyło
się to trzema „Kacprami” i ręcznym przenoszeniem.

## Decyzje (uzgodnione)

| Temat | Decyzja |
|---|---|
| Sposób logowania | Tylko e-mail: mail z **6-cyfrowym kodem i linkiem**. Bez haseł, bez Google. |
| Czy konto jest obowiązkowe | **Opcjonalne.** Bez logowania aplikacja działa jak dziś. |
| Technika | Własne logowanie w Workerze, sesja jako token `Bearer` (wariant A). Bez ciasteczek, bez zmian DNS dla API. |
| Wysyłka maili | Resend (darmowy plan: 100/dobę), nadawca `logowanie@znajdzgroby.pl`. |
| „Moje” po zalogowaniu | Prywatna mapa na serwerze (ten sam mechanizm co rodzinna, bez zaproszeń). |
| Duplikaty członków | Logowanie z urządzenia z innym członkiem tej samej mapy scala go z członkiem konta. |
| Kopia do pliku | Zostaje dla osób bez konta, z dopiskiem „bez zdjęć”. Usunięcie to osobna, późniejsza decyzja. |
| Twardy warunek | Wdrożenie **niczego nie usuwa ani nie nadpisuje**: obecni członkowie, groby i zdjęcia zostają. |

Poza zakresem: hasła, logowanie przez Google lub Apple, usuwanie konta, zmiana adresu e-mail, wielu
właścicieli „Moje”, udostępnianie „Moje” innym (do tego są mapy rodzinne), usunięcie kopii do pliku.

## Dlaczego kod, a nie sam link

Link z maila na iPhonie otwiera się w Safari, a aplikacja dodana do ekranu początkowego ma osobne
dane. Zalogowanie przez link w Safari nie loguje więc aplikacji z ekranu. Kod wpisuje się w tej
samej aplikacji, w której się logujemy, więc działa wszędzie. Link zostaje jako wygoda w przeglądarce.

## Część 1 — serwer (Worker + D1)

### Migracja `worker/migrations/0005_accounts.sql`

Migracja tylko dodaje tabele i kolumny oraz kopiuje dane. Niczego nie usuwa ani nie zmienia
w istniejących wierszach.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- znormalizowany: małe litery, bez spacji
  created_at INTEGER NOT NULL
);

-- Sesja = token urządzenia po zalogowaniu (w bazie tylko SHA-256)
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL          -- 365 dni, przedłużane przy używaniu (najwyżej raz na dobę)
);
CREATE INDEX sessions_user ON sessions (user_id);

-- Prośba o zalogowanie: kod (6 cyfr) i link, oba jako SHA-256, ważne 15 minut
CREATE TABLE login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  link_hash TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0, -- błędne kody; po 5 kod przepada
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX login_codes_email ON login_codes (email, created_at);

-- Wiele urządzeń (kluczy) na jednego członka mapy
CREATE TABLE member_tokens (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX member_tokens_member ON member_tokens (member_id);
INSERT INTO member_tokens (token_hash, member_id, created_at)
  SELECT token_hash, id, joined_at FROM members;

ALTER TABLE members ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE members ADD COLUMN merged_into TEXT;   -- scalony z innym członkiem (ten sam człowiek)
CREATE UNIQUE INDEX members_one_per_user ON members (space_id, user_id)
  WHERE user_id IS NOT NULL AND removed_at IS NULL;

ALTER TABLE spaces ADD COLUMN kind TEXT NOT NULL DEFAULT 'family'; -- 'family' | 'personal'
ALTER TABLE spaces ADD COLUMN owner_user_id TEXT REFERENCES users(id);
CREATE UNIQUE INDEX spaces_one_personal ON spaces (owner_user_id) WHERE kind = 'personal';
```

`members.token_hash` zostaje i jest dalej wypełniane przy dołączaniu. Dzięki temu możliwy jest
powrót do poprzedniej wersji Workera bez utraty dostępu. Nowy kod szuka klucza w `member_tokens`.

### Uwierzytelnianie map (zmiana w `auth.ts`)

`authenticate()` szuka `Bearer` najpierw w `member_tokens` (z JOIN do `members` i `spaces`), potem
jak dotąd w kluczu zaproszenia (dostęp przejściowy). Zachowanie `member_removed` się nie zmienia.
Wszystkie obecne endpointy map działają bez zmian w kształcie.

Mapa `personal`:
- `GET /invite`, `POST /join`, `POST /space/rotate`, `POST /space/leave`, `DELETE /members/:id`,
  `POST /members/:id/owner` i `DELETE /space` zwracają **403** „To prywatna mapa”;
- `GET /invite` i `POST /join` z kluczem tej mapy zwracają 401 jak dla złego klucza (klucz
  zaproszenia mapy prywatnej to losowa wartość, której nikt nie zna).

### Endpointy konta (nowy plik `accounts.ts`)

| Metoda i ścieżka | Autoryzacja | Działanie |
|---|---|---|
| `POST /auth/request {email}` | brak | Zawsze **202** z tą samą treścią (nie zdradza, czy konto istnieje). Gdy adres poprawny i limit nieprzekroczony: zapis `login_codes`, mail z kodem i linkiem `https://znajdzgroby.pl/logowanie#<link>`. |
| `POST /auth/verify {email, code}` albo `{link}` | brak | Sprawdza kod lub link (ważność, nieużyty, `attempts < 5`). Błędny kod zwiększa `attempts`. Sukces: oznacza kod jako użyty, tworzy `users` (jeśli brak), tworzy sesję i zwraca `{ session, user: { id, email } }`. Błąd: 401 „Kod jest nieprawidłowy albo wygasł”. |
| `POST /auth/logout` | sesja | Usuwa sesję. |
| `GET /account` | sesja | `{ user, spaces: [{ spaceId, kind, name, role, memberId }] }` — aktywne członkostwa konta. |
| `POST /account/link {tokens: string[]}` | sesja | Przypina członków z kluczy tego urządzenia do konta (ze scalaniem), zakłada mapę prywatną, jeśli jej brak, i zwraca **pełną listę map konta z kluczem dla tego urządzenia**: `{ spaces: [{ spaceId, kind, name, role, memberId, memberToken }] }`. |

Sesja jest przesyłana w nagłówku `Authorization: Bearer <sesja>`. Endpointy konta szukają jej
w `sessions`, a endpointy map w `member_tokens`. To różne tabele, więc tokeny się nie mylą.

`POST /join` z dodatkowym nagłówkiem `X-Session: <sesja>`: członek dostaje `user_id`. Jeśli konto
ma już aktywnego członka w tej mapie, zamiast nowego członka zwracany jest nowy klucz urządzenia dla
istniejącego (bez duplikatu).

### Algorytm `POST /account/link`

Dla każdego klucza z `tokens`:
1. Klucz → członek `m` (aktywny). Brak, usunięty albo mapa nie istnieje → pomiń (bez błędu).
2. `m.user_id` = to konto → bez zmian.
3. `m.user_id` = **inne** konto → pomiń (nie przejmujemy cudzego członka).
4. `m.user_id` puste:
   - konto nie ma członka w `m.space_id` → `m.user_id = konto`;
   - konto ma już członka `e` w tej mapie → **scal**:
     - `keep` = ten z `e` i `m`, który wcześniej dołączył (`joined_at`), `drop` = drugi;
     - jeśli `drop.role = 'owner'`: najpierw `drop.role = 'member'`, potem `keep.role = 'owner'`
       (kolejność ze względu na indeks „jeden założyciel”);
     - `UPDATE member_tokens SET member_id = keep WHERE member_id = drop`;
     - `drop.removed_at = teraz`, `drop.merged_into = keep`, `keep.user_id = konto`.

Następnie:
- brak mapy `personal` konta → utwórz ją: `spaces(kind='personal', owner_user_id, name='Moje')`
  z losowym, nieujawnianym kluczem zaproszenia i członka `role='owner'`, `user_id`,
  imię = część adresu e-mail przed `@`, kolor `slate`;
- dla każdej aktywnej mapy konta: jeśli urządzenie przesłało klucz, który teraz wskazuje tego
  członka, zwróć ten klucz; w przeciwnym razie wydaj nowy klucz urządzenia (`member_tokens`).

Wszystko w `env.DB.batch` (jedna transakcja) na każdy krok scalania.

### Maile (nowy plik `mail.ts`)

- `MAIL_MODE` (zmienna Workera): `resend` (produkcja) albo `log` (lokalnie: nic nie jest wysyłane,
  kod i link trafiają do `console.log` i do odpowiedzi 202 jako `{ dev: { code, link } }` — z tego
  korzysta test dymny). Tryb `log` działa **tylko**, gdy każdy adres w `ALLOWED_ORIGINS` to
  `http://localhost:*`; w przeciwnym razie Worker traktuje go jak `resend`, więc pomyłka w
  konfiguracji produkcji nie ujawni kodu.
- `RESEND_API_KEY` jako sekret Workera. Brak klucza przy `resend` → `/auth/request` zwraca **503**
  „Logowanie jest chwilowo niedostępne”, a reszta API działa.
- Temat: „Kod logowania do znajdzgroby.pl: 123 456” (kod widać bez otwierania maila).
- Treść po polsku, bez obrazków: „Twój kod do znajdzgroby.pl: **123 456**. Albo kliknij: <link>.
  Kod ważny 15 minut. Jeśli to nie Ty — zignoruj tę wiadomość.”

### Bezpieczeństwo

- Kod: 6 cyfr z `crypto.getRandomValues`. Link: 32 bajty base64url. W bazie tylko SHA-256.
- Limity: 5 próśb o kod na adres na godzinę, 5 błędnych prób na kod, ważność 15 minut, jedno użycie.
- E-mail: przycięty, małe litery, prosta walidacja `x@y.z`, najwyżej 254 znaki.
- Sesja: 365 dni od ostatniego użycia; `last_seen_at` i `expires_at` aktualizowane najwyżej raz na dobę.
- CORS bez zmian (nowe nagłówki: `X-Session` dopisany do `Access-Control-Allow-Headers`).

## Część 2 — telefon

### Dane

- `localStorage` `znajdzgroby-session`: `{ token, email }` (jak inne ustawienia).
- `LocalSpace` dostaje `kind?: 'family' | 'personal'` (brak = family). Bez nowej wersji Dexie: pole
  nie jest indeksowane.
- `LOCAL_SPACE_ID` („Moje” tylko w telefonie) zostaje. Po zalogowaniu jest puste i ukryte, bo groby
  trafiają do mapy `personal` o nazwie „Moje”.

### `AccountService` (nowy) i przepływ logowania

1. `requestCode(email)` → `POST /auth/request`.
2. `verify({email, code} | {link})` → zapis sesji.
3. `link()`:
   - wysyła klucze członka wszystkich map z `memberToken` (pomija `needs-profile` i `removed`);
   - dla każdej mapy z odpowiedzi: jeśli w telefonie jest mapa o tym `serverId`, aktualizuje jej
     `memberToken`, `memberId`, `role` i `name`; w przeciwnym razie dodaje nową (`rev = 0`, pobierze
     wszystko);
   - mapa `personal`: dodana albo zaktualizowana jak wyżej z `kind: 'personal'`; groby z `local`
     przechodzą do niej przez `moveGraves` (z kolejkami zdjęć, jak przy przenoszeniu do mapy
     rodzinnej). Aktywna `local` → aktywna staje się `personal`;
   - na koniec synchronizacja.
4. `logout()`: `POST /auth/logout` (błąd sieci nie blokuje), potem `forget(id, false)` dla każdej
   mapy z kluczem pochodzącym z konta (wszystkie mapy poza `local`), usunięcie sesji i aktywna `local`.
   Wcześniej potwierdzenie i sprawdzenie niewysłanych zmian (jak przy opuszczaniu mapy).

`link()` jest wołane też przy każdym starcie aplikacji z sesją (raz na dobę), żeby mapy dodane na
innym urządzeniu (np. dołączenie do mapy żony z laptopa) pojawiły się i tutaj.

### Ekrany

- **`/logowanie`**: e-mail → „Wyślij kod” → pole na 6 cyfr („Wpisz kod z maila”, „Wyślij ponownie”
  po 60 s). Wejście z linku (`/logowanie#<link>`) loguje samo i czyści adres z paska. Po sukcesie
  komunikat „Przenoszę X grobów i Y zdjęć na konto…”, a potem Start.
- **Ustawienia → „Konto”** (pierwsza sekcja):
  - bez sesji: „Zaloguj się, żeby mieć groby na każdym urządzeniu” → `/logowanie`;
  - z sesją: e-mail i „Wyloguj” (z potwierdzeniem).
- **Start**: pasek „Zaloguj się, żeby nie stracić grobów przy zmianie telefonu lub przeglądarki”
  z „Później”, które ukrywa go na 7 dni. Pokazywany tylko bez sesji i gdy telefon ma jakiekolwiek groby.
- **Powitanie**: dodatkowy przycisk „Mam już konto — zaloguj się”.
- **Dołączanie z linku**: z sesją `POST /join` z `X-Session`. Bez sesji jak dziś, plus podpowiedź
  „Zaloguj się, żeby mapa była też na innych urządzeniach”.
- **Przełącznik map i panel mapy**: mapa `personal` nazywa się „Moje”, nie ma członków, zaproszeń
  ani opcji wyjścia. W przełączniku jest pierwsza.
- **Kopia do pliku**: opis „Plik bez zdjęć — zalogowanie przenosi wszystko, także zdjęcia”.

## Wdrożenie

1. **Użytkownik:** konto Resend, domena `znajdzgroby.pl` (region UE), rekordy DNS w panelu Hostingera
   (DKIM TXT `resend._domainkey` i rekordy `send`, które poda Resend), weryfikacja domeny, sekret
   `RESEND_API_KEY` dla Workera (`npx wrangler secret put RESEND_API_KEY` w `worker/`).
2. **PR API:** migracja 0005, `accounts.ts`, `mail.ts`, zmiana `authenticate()`, blokady mapy
   `personal`. Zgodny wstecz: obecna aplikacja nie zauważa zmian.
3. **PR front:** `AccountService`, ekrany, `link()`, wylogowanie.
4. **Użytkownik:** logowanie na telefonie z brązowym „Kacprem” (przypięcie i „Moje” na serwer),
   potem w drugiej przeglądarce (zielony scala się z brązowym), potem reszta rodziny. Niebieski
   „Kacper” i stara „Weronika” ze starego adresu nie zalogują się już nigdy — założyciel usuwa ich
   ręcznie.

## Testy

- **Test dymny API** (`npm run smoke`, lokalnie z `MAIL_MODE=log`, kod z pola `dev` odpowiedzi):
  - prośba o kod (zawsze 202), zły kod (401, licznik prób), 6. próba (401 nawet z dobrym kodem),
    wygasły kod, link jednorazowy, limit 5 próśb na godzinę;
  - `/account/link`: przypięcie członka, scalenie dwóch członków tej samej osoby (z przejęciem roli
    założyciela), pominięcie członka innego konta, mapa prywatna tworzona raz;
  - blokady mapy `personal` (403); `/join` z `X-Session` nie tworzy duplikatu;
  - obecne zachowanie (dotychczasowe sekcje testu dymnego) bez zmian.
- **Vitest:** czysta logika łączenia odpowiedzi `/account/link` z mapami w telefonie (dopasowanie po
  `serverId`, nowe mapy, mapa prywatna), normalizacja e-maila, decyzja o pokazaniu paska na Starcie.
- **E2E (Playwright, lokalny Worker, dwa konteksty):**
  - telefon A z grobami w „Moje” i mapą rodzinną loguje się → groby i zdjęcia na serwerze;
  - kontekst B loguje się tym samym kontem → widzi „Moje” ze zdjęciami i mapę rodzinną;
  - kontekst C był członkiem tej samej mapy bez konta → po zalogowaniu jeden członek zamiast dwóch;
  - wylogowanie czyści dane konta z przeglądarki, a ponowne zalogowanie je przywraca.

## Ryzyka

- **Maile w spamie albo opóźnione.** Mitygacja: zweryfikowana domena (DKIM), krótka treść bez linków
  śledzących, „Wyślij ponownie”, kod widoczny już w temacie maila.
- **Limit Resend (100 maili na dobę).** Przy rodzinie wystarcza z dużym zapasem. Przekroczenie →
  503 z komunikatem; dane i synchronizacja działają dalej.
- **Wylogowanie z niewysłanymi zmianami.** Mitygacja: ostrzeżenie i blokada, dopóki kolejka nie
  jest pusta (albo świadome potwierdzenie).
- **Scalenie dwóch członków różnych osób dzielących jedno konto e-mail.** To świadomy wybór: konto =
  osoba. Opisane w pomocy przy logowaniu.
- **Groby z „Moje” po zalogowaniu na dwóch telefonach** łączą się w jedną prywatną mapę (suma, bez
  usuwania). Ten sam grób dodany ręcznie na dwóch telefonach będzie dwa razy, bo ma różne id —
  użytkownik usuwa duplikat.
