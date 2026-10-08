# Konta: e-mail i hasło

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
| Sposób logowania | **E-mail i hasło.** Kod z maila (6 cyfr + link) tylko do potwierdzenia adresu przy zakładaniu konta i do ustawienia nowego hasła. Bez Google i innych dostawców. |
| Hashowanie haseł | PBKDF2-SHA256 (WebCrypto), losowa sól, **20 000 iteracji** — mieści się w 10 ms CPU darmowego Workera. Algorytm i liczba iteracji zapisane przy haśle, więc po przejściu na płatny plan hasła przeliczają się na mocniejsze przy następnym logowaniu. |
| Zasady hasła | 8–128 znaków; po 5 błędnych próbach logowanie na to konto blokowane na 15 minut. |
| Czy konto jest obowiązkowe | **Opcjonalne.** Bez logowania aplikacja działa jak dziś. |
| Technika | Własne logowanie w Workerze, sesja jako token `Bearer` (wariant A). Bez ciasteczek, bez zmian DNS dla API. |
| Wysyłka maili | Resend (darmowy plan: 100/dobę), nadawca `logowanie@znajdzgroby.pl`. |
| „Moje” po zalogowaniu | Prywatna mapa na serwerze (ten sam mechanizm co rodzinna, bez zaproszeń). |
| Duplikaty członków | Logowanie z urządzenia z innym członkiem tej samej mapy scala go z członkiem konta. |
| Kopia do pliku | Zostaje dla osób bez konta, z dopiskiem „bez zdjęć”. Usunięcie to osobna, późniejsza decyzja. |
| Twardy warunek | Wdrożenie **niczego nie usuwa ani nie nadpisuje**: obecni członkowie, groby i zdjęcia zostają. |

Poza zakresem: logowanie przez Google lub Apple, logowanie samym kodem bez hasła, usuwanie konta, zmiana adresu e-mail, wielu
właścicieli „Moje”, udostępnianie „Moje” innym (do tego są mapy rodzinne), usunięcie kopii do pliku.

## Przepływy

- **Założenie konta:** e-mail → mail z kodem → wpisanie kodu (potwierdza adres i chroni przed
  literówką) → ustawienie hasła → zalogowany.
- **Logowanie:** e-mail + hasło.
- **Nie pamiętam hasła:** ten sam przepływ co założenie konta — e-mail → kod → nowe hasło. Serwer
  sam rozpoznaje, czy konto istnieje; odpowiedzi są identyczne, więc nie da się sprawdzić, czy dany
  adres ma konto. Ustawienie nowego hasła unieważnia sesje na innych urządzeniach.

Dlaczego kod, a nie sam link: link z maila na iPhonie otwiera się w Safari, a aplikacja dodana do
ekranu początkowego ma osobne dane, więc potwierdzenie w Safari nie dotarłoby do niej. Kod wpisuje
się w tej samej aplikacji. Link zostaje jako wygoda w przeglądarce.

## Część 1 — serwer (Worker + D1)

### Migracja `worker/migrations/0005_accounts.sql`

Migracja tylko dodaje tabele i kolumny oraz kopiuje dane. Niczego nie usuwa ani nie zmienia
w istniejących wierszach.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- znormalizowany: małe litery, bez spacji
  password_hash TEXT NOT NULL,         -- base64 wyniku PBKDF2
  password_salt TEXT NOT NULL,         -- base64, 16 losowych bajtów
  password_algo TEXT NOT NULL,         -- 'pbkdf2-sha256'
  password_iterations INTEGER NOT NULL,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,                -- blokada po 5 błędnych hasłach (15 minut)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
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

-- Potwierdzenie adresu (zakładanie konta / nowe hasło): kod (6 cyfr) i link, oba jako SHA-256,
-- ważne 15 minut. Po poprawnym kodzie wiersz dostaje setup_hash — jednorazowe prawo do ustawienia hasła.
CREATE TABLE login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  link_hash TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0, -- błędne kody; po 5 kod przepada
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  setup_hash TEXT UNIQUE,              -- SHA-256 tokenu ustawienia hasła (ważny 15 minut od użycia kodu)
  setup_expires_at INTEGER
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
| `POST /auth/verify {email, code}` albo `{link}` | brak | Sprawdza kod lub link (ważność, nieużyty, `attempts < 5`). Błędny kod zwiększa `attempts`. Sukces: oznacza kod jako użyty i zwraca `{ setupToken, email }` — jednorazowe prawo do ustawienia hasła przez 15 minut. Błąd: 401 „Kod jest nieprawidłowy albo wygasł”. |
| `POST /auth/password {setupToken, password}` | brak | Hasło 8–128 znaków (400 przy innym). Tworzy konto, jeśli go brak, albo ustawia nowe hasło istniejącemu (wtedy usuwa jego pozostałe sesje i zdejmuje blokadę). Unieważnia `setupToken`, tworzy sesję i zwraca `{ session, user: { id, email } }`. |
| `POST /auth/login {email, password}` | brak | Poprawne → sesja jak wyżej, zeruje `failed_logins`; przy słabszych parametrach hasha niż obecne ustawienia przelicza hash. Błędne → `failed_logins + 1`, przy 5 → `locked_until = teraz + 15 min`. Zawsze ten sam komunikat 401 „E-mail lub hasło są nieprawidłowe” (także dla nieistniejącego konta — wtedy liczymy hash na atrapie, żeby czas odpowiedzi nie zdradzał istnienia konta). Zablokowane konto → 429 „Za dużo prób. Spróbuj za kilkanaście minut albo ustaw nowe hasło.” |
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

