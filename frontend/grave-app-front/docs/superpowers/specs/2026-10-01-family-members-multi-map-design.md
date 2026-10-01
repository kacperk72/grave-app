# Rodzinne mapy: członkowie i wiele map w jednym telefonie

Data: 2026-10-01
Aplikacja: `grave-app` — Worker `worker/` (Cloudflare Worker + D1 + KV) i front `frontend/grave-app-front`

## Cel

1. **Wiedzieć, kto ma dostęp do rodzinnej mapy.** Dziś dostęp daje jeden wspólny klucz z linku —
   serwer nie wie, ile telefonów go używa ani czyje są. Chcemy listę członków (imię + awatar,
   kiedy dołączył, kiedy ostatnio synchronizował) i możliwość usunięcia jednej osoby.
2. **Należeć do kilku map naraz i przełączać się między nimi.** Przykład: „Rodzina Kubitów"
   i „Rodzina żony" — rodzina żony nie widzi moich bliskich, a ja widzę obie mapy.

## Decyzje (uzgodnione)

| Temat | Decyzja |
|---|---|
| Kim jest członek | Profil w telefonie: imię + awatar (inicjały na kolorze). Bez haseł, maili, kont. Osobny klucz na telefon. |
| Dołączanie z linku | Od razu, bez akceptacji. Każdy pojawia się na liście członków. |
| Uprawnienia | Tylko założyciel usuwa członków, zmienia link, zmienia nazwę mapy. Może przekazać rolę innemu członkowi. |
| Wiele map | Przełącznik — widać jedną mapę naraz. Grób należy do jednej mapy; można go przenieść albo skopiować. |
| Dołączenie a moje groby | Dołączenie **nic nie wysyła**. Groby trafiają na mapę tylko świadomie (przeniesienie/kopia, pytanie przy zakładaniu mapy). |

Poza zakresem: prawdziwe konta i logowanie, akceptacja nowych członków, jednorazowe zaproszenia,
widok „Wszystkie mapy" naraz, powiadomienia o zmianach, role pośrednie (zarządcy).

## Część 1 — serwer (Worker + D1)

### Migracja `worker/migrations/0003_members.sql`

```sql
ALTER TABLE spaces ADD COLUMN name TEXT NOT NULL DEFAULT 'Rodzinna mapa';
-- spaces.token_hash zostaje i od teraz znaczy: hash klucza z LINKU ZAPROSZENIA

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,     -- SHA-256 klucza członka (sam klucz tylko w telefonie)
  name TEXT NOT NULL,                  -- 1–40 znaków
  color TEXT NOT NULL,                 -- jeden z ustalonych kluczy palety, np. 'sage'
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  removed_at INTEGER                   -- usunięty przez założyciela albo sam wyszedł
);
CREATE INDEX members_space ON members (space_id);

ALTER TABLE graves ADD COLUMN updated_by TEXT;  -- id członka; NULL dla zapisów sprzed migracji

-- Kolejka bajtów zdjęć do usunięcia z KV po skasowaniu mapy (darmowe KV: 1000 usunięć/dobę)
CREATE TABLE photo_purge (
  key TEXT PRIMARY KEY,
  queued_at INTEGER NOT NULL
);
ALTER TABLE usage_daily ADD COLUMN photo_deletes INTEGER NOT NULL DEFAULT 0;
```

Klucze w KV (`<id mapy>/<id zdjęcia>/<wariant>`) bez zmian.

### Uwierzytelnianie

`authenticate()` zwraca `{ space, member }`:

1. Hash klucza z `Authorization: Bearer` szukany w `members` (gdzie `removed_at IS NULL`) → normalny członek.
2. Trafienie w `members` z `removed_at` → **401 `{ code: 'member_removed' }`** z komunikatem
   „Nie masz już dostępu do tej mapy". (Kto miał ważny klucz, może się dowiedzieć, że go usunięto.)
3. Trafienie w `spaces.token_hash` (klucz zaproszenia) → **dostęp przejściowy** (`member = null`):
   synchronizacja grobów i zdjęć działa jak dziś, żeby stare wersje aplikacji (PWA trzyma cache)
   nie przestały działać. Akcje założyciela są niedostępne. Wyłączane zmienną
   `ALLOW_INVITE_AS_MEMBER` (`wrangler.jsonc`) w osobnym, późniejszym kroku.
