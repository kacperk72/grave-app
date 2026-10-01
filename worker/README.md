# grave-app-api — rodzinna mapa

Cloudflare Worker + baza D1. Przechowuje wspólne groby rodziny; aplikacja
(frontend/grave-app-front) trzyma kopię w IndexedDB i synchronizuje ją z tym API.

## Jak to działa

- **Źródło prawdy:** baza D1 `grave-app`. Telefon ma kopię roboczą (offline) i kolejkę
  własnych zmian (`outbox` w IndexedDB).
- **Dostęp:** link `/rodzina#<klucz>` to **zaproszenie** (klucz po `#` nie trafia do serwera
  strony; w D1 jest tylko jego SHA-256). Dołączenie (`POST /join`) daje telefonowi **własny
  klucz członka** z imieniem i kolorem awatara. Usunięty członek dostaje 401 z
  `code: "member_removed"`. Nowy link zaproszenia nie odcina osób, które już dołączyły.
  Przejściowo klucz z linku działa jak klucz członka (`ALLOW_INVITE_AS_MEMBER` w
  `wrangler.jsonc`), żeby wersje aplikacji sprzed list członków działały do aktualizacji.
- **Synchronizacja:** telefon wysyła kolejkę (`POST /changes`), potem pobiera zmiany po
  ostatnim znanym numerze (`GET /changes?since=N`). Każdy zapis dostaje kolejny `rev`
  mapy. Usunięcia zostają jako nagrobki (`deleted = 1`), żeby dotarły do innych.
- **Konflikty:** wygrywa zapis, który później dotarł na serwer (cały grób naraz).

| Metoda | Ścieżka | Kto | Opis |
| --- | --- | --- | --- |
| POST | `/spaces` | każdy | `{name, member:{name,color}}` → mapa z założycielem; bez treści (stara aplikacja) → `{ token }` |
| GET | `/invite` | link zaproszenia | podgląd: nazwa, liczba grobów, członkowie (imię, kolor) |
| POST | `/join` | link zaproszenia | `{name,color}` → klucz członka; mapa bez założyciela → pierwszy zostaje założycielem |
| GET | `/space` | członek | nazwa, liczba grobów, `rev`, `me: {id, role}` |
| GET | `/members` | członek | lista członków (założyciel pierwszy, z ostatnią aktywnością) |
| PATCH | `/me` | członek | zmiana własnego imienia/koloru |
| POST | `/space/leave` | członek (nie założyciel) | wyjście z mapy |
| PATCH | `/space` | założyciel | zmiana nazwy mapy |
| POST | `/space/rotate` | założyciel | nowy link zaproszenia (stary przestaje działać) |
| DELETE | `/members/:id` | założyciel | usunięcie członka |
| POST | `/members/:id/owner` | założyciel | przekazanie roli założyciela |
| DELETE | `/space` | założyciel, gdy jest sam | usunięcie mapy (zdjęcia → kolejka sprzątania) |
| GET | `/changes?since=N` | członek | zmiany po `rev` N (strony po 500), z `updatedBy` |
| POST | `/changes` | członek | do 100 zmian naraz, w jednej transakcji |
| PUT | `/photos/:id?variant=full\|thumb` | członek | bajty zdjęcia (JPEG/WebP, do 5 MB) |
| GET | `/photos/:id?variant=full\|thumb` | członek | pobranie zdjęcia |
| DELETE | `/photos/:id` | członek | usunięcie obu wariantów |

Imię i nazwa mapy: 1–40 znaków; kolory awatara: `sage clay sky plum sand slate rose moss`;
najwyżej 50 członków na mapę.

**Zdjęcia** leżą w Workers KV `grave-app-photos` pod kluczem `<id mapy>/<id zdjęcia>/<wariant>`.
Opis zdjęcia (id, które jest główne) jedzie w danych grobu przez `/changes`. Telefon
zmniejsza zdjęcie przed wysłaniem (1600 px + miniatura 480 px) i trzyma bajty w IndexedDB,
więc zdjęcia są widoczne bez zasięgu.

KV zamiast R2 świadomie: darmowe KV ma twarde limity (1 GB, 1000 zapisów/dzień) i nie
wymaga karty, więc żaden błąd ani atak nie wygeneruje rachunku. Worker dodatkowo pilnuje
limitów sam (900 MB łącznie, 500 MB na mapę, 900 zapisów/dzień — migracja 0002) i zwraca
zrozumiały komunikat, zanim KV zacznie odrzucać zapisy.

**Sprzątanie zdjęć:** po usunięciu mapy klucze jej zdjęć trafiają do `photo_purge`, a Cron
(`17 3 * * *`, src/purge.ts) usuwa je z KV w limicie 900 usunięć na dobę (darmowe KV: 1000).
Lokalnie `npm run dev` ma `--test-scheduled`:
`curl "http://localhost:8791/__scheduled?cron=17+3+*+*+*"`.

## Lokalnie

```bash
npm install
npm run db:migrate:local
npm run dev            # http://localhost:8791, CORS dla localhost:4260 i 4200
npm run smoke          # test dymny API — TYLKO lokalnie, nigdy na produkcji
```

Frontend w trybie deweloperskim łączy się z `http://localhost:8791`
(`src/environments/environment.ts`).

## Wdrożenie

Po pushu na `main` robi to `.github/workflows/api.yml` (migracje + deploy), o ile
repozytorium ma sekrety `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID`. Ręcznie:

```bash
npx wrangler login
npm run db:migrate:remote
npm run deploy
```

Produkcja: <https://grave-app-api.kacper-kubit99.workers.dev>. Dozwolony adres frontu
ustawia `ALLOWED_ORIGINS` w `wrangler.jsonc`.