### Hasła (nowy plik `password.ts`)

- `hashPassword(password, salt, iterations)` — `crypto.subtle.deriveBits` PBKDF2-SHA256, 256 bitów.
- `PASSWORD_ITERATIONS = 20000` jako stała; przed wdrożeniem zmierzyć na produkcyjnym Workerze, że
  `POST /auth/login` mieści się w limicie CPU (w Wedding Plannerze: 50 000 iteracji ≈ 10 ms).
- Porównanie hashy w stałym czasie (`crypto.subtle.timingSafeEqual`).
- Przy logowaniu: jeśli zapisane `password_algo`/`password_iterations` są słabsze niż obecne ustawienia,
  hash jest przeliczany i zapisywany (ścieżka na przyszły płatny plan, bez udziału użytkownika).

### Bezpieczeństwo

- Kod: 6 cyfr z `crypto.getRandomValues`. Link i `setupToken`: 32 bajty base64url. W bazie tylko SHA-256.
- Hasło: tylko hash PBKDF2 z solą; nigdy w logach ani odpowiedziach.
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

1. `login(email, password)` → `POST /auth/login` → zapis sesji.
2. Zakładanie konta i nowe hasło: `requestCode(email)` → `POST /auth/request`; `verify({email, code} | {link})`
   → `setupToken`; `setPassword(setupToken, password)` → `POST /auth/password` → zapis sesji.
3. `link()` (po każdym udanym zalogowaniu albo ustawieniu hasła):
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

- **`/logowanie`** — trzy kroki na jednym ekranie:
  - „Zaloguj się”: e-mail, hasło (z przyciskiem pokaż/ukryj), „Zaloguj”; pod spodem „Nie pamiętam
    hasła” i „Nie mam konta — załóż”;
  - „Załóż konto” / „Nie pamiętam hasła”: e-mail → „Wyślij kod” → pole na 6 cyfr („Wyślij ponownie”
    po 60 s) → „Ustaw hasło” (jedno pole z pokaż/ukryj, licznik „min. 8 znaków”);
  - wejście z linku (`/logowanie#<link>`) od razu przechodzi do „Ustaw hasło” i czyści adres z paska.
  Po sukcesie komunikat „Przenoszę X grobów i Y zdjęć na konto…”, a potem Start.
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
  - ustawienie hasła: za krótkie (400), `setupToken` jednorazowy, nowe konto i nowe hasło istniejącego
    (stare sesje unieważnione);
  - logowanie: poprawne, złe hasło i nieistniejące konto dają ten sam 401, blokada po 5 próbach (429),
    przeliczenie hasha po podniesieniu liczby iteracji;
  - `/account/link`: przypięcie członka, scalenie dwóch członków tej samej osoby (z przejęciem roli
    założyciela), pominięcie członka innego konta, mapa prywatna tworzona raz;
  - blokady mapy `personal` (403); `/join` z `X-Session` nie tworzy duplikatu;
  - obecne zachowanie (dotychczasowe sekcje testu dymnego) bez zmian.
- **Vitest:** czysta logika łączenia odpowiedzi `/account/link` z mapami w telefonie (dopasowanie po
  `serverId`, nowe mapy, mapa prywatna), normalizacja e-maila, walidacja hasła w formularzu, decyzja
  o pokazaniu paska na Starcie.
- **E2E (Playwright, lokalny Worker, dwa konteksty):**
  - telefon A z grobami w „Moje” i mapą rodzinną zakłada konto (kod + hasło) → groby i zdjęcia
    na serwerze;
  - kontekst B loguje się tym samym e-mailem i hasłem → widzi „Moje” ze zdjęciami i mapę rodzinną;
  - „Nie pamiętam hasła” w kontekście B → nowe hasło; sesja w kontekście A wygasa;
  - kontekst C był członkiem tej samej mapy bez konta → po zalogowaniu jeden członek zamiast dwóch;
  - wylogowanie czyści dane konta z przeglądarki, a ponowne zalogowanie je przywraca.

## Ryzyka

- **Maile w spamie albo opóźnione.** Mitygacja: zweryfikowana domena (DKIM), krótka treść bez linków
  śledzących, „Wyślij ponownie”, kod widoczny już w temacie maila.
- **Limit Resend (100 maili na dobę).** Przy rodzinie wystarcza z dużym zapasem. Przekroczenie →
  503 z komunikatem; dane i synchronizacja działają dalej.
- **Słabsze hashowanie haseł na darmowym planie** (20 tys. iteracji zamiast zalecanych 600 tys.).
  Przy wycieku bazy proste hasła dałoby się łamać szybciej. Mitygacja: minimum 8 znaków, blokada prób,
  w bazie tylko hashe, przeliczenie na mocniejsze automatycznie po przejściu na płatny plan.
- **Zapomniane hasło bez dostępu do maila** = brak dostępu do konta (dane i tak zostają w telefonie
  i na serwerze; założyciel mapy może dodać osobę ponownie przez zaproszenie).
- **Wylogowanie z niewysłanymi zmianami.** Mitygacja: ostrzeżenie i blokada, dopóki kolejka nie
  jest pusta (albo świadome potwierdzenie).
- **Scalenie dwóch członków różnych osób dzielących jedno konto e-mail.** To świadomy wybór: konto =
  osoba. Opisane w pomocy przy logowaniu.
- **Groby z „Moje” po zalogowaniu na dwóch telefonach** łączą się w jedną prywatną mapę (suma, bez
  usuwania). Ten sam grób dodany ręcznie na dwóch telefonach będzie dwa razy, bo ma różne id —
  użytkownik usuwa duplikat.
