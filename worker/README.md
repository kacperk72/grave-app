# grave-app-api — rodzinna mapa

Cloudflare Worker + baza D1. Przechowuje wspólne groby rodziny; aplikacja
(frontend/grave-app-front) trzyma kopię w IndexedDB i synchronizuje ją z tym API.

## Jak to działa

- **Źródło prawdy:** baza D1 `grave-app`. Telefon ma kopię roboczą (offline) i kolejkę
  własnych zmian (`outbox` w IndexedDB).
- **Dostęp:** rodzinny link `/rodzina#<klucz>`. Klucz jest po `#`, więc nie trafia do
  serwera strony; w D1 zapisany jest tylko jego SHA-256. „Zmień link" unieważnia stary.
- **Synchronizacja:** telefon wysyła kolejkę (`POST /changes`), potem pobiera zmiany po
  ostatnim znanym numerze (`GET /changes?since=N`). Każdy zapis dostaje kolejny `rev`
  mapy. Usunięcia zostają jako nagrobki (`deleted = 1`), żeby dotarły do innych.
- **Konflikty:** wygrywa zapis, który później dotarł na serwer (cały grób naraz).

| Metoda | Ścieżka | Opis |
| --- | --- | --- |
| POST | `/spaces` | nowa mapa → `{ token }` |
| GET | `/space` | podgląd: liczba grobów |
| GET | `/changes?since=N` | zmiany po `rev` N (strony po 500) |
| POST | `/changes` | do 100 zmian naraz, w jednej transakcji |
| POST | `/space/rotate` | nowy link, stary przestaje działać |
| PUT | `/photos/:id?variant=full\|thumb` | bajty zdjęcia (JPEG/WebP, do 5 MB) |
| GET | `/photos/:id?variant=full\|thumb` | pobranie zdjęcia |
| DELETE | `/photos/:id` | usunięcie obu wariantów |

**Zdjęcia** leżą w kuble R2 `grave-app-photos` pod kluczem `<id mapy>/<id zdjęcia>/<wariant>`.
Opis zdjęcia (id, które jest główne) jedzie w danych grobu przez `/changes`. Telefon
zmniejsza zdjęcie przed wysłaniem (1600 px + miniatura 480 px) i trzyma bajty w IndexedDB,
więc zdjęcia są widoczne bez zasięgu. Kubeł zakłada się raz:
`npx wrangler r2 bucket create grave-app-photos` (R2 musi być włączone na koncie).

## Lokalnie

```bash
npm install
npm run db:migrate:local
npm run dev            # http://localhost:8791, CORS dla localhost:4260 i 4200
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
