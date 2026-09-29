# Docker — uruchomienie na jeden klik

## Codzienne użycie

| Co chcesz zrobić     | Polecenie                                              |
| -------------------- | ------------------------------------------------------ |
| Odpalić aplikację    | `docker compose up -d` → **http://localhost:8082**      |
| Zatrzymać            | `docker compose down`                                   |
| Po zmianie w Angular | `docker compose build web && docker compose up -d web`  |
| Po zmianie w NestJS  | `docker compose build api && docker compose up -d api`  |
| Logi backendu        | `docker compose logs -f api`                            |

**W VS Code:** prawy przycisk na `compose.yaml` → **Compose Up**.

Swagger API: http://localhost:3000/api/docs

## ⚠️ Do uzupełnienia: klucz Supabase

Backend startuje i odpowiada na `/api/v1/health`, ale **jego endpointy danych
zwracają 500**, bo `backend/.env` ma pusty `SUPABASE_SERVICE_KEY`. Widać to w logach:

```
WARN  [SupabaseService] Supabase credentials not configured. Database operations will fail.
ERROR Supabase client not initialized. Check your environment configuration.
```

To stan zastany, nie skutek konteneryzacji — kontener wiernie przenosi to, co
jest w pliku. Żeby naprawić: skopiuj `service_role` z panelu Supabase
(Project Settings → API) do `backend/.env` i zrób `docker compose up -d api`.

Sama mapa na froncie działa mimo to, bo rozmawia z Supabase bezpośrednio
kluczem publicznym zaszytym w `src/environments/environment.ts`.

## Architektura

```
        przeglądarka
             │  http://localhost:8082
             ▼
    ┌──────────────────┐
    │  web  (nginx)    │   statyki Angulara 21 (PWA) + reverse proxy
    └────────┬─────────┘
             │  /api/*  →  http://api:3000
             ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │  api  (NestJS)   │ ───────► │  Supabase (chmura)   │
    │  user: node      │          │  *.supabase.co       │
    └──────────────────┘          └──────────────────────┘
```

Nie ma tu serwisu bazy danych i to jest celowe — „baza" jest zewnętrzna.

## Trzy rzeczy specyficzne dla tej aplikacji

**1. Sekrety nie wchodzą do obrazu.**
`backend/.env` trafia do kontenera przez `env_file` w `compose.yaml`, nigdy przez
`COPY`. Różnica jest zasadnicza: warstwy obrazu są niezmienne i czytelne dla
każdego, kto ma do obrazu dostęp — `docker history` albo rozpakowanie warstwy
wyciągną klucz nawet wtedy, gdy w kolejnej warstwie zrobisz `rm`. Zmienne
środowiskowe żyją tylko w uruchomionym kontenerze. Dlatego `.env` jest pierwszą
pozycją w `backend/.dockerignore`.

Zweryfikowane: w obrazie nie ma `/app/.env`, a `Config.Env` obrazu nie zawiera
żadnego klucza Supabase.

**2. Backend Node potrzebuje `node_modules` w runtime — ale tylko produkcyjnych.**
To odwrotnie niż przy Angularze, gdzie po kompilacji zostają same statyki.
Dlatego etap runtime nie kopiuje `node_modules` z etapu build (byłyby razem
z devDependencies), tylko instaluje je od nowa przez `npm ci --omit=dev`.
Kontener działa jako nieuprzywilejowany użytkownik `node`, nie jako root.

**3. PWA wymaga od nginxa ostrożności z cache.**
Service worker aktualizuje się tak, że pobiera `ngsw.json` i porównuje hashe.
Gdyby przeglądarka podała mu ten plik z cache, worker uznałby że nic się nie
zmieniło — i użytkownik zostałby na starej wersji aplikacji **na zawsze**, nawet
po wdrożeniu nowej. Dlatego `nginx.conf` wymusza `no-store` na `ngsw.json`,
`ngsw-worker.js` i `index.html`, a agresywny roczny cache daje tylko plikom
z hashem w nazwie (`main-D6VF3GXM.js`), którym nic nie grozi.

Zweryfikowane nagłówkami z działającego kontenera.

## Dług techniczny, o którym trzeba wiedzieć

`frontend/grave-app-front/Dockerfile` używa `npm ci --legacy-peer-deps`.
Powód: `@asymmetrik/ngx-leaflet@17.0.0` ma `peerDependencies` twardo przypięte
do Angulara 17, a aplikacja stoi na 21. Bez flagi build nie przechodzi w ogóle.
To obejście, nie rozwiązanie — docelowo bibliotekę trzeba podmienić albo owinąć
samego Leafleta cienkim własnym serwisem.

Przy okazji: `package-lock.json` przestał być ignorowany przez gita.
Ignorowanie go doprowadziło do rozjazdu 11 pakietów z `package.json`
(`reflect-metadata` stał na 0.1.14 przy wymaganym `^0.2.2`), przez co `npm ci`
odmawiał instalacji. Dla aplikacji lock jest częścią kodu i ma być commitowany.