4. W pozostałych przypadkach → 401 jak dziś („Link do rodzinnej mapy jest nieaktualny").

`last_seen_at` aktualizowany na członku (i jak dziś na mapie), najwyżej raz na minutę, żeby nie
pisać do D1 przy każdym zapytaniu.

### Endpointy

| Metoda i ścieżka | Kto | Działanie |
|---|---|---|
| `POST /spaces {name, member: {name, color}}` | każdy | Tworzy mapę i założyciela. Zwraca `{ spaceId, name, invite, memberToken, memberId }`. |
| `GET /invite` (Bearer = klucz zaproszenia) | posiadacz linku | Podgląd przed dołączeniem: `{ spaceId, name, graves, members: [{name, color}] }`. Zastępuje `GET /space` w ekranie dołączania. |
| `POST /join {name, color}` (Bearer = klucz zaproszenia) | posiadacz linku | Tworzy członka, zwraca `{ spaceId, name, memberToken, memberId, role }`. Gdy mapa nie ma jeszcze założyciela (mapa sprzed migracji) — pierwszy dołączający zostaje `owner`. |
| `GET /space` | członek | `{ spaceId, name, graves, rev, me: {id, role} }` |
| `GET /members` | członek | `[{ id, name, color, role, joinedAt, lastSeenAt }]` (bez usuniętych) |
| `PATCH /me {name?, color?}` | członek | Zmiana własnego podpisu. |
| `POST /space/leave` | członek (nie założyciel) | Ustawia `removed_at` na sobie. |
| `PATCH /space {name}` | założyciel | Zmiana nazwy mapy. |
| `POST /space/rotate` | założyciel | Nowy klucz zaproszenia. **Dołączeni członkowie działają dalej.** |
| `DELETE /members/:id` | założyciel | Usuwa członka (`removed_at`). Nie da się usunąć siebie. |
| `POST /members/:id/owner` | założyciel | Przekazanie roli: ja → `member`, on → `owner` (jedna transakcja). |
| `DELETE /space` | założyciel, gdy jest jedynym członkiem | Usuwa mapę (kaskada: groby, członkowie). Klucze zdjęć z `photo_objects` trafiają do `photo_purge`. |
| `GET/POST /changes`, `/photos/:id` | członek (lub dostęp przejściowy) | Bez zmian w kształcie. `POST /changes` zapisuje `updated_by`; `GET /changes` zwraca `updatedBy` przy każdej zmianie. |

Walidacja: `name` przycięte, 1–40 znaków; `color` z listy palety; limit 50 członków na mapę (413).

### Sprzątanie zdjęć skasowanej mapy

Cron Trigger Workera (raz na dobę, darmowy) usuwa z KV klucze z `photo_purge`, najwyżej tyle,
ile zostało z dziennego bezpiecznika usunięć (900, licznik `usage_daily.photo_deletes`).
`photo_objects` usuwane razem z kluczem, więc bezpiecznik miejsca liczy uczciwie do końca.
`DELETE /photos/:id` też zaczyna liczyć `photo_deletes`.

## Część 2 — telefon

### Dane: Dexie v4 (`IndexedDbService`)

- Nowa tabela **`spaces`** (klucz: lokalne `id`):
  ```ts
  interface LocalSpace {
    id: string;              // 'local' dla „Moje", dla rodzinnych losowy UUID nadany w telefonie
    serverId: string | null; // id mapy na serwerze; null dla 'local' i do czasu dołączenia mapy sprzed migracji
    name: string;
    memberToken: string | null;
    inviteToken: string | null; // tylko mapa sprzed migracji, do pierwszego /join
    memberId: string | null;
    role: 'owner' | 'member' | null;
    rev: number;
    syncedAt: number | null;
    status: 'active' | 'removed' | 'needs-profile';
  }
  ```
  Lokalne `id` niezależne od serwerowego — dzięki temu migracja nie musi przepisywać grobów,
  gdy serwer poda swoje id.
- `graves`, `outbox`, `photoOutbox` dostają pole i indeks `spaceId`.
- `photoBlobs` bez zmian (id zdjęć są unikalne).
- Klucz, `rev` i czas synchronizacji przestają być w `localStorage` (`gravemap-family-*`) —
  są w `spaces`. W `localStorage` zostają tylko: `gravemap-active-space` i `gravemap-profile`
  (`{ name, color }` — domyślny podpis podpowiadany przy kolejnych dołączeniach).

### Migracja v3 → v4 (upgrade Dexie, bez sieci)

Czysta funkcja `planSpaceMigration(legacyToken, legacyRev)` (testowalna) wyznacza wiersze `spaces`
i `spaceId` dla grobów:

- **Bez rodzinnej mapy:** jeden wiersz `local` („Moje"), wszystkie groby i kolejki → `local`.
- **Z rodzinną mapą:** wiersz `local` (pusty) + wiersz mapy rodzinnej z `inviteToken = <stary klucz>`,
  `rev = <stary rev>`, `status = 'needs-profile'`. Wszystkie groby i obie kolejki → ta mapa;
  aktywna mapa = ona. Klucze `gravemap-family-*` usuwane z `localStorage` po udanym upgradzie.

Mapa w stanie `needs-profile` synchronizuje się dalej starym kluczem (dostęp przejściowy), więc
nic nie ginie, dopóki użytkownik nie poda imienia. Po podaniu → `POST /join` → zapis
`memberToken`, `memberId`, `role`, `serverId`, `inviteToken = null`, `status = 'active'`.

### Aktywna mapa

- Nowy **`SpaceService`** (`core/services/space.service.ts`): sygnały `spaces()`, `activeSpaceId()`,
  `activeSpace()`; metody `setActive`, `create`, `join`, `rename`, `leave`, `forget`
  (usunięcie mapy z telefonu), `adoptProfile`.
- **`GraveService`** wczytuje groby tylko z `activeSpaceId()` i przeładowuje się przy zmianie mapy.
  Nowy grób dostaje `spaceId` aktywnej mapy. Start, lista, mapa i nawigacja nie wiedzą o wielu mapach.
- Gdy aktywna mapa ma `status = 'removed'` — tylko odczyt: brak „Dodaj grób", edycji i usuwania.
- Kopia zapasowa (eksport/import) działa na aktywnej mapie; import dokłada do aktywnej mapy.

### Synchronizacja (`FamilySyncService`)

- Cykl przechodzi po kolei przez wszystkie mapy z kluczem (oprócz `local` i `removed`):
  zdjęcia → kolejka grobów → pobranie zmian → dociągnięcie zdjęć, każda mapa swoim kluczem i `rev`.
  Nieaktywne mapy też, żeby po przełączeniu na cmentarzu bez zasięgu dane były świeże.
- Stan synchronizacji osobno dla każdej mapy (`Map<spaceId, SyncState>`); błąd jednej mapy nie
  zatrzymuje pozostałych.
- 401 z `code: 'member_removed'` → mapa `status = 'removed'`, komunikat
  „Nie masz już dostępu do mapy X". Zwykłe 401 → jak dziś „link przestał działać".
- `GET /members` pobierane przy otwarciu panelu mapy i przy każdej synchronizacji aktywnej mapy
  (do awatarów w przełączniku); trzymane w pamięci, nie w IndexedDB.

### Dołączanie — `/rodzina#<klucz>`

1. `GET /invite` → podgląd: nazwa mapy, liczba grobów, awatary członków.
2. Jeśli telefon już ma mapę o tym `serverId` → przełącz na nią, koniec.
3. Formularz podpisu (imię + kolor, podpowiedziane z `gravemap-profile`).
4. `POST /join` → nowy wiersz `spaces`, synchronizacja, mapa staje się aktywna.
5. Tekst na ekranie: „Twoje groby nie zostaną wysłane na tę mapę."

### Zakładanie mapy

Nazwa mapy + podpis → `POST /spaces`. Jeśli „Moje" ma groby: pytanie
„Przenieść N grobów z »Moje« na nową mapę?" (Przenieś / Zostaw w »Moje«).

### Przeniesienie i kopia grobu

Czysta logika w `shared/utils/grave-transfer.ts` (testowalna):

- **Przenieś do…**: ten sam `id` grobu i zdjęć. Grób zmienia `spaceId`; w kolejce mapy źródłowej
  `delete` (jeśli rodzinna), w kolejce docelowej `put`. Bajty zdjęć: `delete` w kolejce źródłowej,
  `put` w docelowej (bajty zostają w telefonie).
- **Kopiuj do…**: nowy `id` grobu, osób i zdjęć; bajty zdjęć skopiowane pod nowe id — usunięcie
  w jednej mapie nie kasuje zdjęcia w drugiej. Bez zdjęć, których bajtów telefon nie ma
  (komunikat „N zdjęć pominięto — nie ma ich w tym telefonie").
- Przy przenoszeniu z rodzinnej mapy potwierdzenie: „Grób zniknie z mapy X także u pozostałych osób".

### Wyjście i usunięcie z mapy

- **Opuść mapę** (członek): `POST /space/leave`, potem wybór: „Zachowaj kopię w »Moje«"
  (groby przenoszone do `local`, bez kolejek) albo „Usuń z telefonu".
- **Założyciel**: „Opuść" niedostępne, dopóki nie przekaże roli; gdy jest jedynym członkiem —
  „Usuń mapę" (`DELETE /space`, potem ten sam wybór co wyżej).
- **Usunięty przez założyciela**: mapa tylko do odczytu z tym samym wyborem w banerze.
  Tego, co już pobrał, nie da się mu odebrać — tekst nie obiecuje inaczej.
- Niewysłane zmiany: ostrzeżenie jak dziś („N niewysłanych zmian nie trafi do rodziny").

## Część 3 — wygląd

Styl „2026" (monochrom, pigułki, Onest). Awatar: inicjały (1–2 litery) na jednym z 8 przygaszonych
kolorów (`sage`, `clay`, `sky`, `plum`, `sand`, `slate`, `rose`, `moss`) — tokeny w jasnym i ciemnym
motywie. Komponent `app-avatar` (+ `app-avatar-stack` z „+N").

### Przełącznik map (Start i Mapa)

- Pigułka w nagłówku: nazwa aktywnej mapy, kropka stanu synchronizacji, do 3 nakładających się
  awatarów. Ukryta, gdy telefon ma tylko „Moje".
- Dotknięcie → panel od dołu: lista map (nazwa, awatary, liczba grobów, stan, ✓ przy aktywnej),
  pod spodem „+ Utwórz rodzinną mapę" i „Masz link? Otwórz go na tym telefonie".

### Ustawienia → „Rodzinne mapy"

Lista map; każda prowadzi do nowej strony **`/mapy/:id`** (`features/family/space-page.component`):

- Nagłówek: nazwa mapy (założyciel: edycja w miejscu).
- „Ty": awatar, imię, rola, edycja podpisu (`PATCH /me`).
- **Członkowie**: awatar, imię, „Założyciel" przy właścicielu, „dołączył(a) 12.09",
  „aktywny 5 min temu" / „nieaktywny od 3 tyg.". Założyciel: menu „⋯" przy członku →
  „Usuń z mapy", „Przekaż rolę założyciela" (oba z potwierdzeniem).
- Akcje: „Wyślij zaproszenie"; „Zmień link zaproszenia" (założyciel; opis: osoby już dołączone
  zostają); „Opuść mapę" / „Usuń mapę" według zasad z części 2.
- Stan synchronizacji, „Synchronizuj teraz", ostrzeżenie o zdjęciach — przeniesione z obecnej karty.

### Szczegóły grobu

Linijka „Ostatnio zmienił(a): [awatar] Ania · 3 dni temu" (z `updatedBy` + listy członków).
Ukryta w „Moje" i dla zapisów bez `updatedBy`. Akcje „Przenieś do…" / „Kopiuj do…" w menu grobu,
widoczne, gdy telefon ma więcej niż jedną mapę.

### Jednorazowe okienko po aktualizacji

Dla mapy `needs-profile`: „Rodzinna mapa ma teraz listę osób. Jak się podpisać?" — imię + kolor.
Jeśli `/join` zwróci `role: 'owner'`, od razu drugi krok: „Nazwij mapę" (domyślnie „Rodzinna mapa").

## Testy

- **Vitest** (czysta logika): `planSpaceMigration`, `grave-transfer` (przeniesienie, kopia z nowymi
  id, pominięte zdjęcia), inicjały/kolor awatara, wybór map do synchronizacji.
- **Worker:** typecheck (`api.yml`).
- **E2E ręcznie w Playwright:** lokalny Worker (port 8791, `wrangler d1 migrations apply --local`)
  + dwa izolowane konteksty przeglądarki z grobami wstrzykniętymi do IndexedDB. Scenariusze:
  migracja telefonu z mapą sprzed zmian, dołączenie bez wysyłania grobów, przełączanie,
  usunięcie członka, przekazanie roli, przeniesienie/kopia ze zdjęciem.
  Nigdy na produkcyjnej rodzinnej mapie.
- Build produkcyjny sprawdzony przez `grave-app-dist` (port 4270) przed PR frontu.

## Wdrożenie

1. **PR Worker** — migracja `0003`, nowe endpointy, dostęp przejściowy włączony, Cron Trigger.
   Obecna aplikacja działa bez zmian (stary klucz = dostęp przejściowy).
2. **PR frontend** — Dexie v4, `SpaceService`, przełącznik, panel mapy, okienko migracji.
3. **Po wdrożeniu:** użytkownik otwiera aplikację jako pierwszy, żeby zostać założycielem swojej
   mapy; sprawdzenie w D1 (`members` z `role = 'owner'`), w razie potrzeby ręczna poprawka.
4. **Później, osobno:** gdy wszyscy członkowie mają wpis w `members` — `ALLOW_INVITE_AS_MEMBER=false`.

## Ryzyka

- **Założyciel mapy sprzed migracji = pierwszy dołączający.** Jeśli ktoś z rodziny otworzy nową
  wersję pierwszy, zostanie założycielem — mitygacja: krok 3 wdrożenia + przekazanie roli.
- **Dostęp przejściowy osłabia usuwanie członków**, dopóki działa: posiadacz starego linku nadal
  synchronizuje. Zmiana linku zaproszenia przez założyciela odcina też dostęp przejściowy.
- **Utrata telefonu założyciela** = mapa bez zarządcy (bez kont nie da się odzyskać roli).
  Mitygacja: przekazanie roli zawczasu; w ostateczności ręczna zmiana w D1.
