# Rodzinne mapy: członkowie i wiele map — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lista członków rodzinnej mapy (imię + awatar, osobny klucz na telefon, usuwanie przez założyciela) i wiele map w jednym telefonie z przełącznikiem.

**Architecture:** Worker dostaje tabelę `members` i uwierzytelnia kluczem członka; klucz z linku staje się zaproszeniem (przejściowo nadal działa jak dawniej, żeby stare wersje aplikacji nie padły). Telefon dostaje tabelę `spaces` w IndexedDB, a groby i kolejki — pole `spaceId`; `SpaceService` trzyma aktywną mapę, `FamilySyncService` synchronizuje każdą mapę jej kluczem. Dwa PR-y: najpierw Worker (zgodny wstecz), potem front.

**Tech Stack:** Cloudflare Worker + D1 + Workers KV (TypeScript, wrangler 4), Angular 21 zoneless (signals, standalone, OnPush), Dexie 4, Vitest (`@angular/build:unit-test`).

**Spec:** `frontend/grave-app-front/docs/superpowers/specs/2026-10-01-family-members-multi-map-design.md`

## Global Constraints

- **Push na `main` = wydanie produkcyjne** (front i Worker). Praca na gałęziach, PR; nigdy nie pushuj na `main`, nie merguj PR bez zgody użytkownika.
- **Nigdy nie testuj na produkcyjnej rodzinnej mapie.** E2E tylko na lokalnym Workerze (`npm run dev` w `worker/`, port 8791) i w izolowanych kontekstach przeglądarki. Testu dymnego (`npm run smoke`) nie uruchamiaj na produkcji.
- **Bez danych testowych w aplikacji** (żadnych generatorów, przykładowych grobów — także „tylko w dev"). Groby do testów wstrzykuj do IndexedDB (`GraveMapDB`) albo dodawaj formularzem w izolowanym kontekście.
- **Tylko darmowy plan Cloudflare**, nic, co wymaga karty (zdjęcia w KV, nie R2; Cron Trigger jest darmowy).
- Każdy zapis grobu przez `IndexedDbService` (tam są kolejki synchronizacji).
- Front: `npm ci --legacy-peer-deps` (przez `@asymmetrik/ngx-leaflet` 17). Mapy Leaflet i markerów nie ruszamy.
- Angular: standalone, `inject()`, `input()`/`output()`, signals + `computed()`, `@if/@for`, `ChangeDetectionStrategy.OnPush`, host bindings w `host`.
- Prettier: 100 znaków, pojedyncze cudzysłowy. Komentarze i teksty UI po polsku, gęstość komentarzy jak w otoczeniu.
- Imię członka i nazwa mapy: po przycięciu i zwinięciu spacji **1–40 znaków** (liczonych jako znaki Unicode, nie jednostki UTF-16).
- Kolory awatara: dokładnie `sage`, `clay`, `sky`, `plum`, `sand`, `slate`, `rose`, `moss`.
- Limit **50 członków** na mapę; bezpiecznik usunięć z KV **900 na dobę** (UTC).
- Teksty neutralne płciowo tam, gdzie nie znamy osoby: „zmienił(a)", „online 5 min temu".
- `ng serve` ≠ build produkcyjny: przed PR frontu sprawdź build prod (`grave-app-dist`, port 4270).

## Review Focus

1. **Grób przeniesiony między mapami a spóźniona zmiana z serwera** — pobranie „usuń g1" z mapy A, gdy g1 jest już lokalnie w mapie B, nie może skasować grobu z B (test `decideRemoteChange` w Task B2).
2. **Przeniesienie grobu z rodzinnej mapy, gdy telefon nie ma bajtów zdjęć** — przeniesienie musi najpierw je pobrać albo odmówić; inaczej zdjęcia giną (Task B8, `ensurePhotoBytes`; scenariusz E2E w B9).
3. **Stara wersja aplikacji po wdrożeniu Workera** (PWA trzyma cache) — `POST /spaces` bez treści, klucz z linku jako Bearer i `POST /space/rotate` na mapie bez założyciela muszą działać jak dawniej (sekcje `legacy*` testu dymnego, Task A1–A3).
4. **Imię z emoji, nadmiarem spacji albo 41 znaków** — serwer przycina i odrzuca za długie (400), inicjały nie rozcinają emoji (testy `initials` w B1, sekcja `members` w A2).
5. **Założyciel próbuje usunąć siebie, wyjść bez przekazania roli albo przekazać rolę usuniętej osobie** — 400/409/404 zamiast mapy bez założyciela (sekcja `management` w A3).

---

## Część A — Worker (PR 1, gałąź `feature/rodzina-czlonkowie`)

Pracuj w `grave-app/worker`. Przed pierwszym testem: `npm install` (jeśli brak `node_modules`) i `npm run db:migrate:local`. Workera uruchamiaj przez `preview_start` z nazwą `grave-app-api` (port 8791) — nie przez Bash.

### Task A1: Podział Workera na moduły + test dymny starego zachowania

**Files:**
- Create: `worker/src/http.ts`, `worker/src/util.ts`, `worker/scripts/smoke.mjs`
- Modify: `worker/src/index.ts`, `worker/package.json`

**Interfaces:**
- Produces: `http.ts` — `class HttpError(status, message, code?)`, `json(body, status?, headers?)`, `readJson(request)`, `corsHeaders(request, allowedOrigins: string)`, `MAX_BODY_BYTES`; `util.ts` — `newToken()`, `sha256(text)`, `currentDay()`; `scripts/smoke.mjs` z helperami `call`, `check`, `grave`, `sql` i sekcją `legacy()`.

- [ ] **Step 1: Napisz test dymny starego zachowania**

`worker/scripts/smoke.mjs`:

```js
// Test dymny API rodzinnej mapy na LOKALNYM Workerze.
// Uruchom `npm run dev` (port 8791), potem `npm run smoke`. Nigdy na produkcji.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API = process.env.API ?? 'http://localhost:8791';
const workerDir = fileURLToPath(new URL('..', import.meta.url));
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(name, ok, detail) {
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name}`, JSON.stringify(detail ?? null));
  }
}

function grave(id) {
  return {
    id,
    latitude: 50,
    longitude: 20,
    cemeteryName: 'Cmentarz testowy',
    currency: 'PLN',
    deceasedPersons: [],
    photos: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

/** Jedna liczba z lokalnej bazy D1 (zapytanie musi zwracać kolumnę `n`). */
function sql(query) {
  const out = execSync(`npx wrangler d1 execute grave-app --local --json --command "${query}"`, {
    cwd: workerDir,
    encoding: 'utf8',
  });
  return JSON.parse(out)[0].results[0].n;
}

/** Stara wersja aplikacji: mapa bez członków, klucz z linku jako Bearer. */
async function legacy() {
  const created = await call('POST', '/spaces');
  check('stara aplikacja: POST /spaces bez treści daje klucz', created.status === 201 && typeof created.data?.token === 'string', created);
  const token = created.data.token;

  const pushed = await call('POST', '/changes', {
    token,
    body: { changes: [{ id: 'g-legacy', deleted: false, data: grave('g-legacy') }] },
  });
  check('stara aplikacja: zapis grobu', pushed.status === 200 && pushed.data.rev === 1, pushed);

  const pulled = await call('GET', '/changes?since=0', { token });
  check('stara aplikacja: odczyt grobu', pulled.status === 200 && pulled.data.changes.length === 1 && pulled.data.changes[0].id === 'g-legacy', pulled);

  const space = await call('GET', '/space', { token });
  check('stara aplikacja: podgląd mapy', space.status === 200 && space.data.graves === 1, space);

  const bad = await call('GET', '/changes?since=0', { token: 'x'.repeat(43) });
  check('zły klucz: 401', bad.status === 401, bad);
  return token;
}

const legacyToken = await legacy();
void legacyToken; void sql; // używane w kolejnych sekcjach

console.log(failed ? `\n${failed} FAIL` : '\nwszystko ok');
process.exit(failed ? 1 : 0);
```

W `worker/package.json` dodaj do `scripts`: `"smoke": "node scripts/smoke.mjs"`.

- [ ] **Step 2: Uruchom test na obecnym kodzie (punkt odniesienia)**

`npm run db:migrate:local`, potem `preview_start` z nazwą `grave-app-api`, potem `npm run smoke` w `worker/`.
Expected: wszystkie linie `ok`, na końcu `wszystko ok`. To potwierdza, że test opisuje obecne zachowanie.

- [ ] **Step 3: Wydziel `http.ts` i `util.ts`**

`worker/src/http.ts` — przenieś z `index.ts` bez zmian w zachowaniu, `HttpError` dostaje opcjonalny `code`:

```ts
/** Wspólne narzędzia HTTP Workera: odpowiedzi JSON, błędy, CORS, czytanie treści. */

export const MAX_BODY_BYTES = 2 * 1024 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Kod dla aplikacji, gdy sam status nie wystarcza (np. `member_removed`). */
    readonly code?: string
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function corsHeaders(request: Request, allowedOrigins: string): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = allowedOrigins.split(',').map((o) => o.trim());
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY_BYTES) throw new HttpError(413, 'Za duże zapytanie');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Za duże zapytanie');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Nieprawidłowy JSON');
  }
}
```

`worker/src/util.ts`:

```ts
/** 32 losowe bajty jako base64url — nie do zgadnięcia, krótkie w linku. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Bieżąca doba (UTC) jako RRRR-MM-DD — klucz liczników w `usage_daily`. */
export function currentDay(): string {
  return new Date().toISOString().slice(0, 10);
}
```

W `index.ts` usuń przeniesione definicje (`MAX_BODY_BYTES`, `HttpError`, `json`, `corsHeaders`, `readJson`, `newToken`, `sha256`, `currentDay`) i dodaj:

```ts
import { HttpError, corsHeaders, json, readJson } from './http';
import { currentDay, newToken, sha256 } from './util';
```

W `fetch` zmień `corsHeaders(request, env)` na `corsHeaders(request, env.ALLOWED_ORIGINS)`, a obsługę `HttpError` na:

```ts
      if (err instanceof HttpError) {
        return json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, err.status, cors);
      }
```

- [ ] **Step 4: Sprawdź typy i test dymny**

Run: `npm run typecheck` (w `worker/`) → bez błędów. Wrangler dev przeładuje się sam; `npm run smoke` → `wszystko ok`.

- [ ] **Step 5: Commit**

```bash
git add worker/src worker/scripts worker/package.json
git commit -m "refactor(api): moduły http/util i test dymny starego zachowania"
```

### Task A2: Migracja 0003, uwierzytelnianie członków, zakładanie mapy i dołączanie

**Files:**
- Create: `worker/migrations/0003_members.sql`, `worker/src/auth.ts`, `worker/src/members.ts`
- Modify: `worker/src/index.ts`, `worker/src/http.ts`, `worker/wrangler.jsonc`, `worker/scripts/smoke.mjs`

**Interfaces:**
- Consumes: `HttpError`, `json`, `readJson`, `newToken`, `sha256` (A1).
- Produces: `auth.ts` — `interface Space { id; rev; name }`, `interface Member { id; spaceId; name; color; role: 'owner' | 'member' }`, `interface Session { space: Space; member: Member | null }`, `authenticate(request, env): Promise<Session>`, `spaceFromInvite(request, env): Promise<Space>`, `requireMember(session): Member`, `requireOwner(session): Member`; `members.ts` — `AVATAR_COLORS`, `parseName(value, label)`, `parseColor(value)`, `createSpace(request, env)`, `invitePreview(env, space)`, `joinSpace(request, env, space)`, `spaceInfo(env, session)`; `http.ts` — `readOptionalJson(request)`.
- Kontrakt HTTP (używany przez front w B4): `POST /spaces {name, member:{name,color}}` → 201 `{spaceId, name, invite, memberToken, memberId, role}`; bez treści → 201 `{token, rev:0}`; `GET /invite` → `{spaceId, name, graves, members:[{name,color}]}`; `POST /join {name,color}` → 201 `{spaceId, name, memberToken, memberId, role}`; `GET /space` → `{spaceId, name, graves, rev, me: {id, role} | null}`; `GET /changes` → każda zmiana ma `updatedBy: string | null`; błąd usuniętego członka → 401 `{error, code:'member_removed'}`.

- [ ] **Step 1: Dopisz sekcje testu dymnego (nowe zachowanie)**

W `smoke.mjs` przed linią `const legacyToken = await legacy();` dodaj funkcje:

```js
/** Nowa mapa z założycielem, podgląd zaproszenia, dołączanie, kto zapisał grób. */
async function members() {
  const created = await call('POST', '/spaces', {
    body: { name: '  Rodzina   Testowa ', member: { name: 'Kacper', color: 'sage' } },
  });
  check(
    'nowa mapa z założycielem',
    created.status === 201 && created.data.role === 'owner' && created.data.name === 'Rodzina Testowa' &&
      typeof created.data.invite === 'string' && typeof created.data.memberToken === 'string',
    created
  );
  const { invite, memberToken: owner, memberId: ownerId, spaceId } = created.data;

  const preview = await call('GET', '/invite', { token: invite });
  check(
    'podgląd zaproszenia',
    preview.status === 200 && preview.data.name === 'Rodzina Testowa' && preview.data.members.length === 1 &&
      preview.data.members[0].name === 'Kacper' && preview.data.graves === 0,
    preview
  );

  const tooLong = await call('POST', '/join', { token: invite, body: { name: 'x'.repeat(41), color: 'sky' } });
  check('imię dłuższe niż 40 znaków: 400', tooLong.status === 400, tooLong);
  const badColor = await call('POST', '/join', { token: invite, body: { name: 'Ania', color: 'red' } });
  check('nieznany kolor: 400', badColor.status === 400, badColor);
  const viaMember = await call('POST', '/join', { token: owner, body: { name: 'Ania', color: 'rose' } });
  check('dołączenie kluczem członka zamiast linku: 401', viaMember.status === 401, viaMember);

  const joined = await call('POST', '/join', { token: invite, body: { name: '  Ania 🌷 ', color: 'rose' } });
  check(
    'dołączenie jako członek',
    joined.status === 201 && joined.data.role === 'member' && joined.data.spaceId === spaceId,
    joined
  );
  const ania = joined.data.memberToken;

  await call('POST', '/changes', { token: ania, body: { changes: [{ id: 'g1', deleted: false, data: grave('g1') }] } });
  const pulled = await call('GET', '/changes?since=0', { token: owner });
  check('updatedBy = id członka', pulled.data?.changes?.[0]?.updatedBy === joined.data.memberId, pulled);

  const space = await call('GET', '/space', { token: ania });
  check(
    'GET /space: nazwa, ja i rola',
    space.status === 200 && space.data.name === 'Rodzina Testowa' && space.data.me?.role === 'member' && space.data.graves === 1,
    space
  );
  return { invite, owner, ownerId, ania, aniaId: joined.data.memberId, spaceId };
}

/** Mapa sprzed migracji: pierwszy podpisany zostaje założycielem. */
async function legacyOwner(token) {
  const first = await call('POST', '/join', { token, body: { name: 'Pierwszy', color: 'moss' } });
  check('stara mapa: pierwszy dołączający zostaje założycielem', first.data?.role === 'owner', first);
  const second = await call('POST', '/join', { token, body: { name: 'Drugi', color: 'sky' } });
  check('stara mapa: drugi to zwykły członek', second.data?.role === 'member', second);
  const pulled = await call('GET', '/changes?since=0', { token: second.data.memberToken });
  check(
    'stara mapa: dawne groby widoczne, updatedBy = null',
    pulled.data?.changes?.some((c) => c.id === 'g-legacy' && c.updatedBy === null),
    pulled
  );
  const stillLegacy = await call('GET', '/changes?since=0', { token });
  check('stara mapa: klucz z linku nadal działa (przejściowo)', stillLegacy.status === 200, stillLegacy);
}
```

Zamień końcówkę skryptu na:

```js
const legacyToken = await legacy();
const session = await members();
await legacyOwner(legacyToken);
void session; void sql; // używane w kolejnych sekcjach
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npm run smoke` → FAIL m.in. „nowa mapa z założycielem" (obecny Worker ignoruje treść `POST /spaces`).

- [ ] **Step 3: Migracja `0003_members.sql`**

```sql
-- Członkowie rodzinnych map: każdy telefon ma własny klucz, imię i kolor awatara.
-- Klucz z linku (`spaces.token_hash`) od teraz jest ZAPROSZENIEM — daje prawo
-- do dołączenia; przejściowo (ALLOW_INVITE_AS_MEMBER) także do synchronizacji,
-- żeby stare wersje aplikacji działały do aktualizacji.
ALTER TABLE spaces ADD COLUMN name TEXT NOT NULL DEFAULT 'Rodzinna mapa';

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 klucza członka; sam klucz zna tylko jego telefon
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  removed_at INTEGER -- usunięty przez założyciela albo sam wyszedł
);

CREATE INDEX members_space ON members (space_id);
-- Najwyżej jeden aktywny założyciel na mapę (chroni przed wyścigiem dwóch pierwszych dołączeń)
CREATE UNIQUE INDEX members_one_owner ON members (space_id) WHERE role = 'owner' AND removed_at IS NULL;

-- Kto ostatnio zapisał grób (id członka); NULL dla zapisów sprzed migracji i starych aplikacji
ALTER TABLE graves ADD COLUMN updated_by TEXT;

-- Bajty zdjęć skasowanej mapy czekające na usunięcie z KV (darmowe KV: 1000 usunięć/dobę)
CREATE TABLE photo_purge (
  key TEXT PRIMARY KEY,
  queued_at INTEGER NOT NULL
);

ALTER TABLE usage_daily ADD COLUMN photo_deletes INTEGER NOT NULL DEFAULT 0;
```

Run: `npm run db:migrate:local` → „0003_members.sql ✅".

- [ ] **Step 4: Zmienna przejściowa w `wrangler.jsonc`**

W `vars` dodaj (z komentarzem nad):

```jsonc
    // Klucz z linku zaproszenia działa też jako klucz członka — dla wersji aplikacji
    // sprzed list członków. Wyłączyć ("false"), gdy wszyscy mają wpis w `members`.
    "ALLOW_INVITE_AS_MEMBER": "true"
```

W `index.ts` w `interface Env` dodaj `ALLOW_INVITE_AS_MEMBER?: string;` z komentarzem `/** "false" wyłącza dostęp przejściowy kluczem zaproszenia. */`.

- [ ] **Step 5: `readOptionalJson` w `http.ts`**

```ts
/** Jak `readJson`, ale puste ciało daje `null` (stara aplikacja wysyła `POST /spaces` bez treści). */
export async function readOptionalJson(request: Request): Promise<unknown | null> {
  const text = await request.clone().text();
  if (text.trim() === '') return null;
  return readJson(request);
}
```

- [ ] **Step 6: `worker/src/auth.ts`**

```ts
import type { Env } from './index';
import { HttpError } from './http';
import { sha256 } from './util';

export interface Space {
  id: string;
  rev: number;
  name: string;
}

export interface Member {
  id: string;
  spaceId: string;
  name: string;
  color: string;
  role: 'owner' | 'member';
}

/** Kto pyta: członek mapy albo — przejściowo — posiadacz linku zaproszenia (stara aplikacja). */
export interface Session {
  space: Space;
  member: Member | null;
}

/** `last_seen_at` zapisujemy najwyżej raz na minutę, żeby nie pisać do D1 przy każdym zapytaniu. */
const SEEN_THROTTLE_MS = 60_000;

function bearer(request: Request): string {
  const header = request.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function authenticate(request: Request, env: Env): Promise<Session> {
  const token = bearer(request);
  if (!token) throw new HttpError(401, 'Brak klucza rodzinnej mapy');
  const hash = await sha256(token);

  const row = await env.DB.prepare(
    `SELECT m.id, m.space_id, m.name, m.color, m.role, m.removed_at, s.rev, s.name AS space_name
       FROM members m JOIN spaces s ON s.id = m.space_id
      WHERE m.token_hash = ?`
  )
    .bind(hash)
    .first<{
      id: string;
      space_id: string;
      name: string;
      color: string;
      role: 'owner' | 'member';
      removed_at: number | null;
      rev: number;
      space_name: string;
    }>();

  if (row) {
    // Kto miał ważny klucz, może się dowiedzieć, że go usunięto — telefon pokaże to wprost
    if (row.removed_at !== null) {
      throw new HttpError(401, 'Nie masz już dostępu do tej mapy', 'member_removed');
    }
    await touch(env, row.space_id, row.id);
    return {
      space: { id: row.space_id, rev: row.rev, name: row.space_name },
      member: { id: row.id, spaceId: row.space_id, name: row.name, color: row.color, role: row.role },
    };
  }

  if (env.ALLOW_INVITE_AS_MEMBER !== 'false') {
    const space = await findSpaceByInvite(env, hash);
    if (space) {
      await touch(env, space.id, null);
      return { space, member: null };
    }
  }
  // Ten sam komunikat dla złego i unieważnionego klucza — nie zdradzamy, które to
  throw new HttpError(401, 'Link do rodzinnej mapy jest nieaktualny');
}

/** Mapa z klucza w linku zaproszenia — do podglądu i dołączenia. */
export async function spaceFromInvite(request: Request, env: Env): Promise<Space> {
  const token = bearer(request);
  const space = token ? await findSpaceByInvite(env, await sha256(token)) : null;
  if (!space) throw new HttpError(401, 'Link do rodzinnej mapy jest nieaktualny');
  return space;
}

export function requireMember(session: Session): Member {
  if (!session.member) {
    throw new HttpError(403, 'Najpierw podpisz się na tej mapie — zaktualizuj aplikację');
  }
  return session.member;
}

export function requireOwner(session: Session): Member {
  const member = requireMember(session);
  if (member.role !== 'owner') throw new HttpError(403, 'Tylko założyciel mapy może to zrobić');
  return member;
}

function findSpaceByInvite(env: Env, hash: string): Promise<Space | null> {
  return env.DB.prepare('SELECT id, rev, name FROM spaces WHERE token_hash = ?').bind(hash).first<Space>();
}

async function touch(env: Env, spaceId: string, memberId: string | null): Promise<void> {
  const now = Date.now();
  const before = now - SEEN_THROTTLE_MS;
  const statements = [
    env.DB.prepare(
      'UPDATE spaces SET last_seen_at = ?1 WHERE id = ?2 AND (last_seen_at IS NULL OR last_seen_at < ?3)'
    ).bind(now, spaceId, before),
  ];
  if (memberId) {
    statements.push(
      env.DB.prepare(
        'UPDATE members SET last_seen_at = ?1 WHERE id = ?2 AND (last_seen_at IS NULL OR last_seen_at < ?3)'
      ).bind(now, memberId, before)
    );
  }
  await env.DB.batch(statements);
}
```

- [ ] **Step 7: `worker/src/members.ts` (zakładanie, podgląd, dołączanie, `GET /space`)**

```ts
import type { Env } from './index';
import type { Session, Space } from './auth';
import { HttpError, json, readJson, readOptionalJson } from './http';
import { newToken, sha256 } from './util';

/** Paleta awatarów — ta sama lista co w aplikacji (`shared/utils/member-display.ts`). */
export const AVATAR_COLORS = ['sage', 'clay', 'sky', 'plum', 'sand', 'slate', 'rose', 'moss'];
const MAX_NAME_CHARS = 40;
const MAX_MEMBERS_PER_SPACE = 50;
const DEFAULT_SPACE_NAME = 'Rodzinna mapa';

/** Imię albo nazwa mapy: zwinięte spacje, 1–40 znaków Unicode (emoji = 1 znak). */
export function parseName(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label}: brak wartości`);
  const name = value.replace(/\s+/g, ' ').trim();
  const chars = [...name].length;
  if (chars === 0 || chars > MAX_NAME_CHARS) {
    throw new HttpError(400, `${label}: od 1 do ${MAX_NAME_CHARS} znaków`);
  }
  return name;
}

export function parseColor(value: unknown): string {
  if (typeof value !== 'string' || !AVATAR_COLORS.includes(value)) {
    throw new HttpError(400, 'Nieznany kolor awatara');
  }
  return value;
}

interface NewMember {
  id: string;
  spaceId: string;
  tokenHash: string;
  name: string;
  color: string;
  role: 'owner' | 'member';
}

function insertMember(env: Env, m: NewMember): D1PreparedStatement {
  const now = Date.now();
  return env.DB.prepare(
    `INSERT INTO members (id, space_id, token_hash, name, color, role, joined_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(m.id, m.spaceId, m.tokenHash, m.name, m.color, m.role, now, now);
}

export async function createSpace(request: Request, env: Env): Promise<Response> {
  const body = (await readOptionalJson(request)) as {
    name?: unknown;
    member?: { name?: unknown; color?: unknown };
  } | null;
  const invite = newToken();
  const spaceId = crypto.randomUUID();
  const now = Date.now();
  const insertSpace = async (name: string) =>
    env.DB.prepare(
      'INSERT INTO spaces (id, token_hash, rev, created_at, last_seen_at, name) VALUES (?, ?, 0, ?, ?, ?)'
    ).bind(spaceId, await sha256(invite), now, now, name);

  if (body === null) {
    // Stara wersja aplikacji: mapa bez założyciela — zostanie nim pierwszy, kto się podpisze
    await (await insertSpace(DEFAULT_SPACE_NAME)).run();
    return json({ token: invite, rev: 0 }, 201);
  }

  const name = parseName(body.name ?? DEFAULT_SPACE_NAME, 'Nazwa mapy');
  const memberName = parseName(body.member?.name, 'Imię');
  const color = parseColor(body.member?.color);
  const memberToken = newToken();
  const memberId = crypto.randomUUID();
  await env.DB.batch([
    await insertSpace(name),
    insertMember(env, {
      id: memberId,
      spaceId,
      tokenHash: await sha256(memberToken),
      name: memberName,
      color,
      role: 'owner',
    }),
  ]);
  return json({ spaceId, name, invite, memberToken, memberId, role: 'owner' }, 201);
}

/** Podgląd przed dołączeniem: nazwa, liczba grobów i kto już jest. */
export async function invitePreview(env: Env, space: Space): Promise<Response> {
  const [graves, members] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare('SELECT COUNT(*) AS count FROM graves WHERE space_id = ? AND deleted = 0').bind(space.id),
    env.DB.prepare(
      'SELECT name, color FROM members WHERE space_id = ? AND removed_at IS NULL ORDER BY joined_at'
    ).bind(space.id),
  ]);
  return json({
    spaceId: space.id,
    name: space.name,
    graves: (graves.results[0] as { count: number }).count,
    members: members.results,
  });
}

export async function joinSpace(request: Request, env: Env, space: Space): Promise<Response> {
  const body = (await readJson(request)) as { name?: unknown; color?: unknown } | null;
  const name = parseName(body?.name, 'Imię');
  const color = parseColor(body?.color);

  const counts = await env.DB.prepare(
    `SELECT COUNT(*) AS active, COALESCE(SUM(role = 'owner'), 0) AS owners
       FROM members WHERE space_id = ? AND removed_at IS NULL`
  )
    .bind(space.id)
    .first<{ active: number; owners: number }>();
  if ((counts?.active ?? 0) >= MAX_MEMBERS_PER_SPACE) {
    throw new HttpError(413, 'Na tej mapie jest już komplet osób');
  }

  const memberToken = newToken();
  const member: NewMember = {
    id: crypto.randomUUID(),
    spaceId: space.id,
    tokenHash: await sha256(memberToken),
    name,
    color,
    // Mapa sprzed list członków nie ma założyciela — zostaje nim pierwszy podpisany
    role: (counts?.owners ?? 0) > 0 ? 'member' : 'owner',
  };
  try {
    await insertMember(env, member).run();
  } catch (err) {
    // Dwa pierwsze dołączenia naraz: indeks members_one_owner wpuści tylko jednego założyciela
    if (member.role !== 'owner' || !String(err).includes('UNIQUE')) throw err;
    member.role = 'member';
    await insertMember(env, member).run();
  }
  return json({ spaceId: space.id, name: space.name, memberToken, memberId: member.id, role: member.role }, 201);
}

export async function spaceInfo(env: Env, session: Session): Promise<Response> {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM graves WHERE space_id = ? AND deleted = 0'
  )
    .bind(session.space.id)
    .first<{ count: number }>();
  return json({
    spaceId: session.space.id,
    name: session.space.name,
    graves: row?.count ?? 0,
    rev: session.space.rev,
    me: session.member ? { id: session.member.id, role: session.member.role } : null,
  });
}
```

- [ ] **Step 8: Podłącz w `index.ts`**

Usuń z `index.ts` lokalne `interface Space`, `createSpace` i `authenticate`. Dodaj importy:

```ts
import { Session, Space, authenticate, spaceFromInvite } from './auth';
import { createSpace, invitePreview, joinSpace, spaceInfo } from './members';
```

Zastąp początek `route()` (do linii `if (request.method === 'GET' && path === '/changes')`) tym:

```ts
async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' && path === '/') {
    return json({ ok: true, service: 'grave-app-api' });
  }
  if (request.method === 'POST' && path === '/spaces') {
    return createSpace(request, env);
  }
  // Link zaproszenia: podgląd i dołączenie (bez klucza członka)
  if (request.method === 'GET' && path === '/invite') {
    return invitePreview(env, await spaceFromInvite(request, env));
  }
  if (request.method === 'POST' && path === '/join') {
    return joinSpace(request, env, await spaceFromInvite(request, env));
  }

  const session = await authenticate(request, env);
  const space = session.space;

  if (request.method === 'GET' && path === '/space') {
    return spaceInfo(env, session);
  }
```

Pozostałe gałęzie (`/changes`, `/photos`, `/space/rotate`) zostają; `pushChanges(request, env, space)` zmień na `pushChanges(request, env, session)`. Rotację w tym tasku zostaw bez zmian (A3 ją przepisze).

- [ ] **Step 9: `updated_by` w zapisie i odczycie zmian**

W `pushChanges` zmień sygnaturę na `(request: Request, env: Env, session: Session)`, na początku `const space = session.space;`, a INSERT na:

```ts
      env.DB.prepare(
        `INSERT INTO graves (space_id, id, data, deleted, rev, updated_at, updated_by)
         VALUES (?1, ?2, ?3, ?4, (SELECT rev FROM spaces WHERE id = ?1), ?5, ?6)
         ON CONFLICT (space_id, id) DO UPDATE SET
           data = excluded.data,
           deleted = excluded.deleted,
           rev = excluded.rev,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`
      ).bind(
        space.id,
        change.id,
        change.deleted ? null : JSON.stringify(change.data),
        change.deleted ? 1 : 0,
        now,
        session.member?.id ?? null
      )
```

W `pullChanges` dodaj `updated_by` do SELECT (`SELECT id, data, deleted, rev, updated_by FROM graves ...`), do typu wiersza `updated_by: string | null`, a w mapowaniu `updatedBy: r.updated_by,`.

- [ ] **Step 10: Typy i test dymny**

Run: `npm run typecheck` → bez błędów. `npm run smoke` → `wszystko ok` (sekcje `legacy`, `members`, `legacyOwner`).

- [ ] **Step 11: Commit**

```bash
git add worker
git commit -m "feat(api): członkowie rodzinnej mapy — migracja 0003, zaproszenia i dołączanie"
```

### Task A3: Zarządzanie członkami i mapą

**Files:**
- Modify: `worker/src/members.ts`, `worker/src/index.ts`, `worker/src/http.ts`, `worker/scripts/smoke.mjs`

**Interfaces:**
- Consumes: `Session`, `requireMember`, `requireOwner` (A2), `parseName`, `parseColor` (A2).
- Produces (kontrakt HTTP dla B4): `GET /members` → `{members:[{id,name,color,role,joinedAt,lastSeenAt}]}` (założyciel pierwszy); `PATCH /me {name?,color?}` → `{name,color}`; `POST /space/leave` → `{ok}` (409 dla założyciela); `PATCH /space {name}` → `{name}` (403 dla nie-założyciela); `POST /space/rotate` → `{invite, token}` (`token` = to samo, dla starej aplikacji); `DELETE /members/:id` → `{ok}` (400 siebie, 404 brak); `POST /members/:id/owner` → `{ok}`; `DELETE /space` → `{ok}` (409 gdy są inni).

- [ ] **Step 1: Dopisz sekcje testu dymnego**

```js
/** Uprawnienia założyciela, rotacja linku, usuwanie i przekazanie roli, usunięcie mapy. */
async function management(s) {
  const list = await call('GET', '/members', { token: s.ania });
  check('lista członków, założyciel pierwszy', list.status === 200 && list.data.members.length === 2 && list.data.members[0].role === 'owner', list);

  const me = await call('PATCH', '/me', { token: s.ania, body: { name: 'Anna', color: 'plum' } });
  check('zmiana podpisu', me.status === 200 && me.data.name === 'Anna' && me.data.color === 'plum', me);

  const notOwner = await call('POST', '/space/rotate', { token: s.ania });
  check('rotacja przez członka: 403', notOwner.status === 403, notOwner);
  const renameByMember = await call('PATCH', '/space', { token: s.ania, body: { name: 'X' } });
  check('zmiana nazwy przez członka: 403', renameByMember.status === 403, renameByMember);

  const renamed = await call('PATCH', '/space', { token: s.owner, body: { name: 'Kubitowie' } });
  check('zmiana nazwy przez założyciela', renamed.status === 200 && renamed.data.name === 'Kubitowie', renamed);

  const rotated = await call('POST', '/space/rotate', { token: s.owner });
  check('nowy link zaproszenia', rotated.status === 200 && rotated.data.invite && rotated.data.invite !== s.invite, rotated);
  const oldInvite = await call('GET', '/invite', { token: s.invite });
  check('stary link nie działa', oldInvite.status === 401, oldInvite);
  const stillMember = await call('GET', '/changes?since=0', { token: s.ania });
  check('członek działa po zmianie linku', stillMember.status === 200, stillMember);

  const selfRemove = await call('DELETE', `/members/${s.ownerId}`, { token: s.owner });
  check('założyciel nie usuwa siebie: 400', selfRemove.status === 400, selfRemove);
  const ownerLeave = await call('POST', '/space/leave', { token: s.owner });
  check('założyciel nie wychodzi bez przekazania roli: 409', ownerLeave.status === 409, ownerLeave);

  const transferred = await call('POST', `/members/${s.aniaId}/owner`, { token: s.owner });
  check('przekazanie roli', transferred.status === 200, transferred);
  const newOwner = await call('GET', '/space', { token: s.ania });
  check('nowa założycielka', newOwner.data?.me?.role === 'owner', newOwner);

  const busy = await call('DELETE', '/space', { token: s.ania });
  check('usunięcie mapy z innymi osobami: 409', busy.status === 409, busy);

  const removed = await call('DELETE', `/members/${s.ownerId}`, { token: s.ania });
  check('usunięcie członka', removed.status === 200, removed);
  const gone = await call('GET', '/changes?since=0', { token: s.owner });
  check('usunięty: 401 member_removed', gone.status === 401 && gone.data?.code === 'member_removed', gone);
  const removeAgain = await call('DELETE', `/members/${s.ownerId}`, { token: s.ania });
  check('ponowne usunięcie: 404', removeAgain.status === 404, removeAgain);
  const toRemoved = await call('POST', `/members/${s.ownerId}/owner`, { token: s.ania });
  check('rola dla usuniętego: 404', toRemoved.status === 404, toRemoved);

  const del = await call('DELETE', '/space', { token: s.ania });
  check('usunięcie mapy przez jedyną osobę', del.status === 200, del);
  const after = await call('GET', '/space', { token: s.ania });
  check('po usunięciu mapy: 401', after.status === 401, after);
}

/** Stara aplikacja na mapie bez założyciela może zmienić link (jak dawniej). */
async function legacyRotate() {
  const created = await call('POST', '/spaces');
  const rotated = await call('POST', '/space/rotate', { token: created.data.token });
  check('stara aplikacja: rotacja mapy bez założyciela', rotated.status === 200 && typeof rotated.data.token === 'string', rotated);
  const leave = await call('POST', '/space/leave', { token: rotated.data.token });
  check('stara aplikacja: wyjście wymaga podpisu (403)', leave.status === 403, leave);
}
```

Końcówka skryptu:

```js
const legacyToken = await legacy();
const session = await members();
await legacyOwner(legacyToken);
await management(session);
await legacyRotate();
void sql; // używane w Task A4
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npm run smoke` → FAIL od „lista członków" (404).

- [ ] **Step 3: Handlery w `members.ts`**

Dopisz do importów `requireMember, requireOwner` z `./auth` i dodaj:

```ts
export async function listMembers(env: Env, session: Session): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, color, role, joined_at AS joinedAt, last_seen_at AS lastSeenAt
       FROM members WHERE space_id = ? AND removed_at IS NULL
      ORDER BY role = 'owner' DESC, joined_at`
  )
    .bind(session.space.id)
    .all();
  return json({ members: results });
}

export async function updateMe(request: Request, env: Env, session: Session): Promise<Response> {
  const me = requireMember(session);
  const body = (await readJson(request)) as { name?: unknown; color?: unknown } | null;
  const name = body?.name !== undefined ? parseName(body.name, 'Imię') : me.name;
  const color = body?.color !== undefined ? parseColor(body.color) : me.color;
  await env.DB.prepare('UPDATE members SET name = ?, color = ? WHERE id = ?').bind(name, color, me.id).run();
  return json({ name, color });
}

export async function leaveSpace(env: Env, session: Session): Promise<Response> {
  const me = requireMember(session);
  if (me.role === 'owner') {
    throw new HttpError(409, 'Założyciel musi najpierw przekazać rolę innej osobie');
  }
  await env.DB.prepare('UPDATE members SET removed_at = ? WHERE id = ?').bind(Date.now(), me.id).run();
  return json({ ok: true });
}

export async function renameSpace(request: Request, env: Env, session: Session): Promise<Response> {
  requireOwner(session);
  const body = (await readJson(request)) as { name?: unknown } | null;
  const name = parseName(body?.name, 'Nazwa mapy');
  await env.DB.prepare('UPDATE spaces SET name = ? WHERE id = ?').bind(name, session.space.id).run();
  return json({ name });
}

/** Nowy link zaproszenia. Dołączeni członkowie działają dalej — mają własne klucze. */
export async function rotateInvite(env: Env, session: Session): Promise<Response> {
  if (session.member) {
    requireOwner(session);
  } else if (await hasOwner(env, session.space.id)) {
    // Stara aplikacja (klucz z linku) może zmienić link tylko na mapie bez założyciela
    throw new HttpError(403, 'Link może zmienić tylko założyciel mapy');
  }
  const invite = newToken();
  await env.DB.prepare('UPDATE spaces SET token_hash = ? WHERE id = ?')
    .bind(await sha256(invite), session.space.id)
    .run();
  // `token` dla starej wersji aplikacji, która czyta to pole
  return json({ invite, token: invite });
}

export async function removeMember(env: Env, session: Session, memberId: string): Promise<Response> {
  const me = requireOwner(session);
  if (memberId === me.id) {
    throw new HttpError(400, 'Nie możesz usunąć siebie — przekaż rolę albo usuń mapę');
  }
  const res = await env.DB.prepare(
    'UPDATE members SET removed_at = ? WHERE id = ? AND space_id = ? AND removed_at IS NULL'
  )
    .bind(Date.now(), memberId, session.space.id)
    .run();
  if (res.meta.changes === 0) throw new HttpError(404, 'Nie ma takiej osoby na tej mapie');
  return json({ ok: true });
}

export async function transferOwner(env: Env, session: Session, memberId: string): Promise<Response> {
  const me = requireOwner(session);
  if (memberId === me.id) throw new HttpError(400, 'Już jesteś założycielem tej mapy');
  const target = await env.DB.prepare(
    'SELECT id FROM members WHERE id = ? AND space_id = ? AND removed_at IS NULL'
  )
    .bind(memberId, session.space.id)
    .first();
  if (!target) throw new HttpError(404, 'Nie ma takiej osoby na tej mapie');
  // Kolejność ma znaczenie: indeks members_one_owner pozwala na jednego założyciela naraz
  await env.DB.batch([
    env.DB.prepare("UPDATE members SET role = 'member' WHERE id = ?").bind(me.id),
    env.DB.prepare("UPDATE members SET role = 'owner' WHERE id = ?").bind(memberId),
  ]);
  return json({ ok: true });
}

/** Usuwa mapę. Bajty zdjęć trafiają do kolejki sprzątania (Cron, Task A4). */
export async function deleteSpace(env: Env, session: Session): Promise<Response> {
  requireOwner(session);
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS active FROM members WHERE space_id = ? AND removed_at IS NULL'
  )
    .bind(session.space.id)
    .first<{ active: number }>();
  if ((row?.active ?? 0) > 1) {
    throw new HttpError(409, 'Na mapie są jeszcze inne osoby — najpierw je usuń albo przekaż rolę');
  }
  const id = session.space.id;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO photo_purge (key, queued_at)
       SELECT key, ?1 FROM photo_objects WHERE space_id = ?2
       ON CONFLICT (key) DO NOTHING`
    ).bind(Date.now(), id),
    env.DB.prepare('DELETE FROM graves WHERE space_id = ?').bind(id),
    env.DB.prepare('DELETE FROM members WHERE space_id = ?').bind(id),
    env.DB.prepare('DELETE FROM spaces WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

async function hasOwner(env: Env, spaceId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT 1 AS yes FROM members WHERE space_id = ? AND role = 'owner' AND removed_at IS NULL"
  )
    .bind(spaceId)
    .first();
  return row !== null;
}
```

- [ ] **Step 4: Trasy i CORS**

W `http.ts` w `Access-Control-Allow-Methods` dodaj `PATCH`: `'GET, POST, PUT, PATCH, DELETE, OPTIONS'`.

W `index.ts` rozszerz import z `./members` o `listMembers, updateMe, leaveSpace, renameSpace, rotateInvite, removeMember, transferOwner, deleteSpace`, usuń starą gałąź `/space/rotate` i przed `throw new HttpError(404, ...)` dodaj:

```ts
  if (request.method === 'GET' && path === '/members') return listMembers(env, session);
  if (request.method === 'PATCH' && path === '/me') return updateMe(request, env, session);
  if (request.method === 'POST' && path === '/space/leave') return leaveSpace(env, session);
  if (request.method === 'PATCH' && path === '/space') return renameSpace(request, env, session);
  if (request.method === 'DELETE' && path === '/space') return deleteSpace(env, session);
  if (request.method === 'POST' && path === '/space/rotate') return rotateInvite(env, session);
  const member = path.match(/^\/members\/([^/]+)(\/owner)?$/);
  if (member && request.method === 'DELETE' && !member[2]) return removeMember(env, session, member[1]);
  if (member && request.method === 'POST' && member[2]) return transferOwner(env, session, member[1]);
```

Usuń nieużywany już import `newToken`/`sha256` z `index.ts`, jeśli typecheck to zgłosi.

- [ ] **Step 5: Typy i test dymny**

Run: `npm run typecheck`; `npm run smoke` → `wszystko ok`.

- [ ] **Step 6: Commit**

```bash
git add worker
git commit -m "feat(api): zarządzanie członkami — role, rotacja zaproszenia, usuwanie mapy"
```

### Task A4: Sprzątanie zdjęć skasowanej mapy (Cron) i licznik usunięć

**Files:**
- Create: `worker/src/purge.ts`
- Modify: `worker/src/index.ts`, `worker/wrangler.jsonc`, `worker/package.json`, `worker/scripts/smoke.mjs`

**Interfaces:**
- Consumes: `photo_purge`, `usage_daily.photo_deletes` (A2), `deleteSpace` (A3), `currentDay` (A1).
- Produces: `purgePhotos(env): Promise<number>`, `PHOTO_DAILY_DELETE_LIMIT = 900`; handler `scheduled` Workera.

- [ ] **Step 1: Sekcja testu dymnego**

```js
/** Zdjęcia skasowanej mapy znikają z KV przy najbliższym przebiegu Crona. */
async function purge() {
  const created = await call('POST', '/spaces', { body: { name: 'Do usunięcia', member: { name: 'Test', color: 'slate' } } });
  const token = created.data.memberToken;
  const key = `${created.data.spaceId}/p-purge/full`;
  const put = await fetch(`${API}/photos/p-purge?variant=full`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
    body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  });
  check('zdjęcie wgrane', put.status === 201, put.status);

  const del = await call('DELETE', '/space', { token });
  check('mapa usunięta', del.status === 200, del);
  check('klucz zdjęcia w kolejce sprzątania', sql(`SELECT COUNT(*) AS n FROM photo_purge WHERE key = '${key}'`) === 1);

  const cron = await fetch(`${API}/__scheduled?cron=17+3+*+*+*`);
  check('Cron uruchomiony', cron.ok, cron.status);
  check('kolejka sprzątania pusta', sql(`SELECT COUNT(*) AS n FROM photo_purge WHERE key = '${key}'`) === 0);
  check('zdjęcie zdjęte z bezpiecznika miejsca', sql(`SELECT COUNT(*) AS n FROM photo_objects WHERE key = '${key}'`) === 0);
}
```

Końcówka: zamień `void sql; // używane w Task A4` na `await purge();`.

- [ ] **Step 2: Uruchom — ma nie przejść**

W `package.json` zmień skrypt `dev` — dopisz na końcu `--test-scheduled` (udostępnia `/__scheduled`):

```json
"dev": "wrangler dev --port 8791 --test-scheduled --var ALLOWED_ORIGINS:http://localhost:4260,http://localhost:4200,http://localhost:4270",
```

Zrestartuj `grave-app-api` (`preview_stop` + `preview_start`). `npm run smoke` → FAIL „kolejka sprzątania pusta".

- [ ] **Step 3: `worker/src/purge.ts`**

```ts
import type { Env } from './index';
import { currentDay } from './util';

/**
 * Darmowe KV pozwala na 1000 usunięć dziennie; zostawiamy zapas. Usunięcie mapy z setkami
 * zdjęć rozkłada się więc na kilka dni — klucze czekają w `photo_purge`, a `photo_objects`
 * trzyma ich rozmiar do końca, żeby bezpiecznik miejsca liczył uczciwie.
 */
export const PHOTO_DAILY_DELETE_LIMIT = 900;
const PURGE_CHUNK = 50;

/** Usuwa z KV tyle kluczy z kolejki, ile zostało z dziennego limitu. Zwraca ich liczbę. */
export async function purgePhotos(env: Env): Promise<number> {
  const day = currentDay();
  const usage = await env.DB.prepare('SELECT photo_deletes FROM usage_daily WHERE day = ?')
    .bind(day)
    .first<{ photo_deletes: number }>();
  const budget = PHOTO_DAILY_DELETE_LIMIT - (usage?.photo_deletes ?? 0);
  if (budget <= 0) return 0;

  const { results } = await env.DB.prepare('SELECT key FROM photo_purge ORDER BY queued_at LIMIT ?')
    .bind(budget)
    .all<{ key: string }>();

  let done = 0;
  for (let i = 0; i < results.length; i += PURGE_CHUNK) {
    const keys = results.slice(i, i + PURGE_CHUNK).map((r) => r.key);
    await Promise.all(keys.map((key) => env.PHOTOS.delete(key)));
    await env.DB.batch([
      ...keys.flatMap((key) => [
        env.DB.prepare('DELETE FROM photo_purge WHERE key = ?').bind(key),
        env.DB.prepare('DELETE FROM photo_objects WHERE key = ?').bind(key),
      ]),
      env.DB.prepare(
        `INSERT INTO usage_daily (day, photo_deletes) VALUES (?1, ?2)
         ON CONFLICT (day) DO UPDATE SET photo_deletes = photo_deletes + ?2`
      ).bind(day, keys.length),
    ]);
    done += keys.length;
  }
  return done;
}
```

- [ ] **Step 4: Cron, `scheduled` i licznik w `DELETE /photos`**

W `wrangler.jsonc` dodaj (z komentarzem):

```jsonc
  // Raz na dobę: usuwanie z KV zdjęć skasowanych map (src/purge.ts)
  "triggers": { "crons": ["17 3 * * *"] },
```

W `index.ts` zaimportuj `purgePhotos` z `./purge` i dopisz do obiektu `export default` obok `fetch`:

```ts
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await purgePhotos(env);
  },
```

W `handlePhoto`, gałąź `DELETE`, zamień zapis do bazy na batch z licznikiem:

```ts
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM photo_objects WHERE key IN (?, ?)`).bind(...keys),
      env.DB.prepare(
        `INSERT INTO usage_daily (day, photo_deletes) VALUES (?1, ?2)
         ON CONFLICT (day) DO UPDATE SET photo_deletes = photo_deletes + ?2`
      ).bind(currentDay(), keys.length),
    ]);
```

- [ ] **Step 5: Typy i test dymny**

Run: `npm run typecheck`; `npm run smoke` → `wszystko ok`.

- [ ] **Step 6: Commit**

```bash
git add worker
git commit -m "feat(api): sprzątanie zdjęć usuniętej mapy przez Cron z limitem usunięć"
```

### Task A5: README Workera i PR

**Files:**
- Modify: `worker/README.md`

- [ ] **Step 1: Zaktualizuj README**

- Sekcja „Jak to działa" → punkt **Dostęp** zastąp opisem: link `/rodzina#<klucz>` to zaproszenie; dołączenie (`POST /join`) daje telefonowi własny klucz członka; usunięty członek dostaje 401 z `code: member_removed`; przejściowo klucz z linku działa jak klucz członka (`ALLOW_INVITE_AS_MEMBER`), aż wszyscy zaktualizują aplikację.
- Tabelę endpointów zastąp pełną listą z kontraktów A2 i A3 (metoda, ścieżka, kto, opis), plus `PUT/GET/DELETE /photos/:id` jak dotąd.
- Dodaj akapit **Sprzątanie zdjęć**: Cron `17 3 * * *`, `photo_purge`, limit 900 usunięć/dobę; lokalnie `npm run dev` ma `--test-scheduled` (`curl "http://localhost:8791/__scheduled?cron=17+3+*+*+*"`).
- W „Lokalnie" dodaj `npm run smoke` (tylko lokalnie, nigdy na produkcji).

- [ ] **Step 2: Ostatnie sprawdzenie i commit**

Run: `npm run typecheck`; `npm run smoke` → `wszystko ok`.

```bash
git add worker/README.md frontend/grave-app-front/docs/superpowers
git commit -m "docs(api): członkowie, zaproszenia i sprzątanie zdjęć w README"
```

- [ ] **Step 3: PR (bez merge'a)**

```bash
git push -u origin feature/rodzina-czlonkowie
gh pr create --repo kacperk72/grave-app --base main --title "API: członkowie rodzinnych map i zaproszenia" --body-file -
```

Treść PR: co się zmienia, zgodność wstecz (stara aplikacja działa bez zmian), migracja `0003`, Cron, jak sprawdzić (`npm run smoke` lokalnie), na końcu linia `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge decyduje użytkownik** (merge = wdrożenie Workera i migracji na produkcję). Po merge'u: `GET https://grave-app-api.kacper-kubit99.workers.dev/` zwraca `ok`, a produkcyjna aplikacja nadal synchronizuje (otwarcie Ustawień → stan „Zsynchronizowano"). Testu dymnego nie uruchamiaj na produkcji.

---

## Część B — front (PR 2, gałąź `feature/rodzina-front`)

Gałąź od `main` po merge'u PR 1 (`git switch main && git pull && git switch -c feature/rodzina-front`); jeśli PR 1 jeszcze czeka — od `feature/rodzina-czlonkowie`. Pracuj w `grave-app/frontend/grave-app-front`. Testy: `npx ng test --watch=false` (całość) albo `npx ng test --watch=false --include <ścieżka spec>`. Build: `npx ng build`. Do E2E: `grave-app-api` (8791) + `grave-app` (`ng serve`, 4260) z `.claude/launch.json`.

### Task B1: Modele map, awatary i paleta

**Files:**
- Create: `src/app/shared/models/space.model.ts`, `src/app/shared/utils/member-display.ts`, `src/app/shared/utils/member-display.spec.ts`, `src/app/shared/components/avatar.component.ts`
- Modify: `src/app/shared/models/grave.model.ts`, `src/app/core/services/indexeddb.service.ts` (tylko typ `PhotoVariant`), `src/app/shared/components/icon.component.ts`, `src/styles.scss`

**Interfaces:**
- Produces: `grave.model.ts` — `type PhotoVariant = 'full' | 'thumb'`, `Grave.updatedBy?: string | null`; `member-display.ts` — `AVATAR_COLORS`, `type AvatarColor`, `AVATAR_COLOR_LABELS`, `isAvatarColor(v)`, `initials(name)`, `colorFor(seed)`, `lastSeenText(ts, now?)`, `relativeTime(ts, now?)`; `space.model.ts` — `LOCAL_SPACE_ID`, `SpaceRole`, `SpaceStatus`, `LocalSpace`, `Member`, `Profile`, `localSpace()`, `newSharedSpace(fields)`, `isShared(space)`, `credentialOf(space)`; komponenty `<app-avatar [name] [color] [size]>` i `<app-avatar-stack [people] [max] [size]>`; globalne klasy `.avatar-color--<kolor>`; ikona `more`.

- [ ] **Step 1: Test `member-display.spec.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  AVATAR_COLORS,
  colorFor,
  initials,
  isAvatarColor,
  lastSeenText,
  relativeTime,
} from './member-display';

const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 1, 12);

describe('initials', () => {
  it('pierwsza litera imienia i nazwiska', () => expect(initials('Kacper Kubit')).toBe('KK'));
  it('jedno słowo → jedna wielka litera', () => expect(initials('ania')).toBe('A'));
  it('nadmiarowe spacje i środkowe imię', () => expect(initials('  Anna   Maria  Nowak ')).toBe('AN'));
  it('polskie znaki', () => expect(initials('łucja żak')).toBe('ŁŻ'));
  it('nie rozcina emoji', () => expect(initials('🌷 Ania')).toBe('🌷A'));
  it('puste imię → ?', () => expect(initials('   ')).toBe('?'));
});

describe('colorFor', () => {
  it('ten sam tekst → ten sam kolor', () => expect(colorFor('Ania')).toBe(colorFor('Ania')));
  it('kolor z palety', () => expect(AVATAR_COLORS).toContain(colorFor('Kacper')));
});

describe('isAvatarColor', () => {
  it('przyjmuje kolor z palety', () => expect(isAvatarColor('sage')).toBe(true));
  it('odrzuca inne wartości', () => {
    expect(isAvatarColor('red')).toBe(false);
    expect(isAvatarColor(undefined)).toBe(false);
  });
});

describe('lastSeenText', () => {
  it('brak synchronizacji', () => expect(lastSeenText(null, NOW)).toBe('jeszcze bez synchronizacji'));
  it('przed chwilą', () => expect(lastSeenText(NOW - 30_000, NOW)).toBe('online przed chwilą'));
  it('minuty', () => expect(lastSeenText(NOW - 5 * MIN, NOW)).toBe('online 5 min temu'));
  it('godziny', () => expect(lastSeenText(NOW - 3 * 60 * MIN, NOW)).toBe('online 3 godz. temu'));
  it('jeden dzień', () => expect(lastSeenText(NOW - 24 * 60 * MIN, NOW)).toBe('online 1 dzień temu'));
  it('kilka dni', () => expect(lastSeenText(NOW - 3 * 24 * 60 * MIN, NOW)).toBe('online 3 dni temu'));
  it('tygodnie', () => expect(lastSeenText(NOW - 21 * 24 * 60 * MIN, NOW)).toBe('brak aktywności od 3 tyg.'));
  it('czas z przyszłości (rozjechany zegar) → przed chwilą', () =>
    expect(lastSeenText(NOW + 5 * MIN, NOW)).toBe('online przed chwilą'));
});

describe('relativeTime', () => {
  it('przed chwilą', () => expect(relativeTime(NOW - 10_000, NOW)).toBe('przed chwilą'));
  it('minuty', () => expect(relativeTime(NOW - 7 * MIN, NOW)).toBe('7 min temu'));
  it('dni', () => expect(relativeTime(NOW - 2 * 24 * 60 * MIN, NOW)).toBe('2 dni temu'));
});
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npx ng test --watch=false --include src/app/shared/utils/member-display.spec.ts` → FAIL (brak modułu).

- [ ] **Step 3: `member-display.ts`**

```ts
import { pluralPl } from './grave-display';

/** Paleta awatarów — ta sama lista co w Workerze (`worker/src/members.ts`). */
export const AVATAR_COLORS = ['sage', 'clay', 'sky', 'plum', 'sand', 'slate', 'rose', 'moss'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const AVATAR_COLOR_LABELS: Record<AvatarColor, string> = {
  sage: 'szałwia',
  clay: 'glina',
  sky: 'niebo',
  plum: 'śliwka',
  sand: 'piasek',
  slate: 'łupek',
  rose: 'róża',
  moss: 'mech',
};

export function isAvatarColor(value: unknown): value is AvatarColor {
  return typeof value === 'string' && (AVATAR_COLORS as readonly string[]).includes(value);
}

/** „Kacper Kubit" → „KK", „ania" → „A". Znaki liczone jako punkty Unicode — emoji się nie rozpada. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : '';
  return (first + last).toLocaleUpperCase('pl-PL');
}

/** Stały kolor dla tekstu — podpowiedź przy pierwszym podpisie. */
export function colorFor(seed: string): AvatarColor {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** „5 min temu", „3 godz. temu", „2 dni temu" — bez podmiotu, do wstawienia w zdanie. */
export function relativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < 2 * MIN) return 'przed chwilą';
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min temu`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} godz. temu`;
  const days = Math.floor(diff / DAY);
  return `${days} ${pluralPl(days, 'dzień', 'dni', 'dni')} temu`;
}

/** Aktywność członka na liście: „online 5 min temu", „brak aktywności od 3 tyg.". */
export function lastSeenText(lastSeenAt: number | null, now = Date.now()): string {
  if (lastSeenAt === null) return 'jeszcze bez synchronizacji';
  const diff = now - lastSeenAt;
  if (diff >= WEEK) return `brak aktywności od ${Math.floor(diff / WEEK)} tyg.`;
  return `online ${relativeTime(lastSeenAt, now)}`;
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npx ng test --watch=false --include src/app/shared/utils/member-display.spec.ts` → PASS.

- [ ] **Step 5: Modele**

W `grave.model.ts` nad `export interface Grave` dodaj:

```ts
/** Wariant bajtów zdjęcia: pełne (1600 px) albo miniatura (480 px). */
export type PhotoVariant = 'full' | 'thumb';
```

a w `Grave` po `lastVisited?: string;`:

```ts
  /** Id członka rodzinnej mapy, który ostatnio zapisał grób — nadaje serwer. */
  updatedBy?: string | null;
```

W `indexeddb.service.ts` zamień `export type PhotoVariant = 'full' | 'thumb';` na:

```ts
export type { PhotoVariant } from '../../shared/models/grave.model';
import type { PhotoVariant } from '../../shared/models/grave.model';
```

(import umieść przy pozostałych importach na górze pliku).

`src/app/shared/models/space.model.ts`:

```ts
import { AvatarColor } from '../utils/member-display';

/** „Moje" — groby tylko w tym telefonie, bez synchronizacji. */
export const LOCAL_SPACE_ID = 'local';

export type SpaceRole = 'owner' | 'member';

/**
 * active — działa; removed — założyciel usunął ten telefon (groby tylko do odczytu);
 * needs-profile — mapa sprzed list członków: synchronizuje się kluczem z linku i czeka na podpis.
 */
export type SpaceStatus = 'active' | 'removed' | 'needs-profile';

/** Mapa zapamiętana w telefonie (tabela `spaces` w IndexedDB). */
export interface LocalSpace {
  /** Lokalne id: `local` dla „Moje", dla rodzinnych losowy UUID nadany w telefonie. */
  id: string;
  /** Id mapy na serwerze; null dla „Moje" i mapy sprzed migracji do czasu podpisu. */
  serverId: string | null;
  name: string;
  /** Klucz członka — tylko w tym telefonie. */
  memberToken: string | null;
  /** Klucz z linku zaproszenia — do udostępniania (i synchronizacji, dopóki `needs-profile`). */
  inviteToken: string | null;
  memberId: string | null;
  role: SpaceRole | null;
  /** Ostatni pobrany numer zmiany mapy (synchronizacja przyrostowa). */
  rev: number;
  syncedAt: number | null;
  status: SpaceStatus;
  createdAt: number;
}

/** Członek mapy, jak zwraca go `GET /members`. */
export interface Member {
  id: string;
  name: string;
  color: AvatarColor;
  role: SpaceRole;
  joinedAt: number;
  lastSeenAt: number | null;
}

/** Podpis tego telefonu: imię i kolor awatara. */
export interface Profile {
  name: string;
  color: AvatarColor;
}

export function localSpace(): LocalSpace {
  return {
    id: LOCAL_SPACE_ID,
    serverId: null,
    name: 'Moje',
    memberToken: null,
    inviteToken: null,
    memberId: null,
    role: null,
    rev: 0,
    syncedAt: null,
    status: 'active',
    createdAt: 0,
  };
}

export function newSharedSpace(fields: Partial<LocalSpace> & Pick<LocalSpace, 'name'>): LocalSpace {
  return {
    id: crypto.randomUUID(),
    serverId: null,
    memberToken: null,
    inviteToken: null,
    memberId: null,
    role: null,
    rev: 0,
    syncedAt: null,
    status: 'active',
    createdAt: Date.now(),
    ...fields,
  };
}

export function isShared(space: Pick<LocalSpace, 'id'>): boolean {
  return space.id !== LOCAL_SPACE_ID;
}

/** Klucz do API tej mapy; null dla „Moje" i mapy, z której usunięto ten telefon. */
export function credentialOf(space: LocalSpace): string | null {
  if (!isShared(space) || space.status === 'removed') return null;
  return space.memberToken ?? (space.status === 'needs-profile' ? space.inviteToken : null);
}
```

- [ ] **Step 6: Paleta w `styles.scss` i ikona `more`**

W `:root` (po `--divider`) dodaj:

```scss
  // Awatary członków rodzinnej mapy — przygaszone, czytelne w obu motywach
  --avatar-sage-bg: #dfe7dc;
  --avatar-sage-ink: #3c5a3a;
  --avatar-clay-bg: #f0dccf;
  --avatar-clay-ink: #7a3e22;
  --avatar-sky-bg: #d9e6f2;
  --avatar-sky-ink: #2b4f73;
  --avatar-plum-bg: #e7dbe8;
  --avatar-plum-ink: #5e3563;
  --avatar-sand-bg: #efe6cf;
  --avatar-sand-ink: #6b5520;
  --avatar-slate-bg: #e1e3e6;
  --avatar-slate-ink: #3b4450;
  --avatar-rose-bg: #f2dadd;
  --avatar-rose-ink: #7c2f3a;
  --avatar-moss-bg: #e2e6cf;
  --avatar-moss-ink: #4d5a1e;
```

W `html.app-dark`:

```scss
  --avatar-sage-bg: #2c3a2b;
  --avatar-sage-ink: #c3d6bf;
  --avatar-clay-bg: #3d2a20;
  --avatar-clay-ink: #e8c2ad;
  --avatar-sky-bg: #22313f;
  --avatar-sky-ink: #b9d0e8;
  --avatar-plum-bg: #362838;
  --avatar-plum-ink: #dcc2df;
  --avatar-sand-bg: #3a3220;
  --avatar-sand-ink: #e3d3a8;
  --avatar-slate-bg: #2b2e33;
  --avatar-slate-ink: #c9ced6;
  --avatar-rose-bg: #3d2529;
  --avatar-rose-ink: #ebbcc3;
  --avatar-moss-bg: #33381f;
  --avatar-moss-ink: #d0d8a8;
```

Na końcu pliku (globalnie, bo używa ich awatar i próbnik koloru w formularzu):

```scss
/* Kolory awatarów: .avatar-color--sage itd. */
@each $c in sage, clay, sky, plum, sand, slate, rose, moss {
  .avatar-color--#{$c} {
    background: var(--avatar-#{$c}-bg);
    color: var(--avatar-#{$c}-ink);
  }
}
```

W `icon.component.ts` w `ICONS` dodaj:

```ts
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
```

- [ ] **Step 7: `avatar.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { initials } from '../utils/member-display';

/** Awatar członka: inicjały na kolorze z palety. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[attr.aria-label]': 'name()',
    '[attr.title]': 'name()',
    '[class]': "'avatar-color--' + color()",
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.4',
  },
  template: `{{ letters() }}`,
  styles: [
    `
      :host {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        font-weight: 600;
        line-height: 1;
        user-select: none;
      }
    `,
  ],
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly color = input<string>('slate');
  readonly size = input(32);
  readonly letters = computed(() => initials(this.name()));
}

/** Kilka nakładających się awatarów i „+N" dla reszty. */
@Component({
  selector: 'app-avatar-stack',
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (p of shown(); track $index) {
    <app-avatar [name]="p.name" [color]="p.color" [size]="size()" />
    } @if (extra() > 0) {
    <span class="more" [style.height.px]="size()" [style.min-width.px]="size()">+{{ extra() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
      }
      app-avatar,
      .more {
        box-shadow: 0 0 0 2px var(--card);
      }
      app-avatar + app-avatar,
      app-avatar + .more {
        margin-left: -8px;
      }
      .more {
        padding: 0 6px;
        border-radius: var(--radius-pill);
        background: var(--pill);
        color: var(--ink-muted);
        font-size: 11px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class AvatarStackComponent {
  readonly people = input<readonly { name: string; color: string }[]>([]);
  readonly max = input(3);
  readonly size = input(24);
  readonly shown = computed(() => this.people().slice(0, this.max()));
  readonly extra = computed(() => Math.max(0, this.people().length - this.max()));
}
```

- [ ] **Step 8: Build i testy**

Run: `npx ng test --watch=false` → PASS; `npx ng build` → bez błędów.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat: model map, awatary członków i paleta kolorów"
```

### Task B2: Migracja danych i decyzja o zmianach z serwera (czysta logika)

**Files:**
- Create: `src/app/shared/utils/space-migration.ts` (+ `.spec.ts`), `src/app/shared/utils/remote-change.ts` (+ `.spec.ts`)

**Interfaces:**
- Consumes: `LocalSpace`, `localSpace()`, `newSharedSpace()`, `LOCAL_SPACE_ID` (B1).
- Produces: `LEGACY_KEYS`, `interface LegacyFamily { token; rev; syncedAt }`, `readLegacyFamily(storage)`, `interface SpaceMigrationPlan { spaces; targetSpaceId; keepQueues }`, `planSpaceMigration(legacy, newId?)`; `type RemoteAction = 'put' | 'delete' | 'skip'`, `decideRemoteChange(spaceId, change, local, queued)`.

- [ ] **Step 1: Testy**

`space-migration.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LEGACY_KEYS, planSpaceMigration, readLegacyFamily } from './space-migration';
import { LOCAL_SPACE_ID } from '../models/space.model';

describe('readLegacyFamily', () => {
  it('czyta klucz, rev i czas synchronizacji', () => {
    const data: Record<string, string> = {
      [LEGACY_KEYS.token]: 'abc',
      [LEGACY_KEYS.rev]: '42',
      [LEGACY_KEYS.syncedAt]: '1700000000000',
    };
    const legacy = readLegacyFamily({ getItem: (k: string) => data[k] ?? null });
    expect(legacy).toEqual({ token: 'abc', rev: 42, syncedAt: 1700000000000 });
  });
  it('śmieci w rev → 0, brak magazynu → brak mapy', () => {
    expect(readLegacyFamily({ getItem: (k: string) => (k === LEGACY_KEYS.rev ? 'x' : null) }).rev).toBe(0);
    expect(readLegacyFamily(null)).toEqual({ token: null, rev: 0, syncedAt: null });
  });
});

describe('planSpaceMigration', () => {
  it('bez rodzinnej mapy: tylko „Moje", kolejki porzucone', () => {
    const plan = planSpaceMigration({ token: null, rev: 0, syncedAt: null });
    expect(plan.spaces.map((s) => s.id)).toEqual([LOCAL_SPACE_ID]);
    expect(plan.targetSpaceId).toBe(LOCAL_SPACE_ID);
    expect(plan.keepQueues).toBe(false);
  });
  it('z rodzinną mapą: groby i kolejki trafiają do mapy czekającej na podpis', () => {
    const plan = planSpaceMigration({ token: 'abc', rev: 7, syncedAt: 123 }, () => 'fam');
    expect(plan.targetSpaceId).toBe('fam');
    expect(plan.keepQueues).toBe(true);
    const family = plan.spaces.find((s) => s.id === 'fam')!;
    expect(family).toMatchObject({
      inviteToken: 'abc',
      memberToken: null,
      rev: 7,
      syncedAt: 123,
      status: 'needs-profile',
      name: 'Rodzinna mapa',
    });
    expect(plan.spaces.some((s) => s.id === LOCAL_SPACE_ID)).toBe(true);
  });
});
```

`remote-change.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decideRemoteChange } from './remote-change';

const put = { deleted: false, data: { id: 'g1' } };
const del = { deleted: true, data: null };

describe('decideRemoteChange', () => {
  it('nowy grób z serwera → put', () => expect(decideRemoteChange('A', put, undefined, false)).toBe('put'));
  it('grób tej mapy → put', () => expect(decideRemoteChange('A', put, { spaceId: 'A' }, false)).toBe('put'));
  it('niewysłana lokalna zmiana wygrywa → skip', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'A' }, true)).toBe('skip'));
  it('usunięcie grobu tej mapy → delete', () =>
    expect(decideRemoteChange('A', del, { spaceId: 'A' }, false)).toBe('delete'));
  it('usunięcie grobu, którego nie ma → skip', () => expect(decideRemoteChange('A', del, undefined, false)).toBe('skip'));
  it('grób przeniesiony do innej mapy: usunięcie z A go nie rusza', () =>
    expect(decideRemoteChange('A', del, { spaceId: 'B' }, false)).toBe('skip'));
  it('grób przeniesiony do innej mapy: stary zapis z A go nie nadpisuje', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'B' }, false)).toBe('skip'));
  it('zapis bez danych traktujemy jak usunięcie', () =>
    expect(decideRemoteChange('A', { deleted: false, data: null }, { spaceId: 'A' }, false)).toBe('delete'));
});
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npx ng test --watch=false --include src/app/shared/utils/space-migration.spec.ts --include src/app/shared/utils/remote-change.spec.ts` → FAIL.

- [ ] **Step 3: Implementacja**

`space-migration.ts`:

```ts
import { LOCAL_SPACE_ID, LocalSpace, localSpace, newSharedSpace } from '../models/space.model';

/** Klucze `localStorage` rodzinnej mapy sprzed wielu map (do migracji Dexie v4). */
export const LEGACY_KEYS = {
  token: 'gravemap-family-token',
  rev: 'gravemap-family-rev',
  syncedAt: 'gravemap-family-synced-at',
} as const;

export interface LegacyFamily {
  token: string | null;
  rev: number;
  syncedAt: number | null;
}

export interface SpaceMigrationPlan {
  spaces: LocalSpace[];
  /** Mapa, do której trafiają wszystkie dotychczasowe groby. */
  targetSpaceId: string;
  /** Przenieść kolejki zmian? Tylko gdy groby trafiają na mapę rodzinną. */
  keepQueues: boolean;
}

export function readLegacyFamily(storage: Pick<Storage, 'getItem'> | null): LegacyFamily {
  if (!storage) return { token: null, rev: 0, syncedAt: null };
  return {
    token: storage.getItem(LEGACY_KEYS.token),
    rev: Number(storage.getItem(LEGACY_KEYS.rev)) || 0,
    syncedAt: Number(storage.getItem(LEGACY_KEYS.syncedAt)) || null,
  };
}

/**
 * Plan przejścia na wiele map. Telefon z rodzinną mapą: wszystko trafia do niej, a mapa
 * czeka na podpis (do tego czasu synchronizuje się dawnym kluczem). Bez mapy: „Moje".
 */
export function planSpaceMigration(
  legacy: LegacyFamily,
  newId: () => string = () => crypto.randomUUID()
): SpaceMigrationPlan {
  const local = localSpace();
  if (!legacy.token) return { spaces: [local], targetSpaceId: LOCAL_SPACE_ID, keepQueues: false };
  const family = newSharedSpace({
    id: newId(),
    name: 'Rodzinna mapa',
    inviteToken: legacy.token,
    rev: legacy.rev,
    syncedAt: legacy.syncedAt,
    status: 'needs-profile',
  });
  return { spaces: [local, family], targetSpaceId: family.id, keepQueues: true };
}
```

`remote-change.ts`:

```ts
export type RemoteAction = 'put' | 'delete' | 'skip';

/**
 * Co zrobić ze zmianą pobraną z mapy `spaceId`. Grób może już leżeć w telefonie na innej
 * mapie (przeniesiony) — wtedy spóźniona zmiana z dawnej mapy go nie dotyczy.
 * Niewysłana lokalna zmiana wygrywa: nasza wersja pojedzie przy najbliższym wysłaniu.
 */
export function decideRemoteChange(
  spaceId: string,
  change: { deleted: boolean; data: unknown },
  local: { spaceId: string } | undefined,
  queued: boolean
): RemoteAction {
  if (queued) return 'skip';
  if (local && local.spaceId !== spaceId) return 'skip';
  if (change.deleted || !change.data) return local ? 'delete' : 'skip';
  return 'put';
}
```

- [ ] **Step 4: Testy przechodzą**

Run: jak w Step 2 → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/utils
git commit -m "feat: plan migracji na wiele map i decyzja o zmianach z serwera"
```

### Task B3: Przenoszenie i kopiowanie grobu (czysta logika)

**Files:**
- Create: `src/app/shared/utils/grave-transfer.ts` (+ `.spec.ts`)

**Interfaces:**
- Consumes: `Grave`, `PhotoVariant` (B1), `LOCAL_SPACE_ID` (B1).
- Produces: `type QueueOp`, `moveQueueOps(grave, from, to): QueueOp[]`, `interface GraveCopy { grave; photoIds: [string, string][]; skippedPhotos }`, `copyGrave(grave, hasBytes, newId?, now?)`.

- [ ] **Step 1: Testy**

```ts
import { describe, expect, it } from 'vitest';
import { copyGrave, moveQueueOps } from './grave-transfer';
import { Grave } from '../models/grave.model';

function grave(): Grave {
  return {
    id: 'g1',
    latitude: 50,
    longitude: 20,
    cemeteryName: 'Rakowicki',
    currency: 'PLN',
    deceasedPersons: [{ id: 'p1', graveId: 'g1', firstName: 'Anna', lastName: 'Nowak', birthDate: null, deathDate: null }],
    photos: [
      { id: 'f1', url: '', isPrimary: true, graveId: 'g1', uploadedAt: 'x' },
      { id: 'f2', url: '', isPrimary: false, graveId: 'g1', uploadedAt: 'x' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'm-ania',
  };
}

describe('moveQueueOps', () => {
  it('z „Moje" na rodzinną: tylko zapisy (grób + oba warianty zdjęć)', () => {
    const ops = moveQueueOps(grave(), 'local', 'A');
    expect(ops.every((o) => o.spaceId === 'A' && o.op === 'put')).toBe(true);
    expect(ops).toHaveLength(1 + 2 * 2);
  });
  it('z rodzinnej do „Moje": tylko usunięcia na starej mapie', () => {
    const ops = moveQueueOps(grave(), 'A', 'local');
    expect(ops.every((o) => o.spaceId === 'A' && o.op === 'delete')).toBe(true);
    expect(ops).toHaveLength(1 + 2);
  });
  it('między rodzinnymi: usunięcia na starej i zapisy na nowej', () => {
    const ops = moveQueueOps(grave(), 'A', 'B');
    expect(ops.filter((o) => o.spaceId === 'A').every((o) => o.op === 'delete')).toBe(true);
    expect(ops.filter((o) => o.spaceId === 'B').every((o) => o.op === 'put')).toBe(true);
  });
  it('w obrębie „Moje" nic', () => expect(moveQueueOps(grave(), 'local', 'local')).toEqual([]));
});

describe('copyGrave', () => {
  let n = 0;
  const newId = () => `n${++n}`;

  it('nowe id grobu, osób i zdjęć, powiązania ustawione', () => {
    n = 0;
    const copy = copyGrave(grave(), () => true, newId, 'NOW');
    expect(copy.grave.id).not.toBe('g1');
    expect(copy.grave.deceasedPersons[0].id).not.toBe('p1');
    expect(copy.grave.deceasedPersons[0].graveId).toBe(copy.grave.id);
    expect(copy.grave.photos.every((p) => p.graveId === copy.grave.id)).toBe(true);
    expect(copy.photoIds.map(([from]) => from)).toEqual(['f1', 'f2']);
    expect(copy.grave.updatedAt).toBe('NOW');
    expect(copy.grave.updatedBy).toBeUndefined();
    expect(copy.skippedPhotos).toBe(0);
  });
  it('zdjęcia bez bajtów w telefonie są pomijane i liczone', () => {
    const copy = copyGrave(grave(), (id) => id === 'f2', newId);
    expect(copy.grave.photos).toHaveLength(1);
    expect(copy.skippedPhotos).toBe(1);
  });
  it('pominięte główne zdjęcie → główne staje się pierwsze pozostałe', () => {
    const copy = copyGrave(grave(), (id) => id === 'f2', newId);
    expect(copy.grave.photos[0].isPrimary).toBe(true);
  });
  it('zdjęcie z adresem internetowym nie potrzebuje bajtów', () => {
    const g = grave();
    g.photos = [{ id: 'f9', url: 'https://example.com/a.jpg', isPrimary: true, graveId: 'g1', uploadedAt: 'x' }];
    const copy = copyGrave(g, () => false, newId);
    expect(copy.grave.photos).toHaveLength(1);
    expect(copy.photoIds).toEqual([]);
  });
  it('nie zmienia źródła', () => {
    const g = grave();
    copyGrave(g, () => true, newId);
    expect(g.id).toBe('g1');
    expect(g.photos[0].id).toBe('f1');
  });
});
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npx ng test --watch=false --include src/app/shared/utils/grave-transfer.spec.ts` → FAIL.

- [ ] **Step 3: Implementacja**

```ts
import { Grave, PhotoVariant } from '../models/grave.model';
import { LOCAL_SPACE_ID } from '../models/space.model';

/** Wpis do kolejki synchronizacji wynikający z przeniesienia grobu. */
export type QueueOp =
  | { table: 'grave'; spaceId: string; id: string; op: 'put' | 'delete' }
  | { table: 'photo'; spaceId: string; photoId: string; variant: PhotoVariant | null; op: 'put' | 'delete' };

const isRemoteUrl = (url: string) => /^(https?:|data:)/.test(url);

/**
 * Przeniesienie grobu (ten sam id) z mapy `from` na `to`: na starej mapie usunięcie,
 * na nowej zapis. „Moje" nie ma kolejek — tam nic nie wysyłamy.
 */
export function moveQueueOps(grave: Grave, from: string, to: string): QueueOp[] {
  const ops: QueueOp[] = [];
  if (from === to) return ops;
  if (from !== LOCAL_SPACE_ID) {
    ops.push({ table: 'grave', spaceId: from, id: grave.id, op: 'delete' });
    for (const photo of grave.photos) {
      ops.push({ table: 'photo', spaceId: from, photoId: photo.id, variant: null, op: 'delete' });
    }
  }
  if (to !== LOCAL_SPACE_ID) {
    ops.push({ table: 'grave', spaceId: to, id: grave.id, op: 'put' });
    for (const photo of grave.photos) {
      for (const variant of ['full', 'thumb'] as const) {
        ops.push({ table: 'photo', spaceId: to, photoId: photo.id, variant, op: 'put' });
      }
    }
  }
  return ops;
}

export interface GraveCopy {
  grave: Grave;
  /** Pary [stare id zdjęcia, nowe id] — bajty do skopiowania w telefonie. */
  photoIds: [string, string][];
  /** Zdjęcia pominięte, bo telefon nie ma ich bajtów. */
  skippedPhotos: number;
}

/**
 * Kopia grobu na inną mapę: nowe id grobu, osób i zdjęć, żeby usunięcie w jednej mapie
 * nie skasowało niczego w drugiej. Zdjęcia bez bajtów w telefonie pomijamy.
 */
export function copyGrave(
  grave: Grave,
  hasBytes: (photoId: string) => boolean,
  newId: () => string = () => crypto.randomUUID(),
  now: string = new Date().toISOString()
): GraveCopy {
  const id = newId();
  const kept = grave.photos.filter((p) => isRemoteUrl(p.url) || hasBytes(p.id));
  const photoIds: [string, string][] = [];
  let photos = kept.map((p) => {
    const photoId = newId();
    if (!isRemoteUrl(p.url)) photoIds.push([p.id, photoId]);
    return { ...p, id: photoId, graveId: id };
  });
  if (photos.length > 0 && !photos.some((p) => p.isPrimary)) {
    photos = photos.map((p, i) => ({ ...p, isPrimary: i === 0 }));
  }
  const { updatedBy: _updatedBy, ...rest } = grave;
  return {
    grave: {
      ...rest,
      id,
      deceasedPersons: grave.deceasedPersons.map((p) => ({ ...p, id: newId(), graveId: id })),
      photos,
      updatedAt: now,
    },
    photoIds,
    skippedPhotos: grave.photos.length - kept.length,
  };
}
```

- [ ] **Step 4: Testy przechodzą**

Run: jak w Step 2 → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/utils
git commit -m "feat: logika przenoszenia i kopiowania grobu między mapami"
```

### Task B4: Lokalna baza wielu map i synchronizacja per mapa

Po tym tasku aplikacja działa jak dziś (obecny UI bez zmian), ale dane są podzielone na mapy, synchronizacja idzie osobno dla każdej mapy, a dołączenie z linku **nie wysyła** grobów z „Moje". Obecne ekrany korzystają z warstwy zgodności w `FamilySyncService` (usuwanej w B6/B7).

**Files:**
- Create: `src/app/core/services/storage.ts`, `src/app/core/services/family-api.ts`, `src/app/core/services/space.service.ts`
- Modify (przepisanie): `src/app/core/services/indexeddb.service.ts`, `src/app/core/services/family-sync.service.ts`
- Modify: `src/app/features/graves/services/grave.service.ts`, `src/app/core/services/backup.service.ts`, `src/app/core/services/photo.service.ts`

**Interfaces:**
- Consumes: B1 (`LocalSpace`, `credentialOf`, `isShared`, `newSharedSpace`, `LOCAL_SPACE_ID`, `Member`, `Profile`), B2 (`planSpaceMigration`, `readLegacyFamily`, `LEGACY_KEYS`, `decideRemoteChange`), B3 (`moveQueueOps`, `copyGrave`, `QueueOp`); kontrakty HTTP z A2/A3.
- Produces:
  - `storage.ts`: `readStorage(key)`, `writeStorage(key, value)`, `removeStorage(key)`.
  - `IndexedDbService`: `ACTIVE_SPACE_KEY`; `ensureLocalSpace()`, `getSpaces()`, `putSpace(space)`, `updateSpace(id, changes)`; `getGraves(spaceId)`, `graveIds(spaceId)`, `allGraveIds()`, `getGrave(id)`, `getGraveSpaceId(id)`, `getGraveForSync(id, spaceId)`, `addGrave(grave, spaceId)`, `updateGrave(id, changes)`, `deleteGrave(id)`, `clearAll(spaceId)`, `countBySpace()`; `getGraveQueue(spaceId, limit)`, `removeFromGraveQueue(sent)`, `queueCount(spaceId)`; `applyRemoteChanges(spaceId, changes)`; `getPhotoBlob(photoId, variant)`, `hasPhotoBlob(photoId, variant)`, `putPhotoBlob(photoId, variant, blob, uploadTo: string | null)`, `deletePhoto(photoId, spaceId)`, `getPhotoQueue(spaceId, limit)`, `removeFromPhotoQueue(sent)`; `moveGraves(ids, to)`, `copyGraveTo(id, to)`, `reassignSpace(from, to)`, `deleteSpaceData(spaceId)`; sygnał `localChanges`.
  - `FamilyApi`: `ApiError(status, message, code?)`, `request<T>(method, path, token, body?)`, `send(method, path, token, body?)`, `photo(token, photoId, variant)`, `pull`, `push`, `createSpace(name, profile)`, `preview(invite)`, `join(invite, profile)`, `spaceInfo(token)`, `members(token)`, `updateMe(token, profile)`, `leave(token)`, `rename(token, name)`, `rotate(token)`, `removeMember(token, id)`, `transferOwner(token, id)`, `deleteSpace(token)`; typy `InvitePreview`, `JoinResult`, `CreatedSpace`.
  - `SpaceService`: sygnały `spaces`, `activeSpaceId`, `activeSpace`, `sharedSpaces`, `readOnly`; `ready: Promise<void>`; `reload()`, `setActive(id)`, `update(id, changes)`, `add(space)`, `createLegacy()` (do B6), `addFromInvite(invite)` (do B5), `rotateInvite(space)`, `shareInvite(space)`, `forget(spaceId, keep)`.
  - `FamilySyncService`: `SyncState`, `SpaceSync`, `syncOf(spaceId)`, `status`, `photoWarning`, `sync()`, `fetchPhoto(spaceId, photoId, variant)`; warstwa zgodności `connected`, `state`, `pending`, `errorMessage`, `lastSyncAt`, `token`, `shareLink`, `createSpace()`, `preview(token)`, `join(token)`, `rotateLink()`, `leave()`, `shareInvite()`.
  - `GraveService`: ładuje groby aktywnej mapy; `readOnly`; zapisy rzucają błąd na mapie tylko do odczytu.

- [ ] **Step 1: `storage.ts`**

```ts
/** `localStorage` bywa niedostępny (tryb prywatny, zablokowane dane) — wtedy działamy bez niego. */
export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // bez localStorage ustawienie działa do zamknięcia karty
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2: `indexeddb.service.ts` — przepisz w całości**

```ts
import { Injectable, signal } from '@angular/core';
import Dexie, { Table } from 'dexie';

import { Grave } from '../../shared/models/grave.model';
import type { PhotoVariant } from '../../shared/models/grave.model';
import { LOCAL_SPACE_ID, LocalSpace, localSpace } from '../../shared/models/space.model';
import { planSpaceMigration, readLegacyFamily } from '../../shared/utils/space-migration';
import { decideRemoteChange } from '../../shared/utils/remote-change';
import { QueueOp, copyGrave, moveQueueOps } from '../../shared/utils/grave-transfer';

export type { PhotoVariant } from '../../shared/models/grave.model';

export interface LocalGrave extends Grave {
  localId?: number;
  /** Mapa, do której należy grób (`local` = „Moje"). */
  spaceId: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

/**
 * Kolejka zmian grobów do wysłania na rodzinną mapę. Jeden wpis na grób i mapę — liczy się
 * ostatnia operacja; treść grobu czytamy z tabeli `graves` dopiero przy wysyłce.
 */
export interface GraveQueueEntry {
  spaceId: string;
  id: string;
  op: 'put' | 'delete';
  queuedAt: number;
}

/** Bajty zdjęcia trzymane w telefonie — dzięki temu zdjęcia działają bez zasięgu. */
export interface PhotoBlobEntry {
  key: string; // `${photoId}:${variant}`
  blob: Blob;
  cachedAt: number;
}

/** Kolejka wysyłki/usunięcia bajtów zdjęć na rodzinną mapę. */
export interface PhotoQueueEntry {
  spaceId: string;
  key: string; // `${photoId}:${variant}` albo `${photoId}:delete`
  photoId: string;
  variant: PhotoVariant | null;
  op: 'put' | 'delete';
  queuedAt: number;
}

/** Zmiana pobrana z serwera (rodzinnej mapy). */
export interface RemoteChange {
  id: string;
  deleted: boolean;
  data: Grave | null;
  updatedBy?: string | null;
}

/** Aktywna mapa — zapisuje ją migracja v4, czyta `SpaceService`. */
export const ACTIVE_SPACE_KEY = 'gravemap-active-space';

const synced = (spaceId: string) => spaceId !== LOCAL_SPACE_ID;
const stamp = () => Date.now() + Math.random();

function toGrave(row: LocalGrave): Grave {
  const { localId, syncStatus, spaceId, ...grave } = row;
  return grave;
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService extends Dexie {
  graves!: Table<LocalGrave, string>;
  spaces!: Table<LocalSpace, string>;
  graveQueue!: Table<GraveQueueEntry, [string, string]>;
  photoBlobs!: Table<PhotoBlobEntry, string>;
  photoQueue!: Table<PhotoQueueEntry, [string, string]>;

  /** Rośnie przy każdej lokalnej zmianie — sygnał dla synchronizacji. */
  readonly localChanges = signal(0);

  constructor() {
    super('GraveMapDB');

    this.version(1).stores({
      graves: 'id, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
    });
    // v2: kolejka zmian dla rodzinnej mapy
    this.version(2).stores({
      graves: 'id, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
      outbox: 'id, queuedAt',
    });
    // v3: zdjęcia (bajty w telefonie) i ich kolejka wysyłki
    this.version(3).stores({
      graves: 'id, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
      outbox: 'id, queuedAt',
      photoBlobs: 'key',
      photoOutbox: 'key, queuedAt',
    });
    // v4: wiele map w jednym telefonie. Kolejki mają klucz złożony [mapa+id] — przeniesiony
    // grób ma naraz „usuń" w starej mapie i „zapisz" w nowej. Dexie nie zmienia klucza
    // istniejącej tabeli, więc kolejki to nowe tabele; stare usuwa v5.
    this.version(4)
      .stores({
        graves: 'id, spaceId, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
        outbox: 'id, queuedAt',
        photoBlobs: 'key',
        photoOutbox: 'key, queuedAt',
        spaces: 'id, serverId',
        graveQueue: '[spaceId+id], spaceId, queuedAt',
        photoQueue: '[spaceId+key], spaceId, queuedAt',
      })
      .upgrade(async (tx) => {
        const plan = planSpaceMigration(readLegacyFamily(safeStorage()));
        await tx.table('spaces').bulkPut(plan.spaces);
        await tx
          .table('graves')
          .toCollection()
          .modify((g: LocalGrave) => {
            g.spaceId = plan.targetSpaceId;
          });
        if (plan.keepQueues) {
          const graves = await tx.table('outbox').toArray();
          await tx.table('graveQueue').bulkPut(graves.map((e) => ({ ...e, spaceId: plan.targetSpaceId })));
          const photos = await tx.table('photoOutbox').toArray();
          await tx.table('photoQueue').bulkPut(photos.map((e) => ({ ...e, spaceId: plan.targetSpaceId })));
        }
        try {
          safeStorage()?.setItem(ACTIVE_SPACE_KEY, plan.targetSpaceId);
        } catch {
          // bez localStorage aktywna będzie „Moje"
        }
      });
    // v5: kolejki przeniesione w v4
    this.version(5).stores({ outbox: null, photoOutbox: null });

    // Świeża instalacja: od razu „Moje"
    this.on('populate', (tx) => {
      tx.table('spaces').add(localSpace());
    });
  }

  // --- Mapy ----------------------------------------------------------------

  async ensureLocalSpace(): Promise<void> {
    if (!(await this.spaces.get(LOCAL_SPACE_ID))) await this.spaces.put(localSpace());
  }

  getSpaces(): Promise<LocalSpace[]> {
    return this.spaces.toArray();
  }

  async putSpace(space: LocalSpace): Promise<void> {
    await this.spaces.put(space);
  }

  async updateSpace(id: string, changes: Partial<LocalSpace>): Promise<void> {
    await this.spaces.update(id, changes);
  }

  // --- Groby ---------------------------------------------------------------

  async getGraves(spaceId: string): Promise<Grave[]> {
    return (await this.graves.where('spaceId').equals(spaceId).toArray()).map(toGrave);
  }

  async graveIds(spaceId: string): Promise<string[]> {
    return (await this.graves.where('spaceId').equals(spaceId).primaryKeys()) as string[];
  }

  /** Id wszystkich grobów w telefonie (klucz grobu jest wspólny dla wszystkich map). */
  async allGraveIds(): Promise<Set<string>> {
    return new Set((await this.graves.toCollection().primaryKeys()) as string[]);
  }

  async countBySpace(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    await this.graves.each((g) => {
      counts[g.spaceId] = (counts[g.spaceId] ?? 0) + 1;
    });
    return counts;
  }

  async getGrave(id: string): Promise<Grave | undefined> {
    const row = await this.graves.get(id);
    return row ? toGrave(row) : undefined;
  }

  async getGraveSpaceId(id: string): Promise<string | undefined> {
    return (await this.graves.get(id))?.spaceId;
  }

  /** Grób do wysłania na mapę `spaceId`; undefined, gdy grobu nie ma albo jest już na innej mapie. */
  async getGraveForSync(id: string, spaceId: string): Promise<Grave | undefined> {
    const row = await this.graves.get(id);
    if (!row || row.spaceId !== spaceId) return undefined;
    const { updatedBy, ...grave } = toGrave(row);
    return grave;
  }

  async addGrave(grave: Grave, spaceId: string): Promise<string> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      await this.graves.add({ ...grave, spaceId, syncStatus: 'pending' });
      await this.queueGrave(spaceId, grave.id, 'put');
    });
    this.notifyChange();
    return grave.id;
  }

  async updateGrave(id: string, changes: Partial<Grave>): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      const row = await this.graves.get(id);
      if (!row) return;
      await this.graves.update(id, {
        ...changes,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      });
      await this.queueGrave(row.spaceId, id, 'put');
    });
    this.notifyChange();
  }

  async deleteGrave(id: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      const row = await this.graves.get(id);
      if (!row) return;
      await this.graves.delete(id);
      await this.queueGrave(row.spaceId, id, 'delete');
    });
    this.notifyChange();
  }

  /**
   * Czyści groby jednej mapy. Na rodzinnej mapie usunięcia trafiają do kolejki —
   * „zastąp wszystko z pliku" działa wtedy dla całej rodziny.
   */
  async clearAll(spaceId: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      const ids = await this.graveIds(spaceId);
      await this.graves.bulkDelete(ids);
      for (const id of ids) await this.queueGrave(spaceId, id, 'delete');
    });
    this.notifyChange();
  }

  // --- Kolejki (rodzinne mapy) -------------------------------------------

  async getGraveQueue(spaceId: string, limit: number): Promise<GraveQueueEntry[]> {
    return (await this.graveQueue.where('spaceId').equals(spaceId).sortBy('queuedAt')).slice(0, limit);
  }

  /** Zdejmuje wysłane wpisy — tylko te, których nikt w międzyczasie nie zmienił. */
  async removeFromGraveQueue(sent: GraveQueueEntry[]): Promise<void> {
    await this.transaction('rw', this.graveQueue, async () => {
      for (const entry of sent) {
        const current = await this.graveQueue.get([entry.spaceId, entry.id]);
        if (current && current.queuedAt === entry.queuedAt) {
          await this.graveQueue.delete([entry.spaceId, entry.id]);
        }
      }
    });
  }

  async queueCount(spaceId: string): Promise<number> {
    const graves = await this.graveQueue.where('spaceId').equals(spaceId).count();
    const photos = await this.photoQueue.where('spaceId').equals(spaceId).count();
    return graves + photos;
  }

  /** Nakłada zmiany pobrane z mapy `spaceId` (zasady w `decideRemoteChange`). */
  async applyRemoteChanges(spaceId: string, changes: RemoteChange[]): Promise<boolean> {
    let touched = false;
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      for (const change of changes) {
        const local = await this.graves.get(change.id);
        const queued = !!(await this.graveQueue.get([spaceId, change.id]));
        const action = decideRemoteChange(spaceId, change, local, queued);
        if (action === 'delete') await this.graves.delete(change.id);
        if (action === 'put' && change.data) {
          await this.graves.put({
            ...change.data,
            updatedBy: change.updatedBy ?? null,
            spaceId,
            syncStatus: 'synced',
          });
        }
        if (action !== 'skip') touched = true;
      }
    });
    return touched;
  }

  // --- Zdjęcia -------------------------------------------------------------

  async getPhotoBlob(photoId: string, variant: PhotoVariant): Promise<Blob | undefined> {
    return (await this.photoBlobs.get(`${photoId}:${variant}`))?.blob;
  }

  async hasPhotoBlob(photoId: string, variant: PhotoVariant): Promise<boolean> {
    return (await this.photoBlobs.where('key').equals(`${photoId}:${variant}`).count()) > 0;
  }

  /** Zapisuje bajty zdjęcia; `uploadTo` = mapa, na którą je wysłać (null = tylko w telefonie). */
  async putPhotoBlob(
    photoId: string,
    variant: PhotoVariant,
    blob: Blob,
    uploadTo: string | null
  ): Promise<void> {
    await this.transaction('rw', this.photoBlobs, this.photoQueue, async () => {
      await this.photoBlobs.put({ key: `${photoId}:${variant}`, blob, cachedAt: Date.now() });
      if (uploadTo) await this.queuePhoto(uploadTo, photoId, variant, 'put');
    });
    if (uploadTo && synced(uploadTo)) this.notifyChange();
  }

  /** Usuwa bajty zdjęcia z telefonu i zleca usunięcie z mapy grobu. */
  async deletePhoto(photoId: string, spaceId: string): Promise<void> {
    await this.transaction('rw', this.photoBlobs, this.photoQueue, async () => {
      await this.photoBlobs.bulkDelete([`${photoId}:full`, `${photoId}:thumb`]);
      await this.queuePhoto(spaceId, photoId, null, 'delete');
    });
    this.notifyChange();
  }

  async getPhotoQueue(spaceId: string, limit: number): Promise<PhotoQueueEntry[]> {
    return (await this.photoQueue.where('spaceId').equals(spaceId).sortBy('queuedAt')).slice(0, limit);
  }

  async removeFromPhotoQueue(sent: PhotoQueueEntry[]): Promise<void> {
    await this.transaction('rw', this.photoQueue, async () => {
      for (const entry of sent) {
        const current = await this.photoQueue.get([entry.spaceId, entry.key]);
        if (current && current.queuedAt === entry.queuedAt) {
          await this.photoQueue.delete([entry.spaceId, entry.key]);
        }
      }
    });
  }

  // --- Przenoszenie, kopie, porzucanie map --------------------------------

  /** Przenosi groby (te same id) na mapę `to`, z wpisami do kolejek obu map. */
  async moveGraves(ids: string[], to: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, this.photoQueue, async () => {
      for (const id of ids) {
        const row = await this.graves.get(id);
        if (!row || row.spaceId === to) continue;
        await this.applyQueueOps(moveQueueOps(toGrave(row), row.spaceId, to));
        await this.graves.update(id, { spaceId: to, updatedBy: null, syncStatus: 'pending' });
      }
    });
    this.notifyChange();
  }

  /** Kopia grobu na mapę `to` z nowymi id; zdjęcia bez bajtów w telefonie są pomijane. */
  async copyGraveTo(id: string, to: string): Promise<{ id: string; skippedPhotos: number }> {
    const row = await this.graves.get(id);
    if (!row) throw new Error('Nie znaleziono grobu');
    const blobKeys = new Set((await this.photoBlobs.toCollection().primaryKeys()) as string[]);
    const copy = copyGrave(toGrave(row), (photoId) => blobKeys.has(`${photoId}:full`));

    await this.transaction('rw', [this.graves, this.graveQueue, this.photoBlobs, this.photoQueue], async () => {
      await this.graves.add({ ...copy.grave, spaceId: to, syncStatus: 'pending' });
      await this.queueGrave(to, copy.grave.id, 'put');
      for (const [fromId, toId] of copy.photoIds) {
        for (const variant of ['full', 'thumb'] as const) {
          const blob = (await this.photoBlobs.get(`${fromId}:${variant}`))?.blob;
          if (!blob) continue;
          await this.photoBlobs.put({ key: `${toId}:${variant}`, blob, cachedAt: Date.now() });
          await this.queuePhoto(to, toId, variant, 'put');
        }
      }
    });
    this.notifyChange();
    return { id: copy.grave.id, skippedPhotos: copy.skippedPhotos };
  }

  /** Przenosi wszystkie groby mapy `from` do `to` BEZ wysyłania (kopia po wyjściu z mapy). */
  async reassignSpace(from: string, to: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, this.photoQueue, async () => {
      await this.graves.where('spaceId').equals(from).modify({ spaceId: to, updatedBy: null });
      await this.clearQueues(from);
    });
    this.notifyChange();
  }

  /** Usuwa z telefonu mapę, jej groby, bajty ich zdjęć i kolejki. */
  async deleteSpaceData(spaceId: string): Promise<void> {
    await this.transaction(
      'rw',
      [this.graves, this.photoBlobs, this.graveQueue, this.photoQueue, this.spaces],
      async () => {
        const rows = await this.graves.where('spaceId').equals(spaceId).toArray();
        const photoKeys = rows.flatMap((g) => g.photos.flatMap((p) => [`${p.id}:full`, `${p.id}:thumb`]));
        await this.photoBlobs.bulkDelete(photoKeys);
        await this.graves.bulkDelete(rows.map((g) => g.id));
        await this.clearQueues(spaceId);
        await this.spaces.delete(spaceId);
      }
    );
    this.notifyChange();
  }

  // --- Wewnętrzne ----------------------------------------------------------

  private async applyQueueOps(ops: QueueOp[]): Promise<void> {
    for (const op of ops) {
      if (op.table === 'grave') await this.queueGrave(op.spaceId, op.id, op.op);
      else await this.queuePhoto(op.spaceId, op.photoId, op.variant, op.op);
    }
  }

  private async clearQueues(spaceId: string): Promise<void> {
    await this.graveQueue.where('spaceId').equals(spaceId).delete();
    await this.photoQueue.where('spaceId').equals(spaceId).delete();
  }

  private async queueGrave(spaceId: string, id: string, op: GraveQueueEntry['op']): Promise<void> {
    if (!synced(spaceId)) return;
    await this.graveQueue.put({ spaceId, id, op, queuedAt: stamp() });
  }

  private async queuePhoto(
    spaceId: string,
    photoId: string,
    variant: PhotoVariant | null,
    op: PhotoQueueEntry['op']
  ): Promise<void> {
    if (!synced(spaceId)) return;
    if (op === 'delete') {
      // Niewysłane bajty usuwanego zdjęcia nie mają już sensu
      await this.photoQueue.bulkDelete([
        [spaceId, `${photoId}:full`],
        [spaceId, `${photoId}:thumb`],
      ]);
    }
    const key = variant ? `${photoId}:${variant}` : `${photoId}:delete`;
    await this.photoQueue.put({ spaceId, key, photoId, variant, op, queuedAt: stamp() });
  }

  private notifyChange(): void {
    this.localChanges.update((n) => n + 1);
  }
}
```

- [ ] **Step 3: `family-api.ts`**

```ts
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Grave, PhotoVariant } from '../../shared/models/grave.model';
import { Member, Profile, SpaceRole } from '../../shared/models/space.model';
import { RemoteChange } from './indexeddb.service';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Kod z serwera, np. `member_removed`. */
    readonly code?: string
  ) {
    super(message);
  }
}

export interface InvitePreview {
  spaceId: string;
  name: string;
  graves: number;
  members: { name: string; color: string }[];
}

export interface JoinResult {
  spaceId: string;
  name: string;
  memberToken: string;
  memberId: string;
  role: SpaceRole;
}

export interface CreatedSpace extends JoinResult {
  invite: string;
}

export interface PullResponse {
  rev: number;
  more: boolean;
  changes: RemoteChange[];
}

export type OutgoingChange = { id: string; deleted: false; data: Grave } | { id: string; deleted: true };

/** Klient API rodzinnych map (grave-app/worker). Każde wywołanie dostaje klucz mapy jawnie. */
@Injectable({ providedIn: 'root' })
export class FamilyApi {
  private readonly base = environment.apiUrl;

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    token: string | null,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) throw new ApiError(res.status, payload.error ?? 'Błąd serwera', payload.code);
    return payload as T;
  }

  /** Zapytanie z surowym ciałem (bajty zdjęcia) albo bez ciała. */
  async send(method: 'PUT' | 'DELETE', path: string, token: string, body?: Blob): Promise<void> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body) headers['Content-Type'] = body.type || 'image/jpeg';
    const res = await fetch(this.base + path, { method, headers, body });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      throw new ApiError(res.status, payload.error ?? 'Błąd serwera', payload.code);
    }
  }

  async photo(token: string, photoId: string, variant: PhotoVariant): Promise<Blob | null> {
    const res = await fetch(`${this.base}/photos/${encodeURIComponent(photoId)}?variant=${variant}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok ? res.blob() : null;
  }

  pull(token: string, since: number): Promise<PullResponse> {
    return this.request('GET', `/changes?since=${since}`, token);
  }

  push(token: string, changes: OutgoingChange[]): Promise<{ rev: number }> {
    return this.request('POST', '/changes', token, { changes });
  }

  createSpace(name: string, member: Profile): Promise<CreatedSpace> {
    return this.request('POST', '/spaces', null, { name, member });
  }

  preview(invite: string): Promise<InvitePreview> {
    return this.request('GET', '/invite', invite);
  }

  join(invite: string, profile: Profile): Promise<JoinResult> {
    return this.request('POST', '/join', invite, profile);
  }

  spaceInfo(token: string): Promise<{ spaceId: string; name: string; graves: number; me: { id: string; role: SpaceRole } | null }> {
    return this.request('GET', '/space', token);
  }

  async members(token: string): Promise<Member[]> {
    return (await this.request<{ members: Member[] }>('GET', '/members', token)).members;
  }

  updateMe(token: string, profile: Partial<Profile>): Promise<Profile> {
    return this.request('PATCH', '/me', token, profile);
  }

  leave(token: string): Promise<unknown> {
    return this.request('POST', '/space/leave', token);
  }

  rename(token: string, name: string): Promise<{ name: string }> {
    return this.request('PATCH', '/space', token, { name });
  }

  rotate(token: string): Promise<{ invite: string }> {
    return this.request('POST', '/space/rotate', token);
  }

  removeMember(token: string, memberId: string): Promise<unknown> {
    return this.request('DELETE', `/members/${encodeURIComponent(memberId)}`, token);
  }

  transferOwner(token: string, memberId: string): Promise<unknown> {
    return this.request('POST', `/members/${encodeURIComponent(memberId)}/owner`, token);
  }

  deleteSpace(token: string): Promise<unknown> {
    return this.request('DELETE', '/space', token);
  }
}
```

- [ ] **Step 4: `space.service.ts`**

```ts
import { Injectable, computed, inject, signal } from '@angular/core';

import { ACTIVE_SPACE_KEY, IndexedDbService } from './indexeddb.service';
import { FamilyApi } from './family-api';
import { readStorage, removeStorage, writeStorage } from './storage';
import {
  LOCAL_SPACE_ID,
  LocalSpace,
  credentialOf,
  isShared,
  newSharedSpace,
} from '../../shared/models/space.model';
import { LEGACY_KEYS } from '../../shared/utils/space-migration';

/**
 * Mapy zapamiętane w tym telefonie i to, która jest aktywna. Groby, lista i mapa
 * pokazują wyłącznie aktywną mapę; nowy grób trafia do niej.
 */
@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly db = inject(IndexedDbService);
  private readonly api = inject(FamilyApi);

  /** „Moje" pierwsza, potem rodzinne w kolejności dodania. */
  readonly spaces = signal<LocalSpace[]>([]);
  readonly activeSpaceId = signal<string>(readStorage(ACTIVE_SPACE_KEY) ?? LOCAL_SPACE_ID);
  readonly activeSpace = computed(
    () => this.spaces().find((s) => s.id === this.activeSpaceId()) ?? null
  );
  readonly sharedSpaces = computed(() => this.spaces().filter(isShared));
  /** Aktywna mapa jest tylko do odczytu — założyciel usunął z niej ten telefon. */
  readonly readOnly = computed(() => this.activeSpace()?.status === 'removed');

  readonly ready: Promise<void> = this.load();

  private async load(): Promise<void> {
    // Pierwsze zapytanie otwiera bazę — wtedy biegnie migracja v4 (czyta dawne klucze)
    await this.db.ensureLocalSpace();
    await this.reload();
    const stored = readStorage(ACTIVE_SPACE_KEY);
    this.activeSpaceId.set(this.spaces().some((s) => s.id === stored) ? stored! : LOCAL_SPACE_ID);
    for (const key of Object.values(LEGACY_KEYS)) removeStorage(key);
  }

  async reload(): Promise<void> {
    const list = await this.db.getSpaces();
    this.spaces.set(list.sort((a, b) => a.createdAt - b.createdAt));
  }

  setActive(id: string): void {
    if (!this.spaces().some((s) => s.id === id)) return;
    this.activeSpaceId.set(id);
    writeStorage(ACTIVE_SPACE_KEY, id);
  }

  async update(id: string, changes: Partial<LocalSpace>): Promise<void> {
    await this.db.updateSpace(id, changes);
    await this.reload();
  }

  async add(space: LocalSpace): Promise<void> {
    await this.db.putSpace(space);
    await this.reload();
  }

  /** Zakładanie mapy bez podpisu (stary ekran Ustawień). Usuwane w Task B6. */
  async createLegacy(): Promise<void> {
    const res = await this.api.request<{ token: string }>('POST', '/spaces', null);
    const space = newSharedSpace({ name: 'Rodzinna mapa', inviteToken: res.token, status: 'needs-profile' });
    await this.add(space);
    await this.db.moveGraves(await this.db.graveIds(LOCAL_SPACE_ID), space.id);
    this.setActive(space.id);
  }

  /** Dołączenie bez podpisu (stary ekran dołączania). Usuwane w Task B5. */
  async addFromInvite(invite: string): Promise<void> {
    const existing = this.spaces().find((s) => s.inviteToken === invite && s.status !== 'removed');
    if (existing) {
      this.setActive(existing.id);
      return;
    }
    const space = newSharedSpace({ name: 'Rodzinna mapa', inviteToken: invite, status: 'needs-profile' });
    await this.add(space);
    this.setActive(space.id);
  }

  /** Nowy link zaproszenia; dołączeni członkowie działają dalej. */
  async rotateInvite(space: LocalSpace): Promise<void> {
    const token = credentialOf(space);
    if (!token) throw new Error('Brak dostępu do tej mapy');
    const res = await this.api.rotate(token);
    await this.update(space.id, { inviteToken: res.invite });
  }

  /** Systemowe „Udostępnij" z linkiem zaproszenia albo kopia do schowka. */
  async shareInvite(space: LocalSpace): Promise<'shared' | 'copied' | 'cancelled'> {
    if (!space.inviteToken) throw new Error('Ten telefon nie zna linku do tej mapy.');
    if (navigator.onLine) {
      // Po zmianie linku przez założyciela zapamiętany link jest martwy — nie wysyłajmy go
      await this.api.preview(space.inviteToken).catch((err) => {
        if (err?.status === 401) {
          throw new Error('Link zaproszenia został zmieniony. Aktualny ma założyciel mapy.');
        }
      });
    }
    const url = `${location.origin}/rodzina#${space.inviteToken}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: space.name,
          text: `Dołącz do mapy grobów „${space.name}" w GraveMap:`,
          url,
        });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      }
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  }

  /** Usuwa mapę z telefonu; `keep` = groby zostają jako kopia w „Moje". */
  async forget(spaceId: string, keep: boolean): Promise<void> {
    if (keep) await this.db.reassignSpace(spaceId, LOCAL_SPACE_ID);
    await this.db.deleteSpaceData(spaceId);
    if (this.activeSpaceId() === spaceId) this.setActive(LOCAL_SPACE_ID);
    await this.reload();
  }
}
```

- [ ] **Step 5: `family-sync.service.ts` — przepisz w całości**

```ts
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { IndexedDbService, PhotoVariant } from './indexeddb.service';
import { ApiError, FamilyApi, OutgoingChange } from './family-api';
import { SpaceService } from './space.service';
import { GraveService } from '../../features/graves/services/grave.service';
import { LocalSpace, credentialOf, isShared } from '../../shared/models/space.model';

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'revoked' | 'removed';

export interface SpaceSync {
  state: SyncState;
  error: string | null;
  pending: number;
}

const PUSH_BATCH = 100;
const PHOTO_BATCH = 10;
const LOCAL_CHANGE_DELAY_MS = 1500;
const PERIODIC_SYNC_MS = 60_000;
const OFF: SpaceSync = { state: 'off', error: null, pending: 0 };

/**
 * Synchronizacja rodzinnych map. Źródłem prawdy jest serwer (Cloudflare D1); telefon trzyma
 * kopię każdej mapy w IndexedDB i kolejkę własnych zmian. Cykl dla każdej mapy jej kluczem:
 * zdjęcia → groby → pobranie zmian po ostatnim znanym `rev`. Błąd jednej mapy nie zatrzymuje innych.
 */
@Injectable({ providedIn: 'root' })
export class FamilySyncService {
  private readonly db = inject(IndexedDbService);
  private readonly api = inject(FamilyApi);
  private readonly spaces = inject(SpaceService);
  private readonly graveService = inject(GraveService);

  /** Stan synchronizacji każdej mapy (po lokalnym id). */
  readonly status = signal<Record<string, SpaceSync>>({});
  /** Zdjęcie odrzucone przez serwer (np. bezpiecznik limitu) — zostaje tylko w tym telefonie. */
  readonly photoWarning = signal<string | null>(null);

  private running: Promise<void> | null = null;
  private rerun = false;
  private timer?: ReturnType<typeof setTimeout>;

  /** Zmienia się tylko, gdy mapa dochodzi, znika albo dostaje klucz — nie przy każdym `rev`. */
  private readonly syncKey = computed(() =>
    this.spaces
      .spaces()
      .map((s) => `${s.id}:${s.status}:${credentialOf(s) ?? ''}`)
      .join('|')
  );

  constructor() {
    // Każda lokalna zmiana grobu → wyślij po krótkiej chwili (kilka edycji = jedna paczka)
    effect(() => {
      this.db.localChanges();
      untracked(() => {
        this.refreshPending();
        this.schedule(LOCAL_CHANGE_DELAY_MS);
      });
    });
    // Nowa mapa (założona, dołączona, podpisana) → synchronizuj od razu
    effect(() => {
      this.syncKey();
      untracked(() => this.schedule(0));
    });

    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.sync());
    window.addEventListener('offline', () => {
      for (const space of this.spaces.sharedSpaces()) {
        if (credentialOf(space)) this.setStatus(space.id, { state: 'offline' });
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sync();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') this.sync();
    }, PERIODIC_SYNC_MS);
  }

  syncOf(spaceId: string): SpaceSync {
    return this.status()[spaceId] ?? OFF;
  }

  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.runAll().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        this.sync();
      }
    });
    return this.running;
  }

  /** Bajty zdjęcia z mapy; null, gdy brak klucza, internetu albo zdjęcia. */
  async fetchPhoto(spaceId: string, photoId: string, variant: PhotoVariant): Promise<Blob | null> {
    const space = this.spaces.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token || !navigator.onLine) return null;
    return this.api.photo(token, photoId, variant);
  }

  private schedule(delayMs: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), delayMs);
  }

  private async runAll(): Promise<void> {
    await this.spaces.ready;
    let activeTouched = false;
    for (const space of this.spaces.spaces()) {
      if (!credentialOf(space)) continue;
      const touched = await this.runSpace(space);
      if (touched && space.id === this.spaces.activeSpaceId()) activeTouched = true;
    }
    if (activeTouched) await this.graveService.loadGraves();
    await this.prefetchPhotos();
    await this.refreshPending();
  }

  /** Synchronizuje jedną mapę; true, gdy zmieniły się jej groby. */
  private async runSpace(space: LocalSpace): Promise<boolean> {
    const token = credentialOf(space)!;
    if (!navigator.onLine) {
      this.setStatus(space.id, { state: 'offline', error: null });
      return false;
    }
    this.setStatus(space.id, { state: 'syncing', error: null });
    try {
      // Najpierw bajty zdjęć: gdy inny telefon zobaczy grób z nowym zdjęciem,
      // samo zdjęcie musi już być na serwerze.
      await this.pushPhotos(space.id, token);
      await this.push(space.id, token);
      const touched = await this.pull(space, token);
      await this.spaces.update(space.id, { syncedAt: Date.now() });
      this.setStatus(space.id, { state: 'idle', error: null });
      return touched;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'member_removed') {
        await this.spaces.update(space.id, { status: 'removed' });
        this.setStatus(space.id, {
          state: 'removed',
          error: `Nie masz już dostępu do mapy „${space.name}".`,
        });
      } else if (err instanceof ApiError && err.status === 401) {
        this.setStatus(space.id, {
          state: 'revoked',
          error: 'Ten link przestał działać — poproś założyciela mapy o nowy.',
        });
      } else if (err instanceof ApiError) {
        this.setStatus(space.id, { state: 'error', error: err.message });
      } else {
        // fetch rzuca TypeError, gdy nie ma połączenia z serwerem
        this.setStatus(space.id, { state: 'offline', error: null });
      }
      return false;
    }
  }

  private async pushPhotos(spaceId: string, token: string): Promise<void> {
    for (;;) {
      const batch = await this.db.getPhotoQueue(spaceId, PHOTO_BATCH);
      if (batch.length === 0) return;
      for (const entry of batch) {
        const path = `/photos/${encodeURIComponent(entry.photoId)}`;
        if (entry.op === 'delete') {
          await this.api.send('DELETE', path, token);
          continue;
        }
        const blob = entry.variant ? await this.db.getPhotoBlob(entry.photoId, entry.variant) : undefined;
        try {
          if (blob) await this.api.send('PUT', `${path}?variant=${entry.variant}`, token, blob);
        } catch (err) {
          // Odmowa na stałe (limit miejsca, format) nie może blokować synchronizacji grobów
          if (err instanceof ApiError && [413, 415, 429, 507].includes(err.status)) {
            this.photoWarning.set(err.message);
            continue;
          }
          throw err;
        }
      }
      await this.db.removeFromPhotoQueue(batch);
    }
  }

  private async push(spaceId: string, token: string): Promise<void> {
    for (;;) {
      const batch = await this.db.getGraveQueue(spaceId, PUSH_BATCH);
      if (batch.length === 0) return;
      const changes: OutgoingChange[] = [];
      for (const entry of batch) {
        // Grobu nie ma albo jest już na innej mapie → dla tej mapy to usunięcie
        const grave = entry.op === 'put' ? await this.db.getGraveForSync(entry.id, spaceId) : undefined;
        changes.push(grave ? { id: entry.id, deleted: false, data: grave } : { id: entry.id, deleted: true });
      }
      await this.api.push(token, changes);
      await this.db.removeFromGraveQueue(batch);
    }
  }

  private async pull(space: LocalSpace, token: string): Promise<boolean> {
    let since = space.rev;
    let touched = false;
    for (;;) {
      const res = await this.api.pull(token, since);
      if (res.changes.length > 0 && (await this.db.applyRemoteChanges(space.id, res.changes))) {
        touched = true;
      }
      since = res.rev;
      await this.spaces.update(space.id, { rev: since });
      if (!res.more) return touched;
    }
  }

  /** Zdjęcia aktywnej mapy do telefonu — żeby były widoczne na cmentarzu bez zasięgu. */
  private async prefetchPhotos(): Promise<void> {
    const spaceId = this.spaces.activeSpaceId();
    for (const grave of this.graveService.graves()) {
      for (const photo of grave.photos) {
        if (/^(https?:|data:)/.test(photo.url)) continue;
        for (const variant of ['thumb', 'full'] as const) {
          if (await this.db.hasPhotoBlob(photo.id, variant)) continue;
          try {
            const blob = await this.fetchPhoto(spaceId, photo.id, variant);
            if (blob) await this.db.putPhotoBlob(photo.id, variant, blob, null);
          } catch {
            // spróbujemy przy następnej synchronizacji
          }
        }
      }
    }
  }

  private async refreshPending(): Promise<void> {
    for (const space of this.spaces.sharedSpaces()) {
      try {
        this.setStatus(space.id, { pending: await this.db.queueCount(space.id) });
      } catch {
        this.setStatus(space.id, { pending: 0 });
      }
    }
  }

  private setStatus(spaceId: string, patch: Partial<SpaceSync>): void {
    this.status.update((all) => ({ ...all, [spaceId]: { ...(all[spaceId] ?? OFF), ...patch } }));
  }

  // --- Zgodność z obecnymi ekranami (Ustawienia, dołączanie, Start) --------
  // Działa na aktywnej mapie rodzinnej. Usuwane w Task B5 (preview, join), B6 (reszta akcji)
  // i B7 (connected, state, pending, errorMessage, lastSyncAt).

  private readonly current = computed(() => {
    const active = this.spaces.activeSpace();
    return active && isShared(active) ? active : null;
  });
  readonly connected = computed(() => !!this.current());
  readonly state = computed<SyncState>(() => {
    const c = this.current();
    return c ? this.syncOf(c.id).state : 'off';
  });
  readonly pending = computed(() => {
    const c = this.current();
    return c ? this.syncOf(c.id).pending : 0;
  });
  readonly errorMessage = computed(() => {
    const c = this.current();
    return c ? this.syncOf(c.id).error : null;
  });
  readonly lastSyncAt = computed(() => this.current()?.syncedAt ?? null);
  readonly token = computed(() => {
    const c = this.current();
    return c ? credentialOf(c) : null;
  });

  createSpace(): Promise<void> {
    return this.spaces.createLegacy();
  }

  preview(token: string): Promise<{ graves: number }> {
    return this.api.request('GET', '/space', token);
  }

  join(token: string): Promise<void> {
    return this.spaces.addFromInvite(token);
  }

  async rotateLink(): Promise<void> {
    const c = this.current();
    if (c) await this.spaces.rotateInvite(c);
  }

  async leave(): Promise<void> {
    const c = this.current();
    if (c) await this.spaces.forget(c.id, true);
  }

  async shareInvite(): Promise<'shared' | 'copied' | 'cancelled'> {
    const c = this.current();
    return c ? this.spaces.shareInvite(c) : 'cancelled';
  }
}
```

(`shareLink` z obecnej wersji nie jest używany poza serwisem — nie przenoś go.)

- [ ] **Step 6: `GraveService` — aktywna mapa i tylko do odczytu**

W `grave.service.ts`:
- importy: `effect, inject, untracked` z `@angular/core`, `SpaceService` z `../../../core/services/space.service`;
- pole `private readonly spaces = inject(SpaceService);` i `readonly readOnly = computed(() => this.spaces.readOnly());`;
- konstruktor (zamiast `this.loadGraves();`):

```ts
  constructor(private readonly db: IndexedDbService, private readonly http: HttpClient) {
    // Zmiana aktywnej mapy (także po migracji przy starcie) → wczytaj jej groby
    effect(() => {
      this.spaces.activeSpaceId();
      untracked(() => this.loadGraves());
    });
  }
```

- `loadGraves`: `const graves = await this.db.getGraves(this.spaces.activeSpaceId());`
- na początku `addGrave`, `updateGrave`, `deleteGrave` dodaj `this.assertWritable();`, a w `addGrave` zapis: `await this.db.addGrave(newGrave, this.spaces.activeSpaceId());`
- metoda prywatna:

```ts
  /** Mapa, z której usunięto ten telefon, jest tylko do odczytu. */
  private assertWritable(): void {
    if (this.spaces.readOnly()) throw new Error('Ta mapa jest tylko do odczytu');
  }
```

- `markAsVisited` przechodzi przez `updateGrave`, więc też jest blokowane.

- [ ] **Step 7: `BackupService` i `PhotoService`**

`backup.service.ts`: wstrzyknij `SpaceService` (`private readonly spaces = inject(SpaceService);`), w `exportGraves` `const graves = await this.db.getGraves(this.spaces.activeSpaceId());`, a w `importGraves` zastąp blok `if (mode === 'replace') {...} else {...}` tym:

```ts
    const spaceId = this.spaces.activeSpaceId();
    if (mode === 'replace') await this.db.clearAll(spaceId);
    // Id grobu jest wspólne dla wszystkich map w telefonie — grób z innej mapy pomijamy
    const existingIds = await this.db.allGraveIds();
    const { toAdd, skippedExisting } = partitionByExisting(parsed.graves, existingIds);
    for (const grave of toAdd) {
      await this.db.addGrave(grave, spaceId);
    }
    const added = toAdd.length;
```

(usuń deklaracje `let added`/`let skippedExisting` i zwróć `{ added, skippedExisting, skippedInvalid: parsed.skippedInvalid }`). Zaktualizuj komentarz metody: „`merge` pomija istniejące po id; `replace` czyści groby aktywnej mapy".

`photo.service.ts`: wstrzyknij `SpaceService`; w `url()` pobranie z mapy:

```ts
        blob =
          (await this.family
            .fetchPhoto(this.spaces.activeSpaceId(), photo.id, variant)
            .catch(() => null)) ?? undefined;
        if (blob) await this.db.putPhotoBlob(photo.id, variant, blob, null);
```

w `addPhoto` przed zapisem bajtów `const spaceId = (await this.db.getGraveSpaceId(graveId))!;` i `putPhotoBlob(photoId, 'full', full, spaceId)` / `putPhotoBlob(photoId, 'thumb', thumb, spaceId)`; w `removePhoto` po `updateGrave`: `await this.db.deletePhoto(photoId, (await this.db.getGraveSpaceId(graveId)) ?? LOCAL_SPACE_ID);` (import `LOCAL_SPACE_ID`).

- [ ] **Step 8: Build i testy**

Run: `npx ng build` → bez błędów (popraw nazwy, jeśli kompilator wskaże pozostałe wywołania starego API). `npx ng test --watch=false` → PASS.

- [ ] **Step 9: E2E — migracja i działanie jak dawniej**

Przygotowanie: `grave-app-api` uruchomiony (A gotowe, `db:migrate:local`). Zbuduj **starą** wersję w trybie deweloperskim i podaj ją z `grave-app-dist` (ten sam origin 4270 → ta sama IndexedDB):

```bash
git stash -u && git switch main && npx ng build --configuration development && git switch - && git stash pop
```

`preview_start grave-app-dist`, w przeglądarce (izolowany kontekst Playwright albo panel): dodaj formularzem 2 groby, w Ustawieniach „Utwórz rodzinną mapę". Potem zbuduj bieżącą gałąź `npx ng build --configuration development` i przeładuj stronę.

Sprawdź (`browser_evaluate`/`javascript_tool` na `indexedDB` + ekran):
- `GraveMapDB` ma wersję 5 (Dexie mnoży ×10 → `db.version` = 50), tabele `spaces`, `graveQueue`, `photoQueue`, brak `outbox`;
- w `spaces` są `local` i mapa `needs-profile` z `inviteToken`; oba groby mają jej `spaceId`; `localStorage` nie ma `gravemap-family-*`, ma `gravemap-active-space`;
- Start pokazuje oba groby, Ustawienia „Rodzinna mapa — Zsynchronizowano…";
- dodanie grobu → po ~2 s `GET /changes` na lokalnym Workerze (z kluczem z `inviteToken`) zwraca 3 groby.

Drugi kontekst przeglądarki: dodaj 1 grób w „Moje", otwórz `/rodzina#<inviteToken>` → „Dołącz" → po synchronizacji widać 3 groby mapy; grób z „Moje" **nie** pojawił się na serwerze (`GET /changes` nadal 3).

- [ ] **Step 10: Commit**

```bash
git add src
git commit -m "feat: groby i synchronizacja per mapa (Dexie v5), dołączenie nie wysyła grobów"
```

### Task B5: Podpis, dołączanie z linku i okienko po aktualizacji

**Files:**
- Create: `src/app/core/services/profile.ts`, `src/app/shared/components/profile-form.component.ts`, `src/app/features/family/profile-prompt.component.ts`
- Modify (przepisanie): `src/app/features/family/join-family-page.component.ts`
- Modify: `src/app/core/services/space.service.ts`, `src/app/core/services/family-sync.service.ts`, `src/app/app.ts`, `src/app/app.html`

**Interfaces:**
- Consumes: `FamilyApi.preview/join/rename` (B4), `AvatarComponent`, `AvatarStackComponent`, `AVATAR_COLORS`, `AVATAR_COLOR_LABELS`, `colorFor` (B1).
- Produces: `readProfile(): Profile | null`, `writeProfile(p)`; `<app-profile-form [submitLabel] [busyLabel] [nameLabel] [busy] (submitted)>`; `SpaceService.preview(invite)`, `findForInvite(invite, preview)`, `join(invite, preview, profile)`, `completeProfile(spaceId, profile): Promise<SpaceRole>`, `rename(spaceId, name)`; `<app-profile-prompt>`.

- [ ] **Step 1: `profile.ts`**

```ts
import { Profile } from '../../shared/models/space.model';
import { isAvatarColor } from '../../shared/utils/member-display';
import { readStorage, writeStorage } from './storage';

const PROFILE_KEY = 'gravemap-profile';

/** Ostatni podpis z tego telefonu — podpowiedź przy kolejnych mapach. */
export function readProfile(): Profile | null {
  try {
    const parsed = JSON.parse(readStorage(PROFILE_KEY) ?? 'null') as Partial<Profile> | null;
    if (parsed && typeof parsed.name === 'string' && isAvatarColor(parsed.color)) {
      return { name: parsed.name, color: parsed.color };
    }
  } catch {
    // uszkodzony wpis — jak brak
  }
  return null;
}

export function writeProfile(profile: Profile): void {
  writeStorage(PROFILE_KEY, JSON.stringify(profile));
}
```

- [ ] **Step 2: `profile-form.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { AvatarComponent } from './avatar.component';
import { IconComponent } from './icon.component';
import { Profile } from '../models/space.model';
import { AVATAR_COLORS, AVATAR_COLOR_LABELS, AvatarColor, colorFor } from '../utils/member-display';
import { readProfile } from '../../core/services/profile';

/** Podpis tego telefonu na mapie: imię i kolor awatara, z podglądem. */
@Component({
  selector: 'app-profile-form',
  imports: [AvatarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="pf" (submit)="$event.preventDefault(); submit()">
      <div class="pf__row">
        <app-avatar [name]="name().trim() || '?'" [color]="color()" [size]="52" />
        <label class="pf__field">
          <span class="pf__label">{{ nameLabel() }}</span>
          <input
            type="text"
            maxlength="40"
            autocomplete="given-name"
            placeholder="np. Kasia"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </label>
      </div>
      <div class="pf__colors" role="radiogroup" aria-label="Kolor awatara">
        @for (c of colors; track c) {
        <button
          type="button"
          role="radio"
          [class]="'pf__swatch avatar-color--' + c"
          [class.active]="color() === c"
          [attr.aria-checked]="color() === c"
          [attr.aria-label]="labels[c]"
          (click)="pick(c)"
        ></button>
        }
      </div>
      <button type="submit" class="cta" [disabled]="busy() || !valid()">
        {{ busy() ? busyLabel() : submitLabel() }}
        <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
      </button>
    </form>
  `,
  styles: [
    `
      .pf {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .pf__row {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .pf__field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pf__label {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink-muted);
      }
      input {
        height: 48px;
        padding: 0 14px;
        border: 1px solid var(--hairline);
        border-radius: var(--radius-sm);
        background: var(--card);
        color: var(--ink);
        font: inherit;
        font-size: 16px;
      }
      .pf__colors {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pf__swatch {
        width: 36px;
        height: 36px;
        border: 2px solid transparent;
        border-radius: var(--radius-pill);
        cursor: pointer;
        &.active {
          border-color: var(--ink);
        }
      }
    `,
  ],
})
export class ProfileFormComponent {
  readonly submitLabel = input('Dalej');
  readonly busyLabel = input('Zapisuję…');
  readonly nameLabel = input('Jak się podpisać?');
  readonly busy = input(false);
  readonly submitted = output<Profile>();

  readonly colors = AVATAR_COLORS;
  readonly labels = AVATAR_COLOR_LABELS;

  private readonly saved = readProfile();
  readonly name = signal(this.saved?.name ?? '');
  /** Kolor wybrany ręcznie; bez wyboru — stały kolor z imienia. */
  private readonly picked = signal<AvatarColor | null>(this.saved?.color ?? null);
  readonly color = computed(() => this.picked() ?? colorFor(this.name().trim() || '?'));

  readonly valid = computed(() => {
    const chars = [...this.name().replace(/\s+/g, ' ').trim()].length;
    return chars > 0 && chars <= 40;
  });

  pick(color: AvatarColor): void {
    this.picked.set(color);
  }

  submit(): void {
    if (!this.valid() || this.busy()) return;
    this.submitted.emit({ name: this.name().replace(/\s+/g, ' ').trim(), color: this.color() });
  }
}
```

- [ ] **Step 3: `SpaceService` — dołączanie i podpis**

Usuń `addFromInvite`. Dodaj importy `InvitePreview` z `./family-api`, `Profile`, `SpaceRole` z modelu, `writeProfile` z `./profile` i metody:

```ts
  preview(invite: string): Promise<InvitePreview> {
    return this.api.preview(invite);
  }

  /** Mapa z tego zaproszenia, jeśli telefon już ją zna (także sprzed podpisu). */
  findForInvite(invite: string, preview: InvitePreview): LocalSpace | null {
    return (
      this.spaces().find(
        (s) => isShared(s) && (s.serverId === preview.spaceId || s.inviteToken === invite)
      ) ?? null
    );
  }

  /**
   * Dołącza ten telefon do mapy z zaproszenia. Nic nie wysyła — groby z innych map zostają,
   * gdzie były. Telefon usunięty kiedyś z tej mapy dołącza od nowa i pobiera ją od zera.
   */
  async join(invite: string, preview: InvitePreview, profile: Profile): Promise<LocalSpace> {
    const known = this.findForInvite(invite, preview);
    if (known && known.status !== 'removed' && known.memberToken) {
      this.setActive(known.id);
      return known;
    }
    const res = await this.api.join(invite, profile);
    const fields: Partial<LocalSpace> = {
      serverId: res.spaceId,
      name: res.name,
      memberToken: res.memberToken,
      memberId: res.memberId,
      role: res.role,
      inviteToken: invite,
      status: 'active',
    };
    let id: string;
    if (known) {
      id = known.id;
      // Mapa sprzed podpisu zachowuje rev; po usunięciu z mapy pobieramy wszystko od nowa
      await this.update(id, known.status === 'removed' ? { ...fields, rev: 0 } : fields);
    } else {
      const space = newSharedSpace({ ...fields, name: res.name });
      id = space.id;
      await this.add(space);
    }
    writeProfile(profile);
    this.setActive(id);
    return this.spaces().find((s) => s.id === id)!;
  }

  /** Podpis na mapie sprzed list członków; zwraca rolę (pierwszy podpisany = założyciel). */
  async completeProfile(spaceId: string, profile: Profile): Promise<SpaceRole> {
    const space = this.spaces().find((s) => s.id === spaceId);
    if (!space?.inviteToken) throw new Error('Ten telefon nie zna linku do tej mapy.');
    const res = await this.api.join(space.inviteToken, profile);
    await this.update(spaceId, {
      serverId: res.spaceId,
      name: res.name,
      memberToken: res.memberToken,
      memberId: res.memberId,
      role: res.role,
      status: 'active',
    });
    writeProfile(profile);
    return res.role;
  }

  async rename(spaceId: string, name: string): Promise<void> {
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token) throw new Error('Brak dostępu do tej mapy');
    const res = await this.api.rename(token, name);
    await this.update(spaceId, { name: res.name });
  }
```

W `FamilySyncService` usuń metody zgodności `preview` i `join` (i ich wzmiankę w komentarzu sekcji).

- [ ] **Step 4: Ekran dołączania — przepisz `join-family-page.component.ts`**

Zachowaj style, `readTokenFromUrl()` i `skip()`. Nowa logika i szablon:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { ApiError, InvitePreview } from '../../core/services/family-api';
import { markOnboardingSeen } from '../../core/services/onboarding';
import { IconComponent } from '../../shared/components/icon.component';
import { AvatarStackComponent } from '../../shared/components/avatar.component';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { Profile } from '../../shared/models/space.model';
import { pluralPl } from '../../shared/utils/grave-display';

type View =
  | { kind: 'loading' }
  | { kind: 'ready'; preview: InvitePreview }
  | { kind: 'same'; name: string }
  | { kind: 'invalid' }
  | { kind: 'offline' };
```

Szablon (`@switch` jak dotąd; zmieniają się gałęzie `ready` i `same`):

```html
      } @case ('ready') { @if (view(); as v) { @if (v.kind === 'ready') {
      <h1>Dołącz do mapy „{{ v.preview.name }}"</h1>
      <div class="who">
        <app-avatar-stack [people]="v.preview.members" [max]="5" [size]="32" />
        <span>{{ membersText() }} · {{ gravesText() }}</span>
      </div>
      <div class="note">
        <app-icon name="users" [size]="20" />
        <span>Twoje groby z innych map nie zostaną wysłane na tę mapę.</span>
      </div>
      <app-profile-form
        submitLabel="Dołącz"
        busyLabel="Dołączam…"
        nameLabel="Jak cię podpisać w rodzinie?"
        [busy]="busy()"
        (submitted)="join($event)"
      />
      <a class="pill-btn pill-btn--light" routerLink="/start" (click)="skip()">Nie teraz</a>
      @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      } } } } @case ('same') {
      <h1>Już jesteś na tej mapie</h1>
      <p class="lead">„{{ sameName() }}" jest już w tym telefonie — przełączyłem na nią.</p>
      <div class="actions">
        <a class="cta" routerLink="/start">
          Przejdź do grobów
          <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
        </a>
      </div>
      }
```

(Gałęzie `loading`, `invalid`, `offline` bez zmian.) Do stylów dodaj:

```scss
      .who {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: var(--ink-muted);
      }
```

Klasa:

```ts
export class JoinFamilyPageComponent {
  private readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);
  private readonly router = inject(Router);

  private readonly token = readTokenFromUrl();

  readonly view = signal<View>({ kind: 'loading' });
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly sameName = computed(() => {
    const v = this.view();
    return v.kind === 'same' ? v.name : '';
  });
  readonly membersText = computed(() => {
    const v = this.view();
    const n = v.kind === 'ready' ? v.preview.members.length : 0;
    return `${n} ${pluralPl(n, 'osoba', 'osoby', 'osób')}`;
  });
  readonly gravesText = computed(() => {
    const v = this.view();
    const n = v.kind === 'ready' ? v.preview.graves : 0;
    return n === 0 ? 'jeszcze bez grobów' : `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
  });

  constructor() {
    this.check();
  }

  async check(): Promise<void> {
    if (!this.token) {
      this.view.set({ kind: 'invalid' });
      return;
    }
    this.view.set({ kind: 'loading' });
    try {
      await this.spaces.ready;
      const preview = await this.spaces.preview(this.token);
      const known = this.spaces.findForInvite(this.token, preview);
      if (known && known.status === 'active') {
        this.spaces.setActive(known.id);
        markOnboardingSeen();
        this.view.set({ kind: 'same', name: known.name });
        return;
      }
      this.view.set({ kind: 'ready', preview });
    } catch (err) {
      this.view.set({ kind: err instanceof ApiError && err.status === 401 ? 'invalid' : 'offline' });
    }
  }

  async join(profile: Profile): Promise<void> {
    const v = this.view();
    if (!this.token || v.kind !== 'ready' || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.spaces.join(this.token, v.preview, profile);
      this.sync.sync();
      markOnboardingSeen();
      this.router.navigate(['/start'], { replaceUrl: true });
    } catch (err) {
      this.error.set(
        err instanceof ApiError && err.status !== 401
          ? err.message
          : 'Nie udało się dołączyć. Sprawdź internet i spróbuj ponownie.'
      );
    } finally {
      this.busy.set(false);
    }
  }

  skip(): void {
    markOnboardingSeen();
  }
}
```

Importy komponentu: `[RouterLink, IconComponent, AvatarStackComponent, ProfileFormComponent]`.

- [ ] **Step 5: `profile-prompt.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { ApiError } from '../../core/services/family-api';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { Profile } from '../../shared/models/space.model';

/**
 * Jednorazowe okienko po aktualizacji: mapa sprzed list członków czeka na podpis.
 * Pierwszy podpisany zostaje założycielem — wtedy drugi krok: nazwa mapy.
 */
@Component({
  selector: 'app-profile-prompt',
  imports: [ProfileFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (target(); as space) {
    <div class="backdrop" (click)="later()"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="pp-title">
      @if (naming()) {
      <h2 id="pp-title">Nazwij mapę</h2>
      <p>Jesteś jej założycielem. Nazwa pomoże odróżnić ją od innych map.</p>
      <form class="name" (submit)="$event.preventDefault(); rename(space.id)">
        <input
          type="text"
          maxlength="40"
          aria-label="Nazwa mapy"
          [value]="mapName()"
          (input)="mapName.set($any($event.target).value)"
        />
        <button type="submit" class="cta" [disabled]="busy() || !mapName().trim()">Gotowe</button>
      </form>
      } @else {
      <h2 id="pp-title">Rodzinna mapa ma teraz listę osób</h2>
      <p>Podpisz się, żeby rodzina widziała, kto ma dostęp do mapy „{{ space.name }}".</p>
      <app-profile-form submitLabel="Zapisz" [busy]="busy()" (submitted)="save(space.id, $event)" />
      } @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      }
      <button type="button" class="later" (click)="later()">Później</button>
    </section>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.35);
      }
      .sheet {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1001;
        max-width: 560px;
        margin: 0 auto;
        padding: 24px 20px calc(20px + env(safe-area-inset-bottom, 0px));
        display: flex;
        flex-direction: column;
        gap: 14px;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        background: var(--stone);
        box-shadow: var(--shadow-float);
      }
      h2 {
        margin: 0;
        font-size: 22px;
      }
      p {
        margin: 0;
        color: var(--ink-muted);
        font-size: 15px;
        line-height: 1.45;
      }
      .name {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .name input {
        height: 48px;
        padding: 0 14px;
        border: 1px solid var(--hairline);
        border-radius: var(--radius-sm);
        background: var(--card);
        color: var(--ink);
        font: inherit;
        font-size: 16px;
      }
      .later {
        align-self: center;
        padding: 8px 12px;
        border: none;
        background: none;
        color: var(--ink-muted);
        font-size: 14px;
        cursor: pointer;
      }
      .error {
        color: var(--danger);
        font-size: 14px;
      }
    `,
  ],
})
export class ProfilePromptComponent {
  private readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);

  /** „Później" chowa okienko do następnego uruchomienia aplikacji. */
  private readonly dismissed = signal(false);
  /** Mapa, której założyciel właśnie nadaje nazwę. */
  private readonly namingId = signal<string | null>(null);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly mapName = signal('Rodzinna mapa');
  readonly naming = computed(() => this.namingId() !== null);

  readonly target = computed(() => {
    if (this.dismissed()) return null;
    const naming = this.namingId();
    const list = this.spaces.spaces();
    return naming
      ? list.find((s) => s.id === naming) ?? null
      : list.find((s) => s.status === 'needs-profile') ?? null;
  });

  async save(spaceId: string, profile: Profile): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const role = await this.spaces.completeProfile(spaceId, profile);
      this.sync.sync();
      if (role === 'owner') {
        this.mapName.set(this.spaces.spaces().find((s) => s.id === spaceId)?.name ?? 'Rodzinna mapa');
        this.namingId.set(spaceId);
      }
    } catch (err) {
      this.error.set(
        err instanceof ApiError && err.status === 401
          ? 'Link tej mapy został zmieniony — poproś założyciela o nowy.'
          : 'Nie udało się zapisać. Sprawdź internet i spróbuj ponownie.'
      );
    } finally {
      this.busy.set(false);
    }
  }

  async rename(spaceId: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.spaces.rename(spaceId, this.mapName());
      this.namingId.set(null);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Nie udało się zmienić nazwy.');
    } finally {
      this.busy.set(false);
    }
  }

  later(): void {
    this.namingId.set(null);
    this.dismissed.set(true);
  }
}
```

- [ ] **Step 6: Okienko w powłoce aplikacji**

W `app.ts` zaimportuj `ProfilePromptComponent` (dopisz do `imports`) i dodaj:

```ts
  // Okienko podpisu nie przeszkadza w powitaniu ani w dołączaniu z linku
  readonly showPrompt = computed(() => {
    const p = this.path();
    return !(p.startsWith('/welcome') || p.startsWith('/rodzina'));
  });
```

W `app.html` na końcu:

```html
@if (showPrompt()) {
<app-profile-prompt />
}
```

- [ ] **Step 7: Build, testy, E2E**

Run: `npx ng build`; `npx ng test --watch=false` → PASS.

E2E (`grave-app-api` + `grave-app` na 4260, dwa izolowane konteksty):
1. Kontekst A ze stanem z B4 (mapa `needs-profile`): po starcie okienko „Rodzinna mapa ma teraz listę osób" → podpis „Kacper", zielony → krok „Nazwij mapę" → „Kubitowie" → okienko znika; `spaces` ma `memberToken`, `role: 'owner'`, `status: 'active'`, nazwa „Kubitowie".
2. Kontekst B: `/rodzina#<invite>` → widać „Dołącz do mapy „Kubitowie"", awatar „K", liczba grobów; podpis „Ania" → „Dołącz" → Start z grobami mapy; brak okienka podpisu.
3. Kontekst B: ponownie `/rodzina#<invite>` → „Już jesteś na tej mapie".
4. Imię z samych spacji → przycisk „Dołącz" nieaktywny.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: podpis członka, dołączanie z podglądem mapy i okienko po aktualizacji"
```

### Task B6: Panel mapy, lista map w Ustawieniach i zakładanie mapy

**Files:**
- Create: `src/app/features/family/space-page.component.ts`, `.html`, `.scss`; `src/app/features/family/create-space-page.component.ts`; `src/app/shared/utils/sync-status.ts` (+ `.spec.ts`)
- Modify: `src/app/core/services/space.service.ts`, `src/app/core/services/family-sync.service.ts`, `src/app/app.routes.ts`, `src/app/app.ts`, `src/app/features/settings/settings-page.component.ts`, `.html`

**Interfaces:**
- Consumes: B4/B5 (`SpaceService`, `FamilySyncService.syncOf`, `FamilyApi`), B1 (awatary, `lastSeenText`, `relativeTime`).
- Produces: `syncStatusText(sync: SpaceSync, syncedAt: number | null, now?)`; `SpaceService.members` (sygnał `Record<string, Member[]>`), `loadMembers(spaceId)`, `create(name, profile, moveLocal)`, `leave(spaceId, keep)`, `deleteSpace(spaceId, keep)`, `removeMember(spaceId, memberId)`, `transferOwner(spaceId, memberId)`, `updateMe(spaceId, profile)`, `me(spaceId)`; trasy `/mapy/nowa`, `/mapy/:id`.

- [ ] **Step 1: Test `sync-status.spec.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { syncStatusText } from './sync-status';

const NOW = Date.UTC(2026, 9, 1, 12);

describe('syncStatusText', () => {
  it('synchronizuję', () => expect(syncStatusText({ state: 'syncing', error: null, pending: 0 }, null, NOW)).toBe('Synchronizuję…'));
  it('bez internetu z kolejką', () =>
    expect(syncStatusText({ state: 'offline', error: null, pending: 3 }, null, NOW)).toBe('Bez internetu · 3 zmiany czekają'));
  it('błąd pokazuje komunikat', () =>
    expect(syncStatusText({ state: 'error', error: 'Limit', pending: 0 }, null, NOW)).toBe('Limit'));
  it('usunięty z mapy', () =>
    expect(syncStatusText({ state: 'removed', error: null, pending: 0 }, null, NOW)).toBe('Nie masz już dostępu — tylko do odczytu'));
  it('zsynchronizowano', () =>
    expect(syncStatusText({ state: 'idle', error: null, pending: 0 }, NOW - 5 * 60_000, NOW)).toBe('Zsynchronizowano 5 min temu'));
  it('jeszcze nie synchronizowano', () =>
    expect(syncStatusText({ state: 'off', error: null, pending: 1 }, null, NOW)).toBe('Czeka na synchronizację · 1 zmiana czeka'));
});
```

- [ ] **Step 2: Uruchom — FAIL; potem `sync-status.ts`**

```ts
import { pluralPl } from './grave-display';
import { relativeTime } from './member-display';
import type { SpaceSync } from '../../core/services/family-sync.service';

/** Jedna linijka stanu mapy pod jej nazwą (Ustawienia, panel mapy, przełącznik). */
export function syncStatusText(sync: SpaceSync, syncedAt: number | null, now = Date.now()): string {
  const pending = sync.pending > 0
    ? `${sync.pending} ${pluralPl(sync.pending, 'zmiana czeka', 'zmiany czekają', 'zmian czeka')}`
    : '';
  const withPending = (text: string) => (pending ? `${text} · ${pending}` : text);
  switch (sync.state) {
    case 'syncing':
      return 'Synchronizuję…';
    case 'offline':
      return withPending('Bez internetu');
    case 'removed':
      return 'Nie masz już dostępu — tylko do odczytu';
    case 'error':
    case 'revoked':
      return sync.error ?? 'Błąd synchronizacji';
    default:
      return withPending(syncedAt ? `Zsynchronizowano ${relativeTime(syncedAt, now)}` : 'Czeka na synchronizację');
  }
}
```

Run: `npx ng test --watch=false --include src/app/shared/utils/sync-status.spec.ts` → PASS.

- [ ] **Step 3: `SpaceService` — członkowie i zarządzanie**

Usuń `createLegacy`. Dodaj (`Member` do importów):

```ts
  /** Członkowie map (po lokalnym id) — z serwera, tylko w pamięci. */
  readonly members = signal<Record<string, Member[]>>({});

  /** Ja na tej mapie (z listy członków). */
  me(spaceId: string): Member | null {
    const space = this.spaces().find((s) => s.id === spaceId);
    return this.members()[spaceId]?.find((m) => m.id === space?.memberId) ?? null;
  }

  async loadMembers(spaceId: string): Promise<void> {
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token || !navigator.onLine) return;
    const list = await this.api.members(token);
    this.members.update((all) => ({ ...all, [spaceId]: list }));
  }

  async create(name: string, profile: Profile, moveLocal: boolean): Promise<LocalSpace> {
    const res = await this.api.createSpace(name, profile);
    const space = newSharedSpace({
      serverId: res.spaceId,
      name: res.name,
      memberToken: res.memberToken,
      memberId: res.memberId,
      role: 'owner',
      inviteToken: res.invite,
    });
    await this.add(space);
    if (moveLocal) await this.db.moveGraves(await this.db.graveIds(LOCAL_SPACE_ID), space.id);
    writeProfile(profile);
    this.setActive(space.id);
    return space;
  }

  /** Wyjście z mapy (członek). Mapa sprzed podpisu nie ma członka — tylko znika z telefonu. */
  async leave(spaceId: string, keep: boolean): Promise<void> {
    const space = this.spaces().find((s) => s.id === spaceId);
    if (space?.memberToken && space.status === 'active') await this.api.leave(space.memberToken);
    await this.forget(spaceId, keep);
  }

  /** Usunięcie mapy przez założyciela, gdy nikogo innego już na niej nie ma. */
  async deleteSpace(spaceId: string, keep: boolean): Promise<void> {
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token) throw new Error('Brak dostępu do tej mapy');
    await this.api.deleteSpace(token);
    await this.forget(spaceId, keep);
  }

  async removeMember(spaceId: string, memberId: string): Promise<void> {
    await this.api.removeMember(this.tokenOf(spaceId), memberId);
    await this.loadMembers(spaceId);
  }

  async transferOwner(spaceId: string, memberId: string): Promise<void> {
    await this.api.transferOwner(this.tokenOf(spaceId), memberId);
    await this.update(spaceId, { role: 'member' });
    await this.loadMembers(spaceId);
  }

  async updateMe(spaceId: string, profile: Profile): Promise<void> {
    await this.api.updateMe(this.tokenOf(spaceId), profile);
    writeProfile(profile);
    await this.loadMembers(spaceId);
  }

  private tokenOf(spaceId: string): string {
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token) throw new Error('Brak dostępu do tej mapy');
    return token;
  }
```

Zamień w `rename` i `rotateInvite` lokalne szukanie klucza na `this.tokenOf(...)`.

W `forget` dodaj na końcu czyszczenie członków: `this.members.update(({ [spaceId]: _, ...rest }) => rest);`.

- [ ] **Step 4: `FamilySyncService` — lista członków przy synchronizacji, koniec zgodności akcji**

W `runSpace` po `this.setStatus(space.id, { state: 'idle', error: null });` dodaj:

```ts
      // Awatary w przełączniku i panelu: lista członków aktywnej mapy przy okazji synchronizacji
      if (space.id === this.spaces.activeSpaceId()) await this.spaces.loadMembers(space.id).catch(() => {});
```

Usuń z warstwy zgodności: `token`, `createSpace`, `rotateLink`, `leave`, `shareInvite`. Zostają `connected`, `state`, `pending`, `errorMessage`, `lastSyncAt` (Start, usuwane w B7). Zaktualizuj komentarz sekcji.

- [ ] **Step 5: Trasy**

W `app.routes.ts` przed `'**'`:

```ts
  {
    path: 'mapy/nowa',
    loadComponent: () =>
      import('./features/family/create-space-page.component').then((m) => m.CreateSpacePageComponent),
  },
  {
    path: 'mapy/:id',
    loadComponent: () =>
      import('./features/family/space-page.component').then((m) => m.SpacePageComponent),
  },
```

W `app.ts` w `showNav` dodaj `|| p.startsWith('/mapy/')` do warunku ukrycia dolnej nawigacji (ekrany „w głąb" mają własny powrót).

- [ ] **Step 6: `create-space-page.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SpaceService } from '../../core/services/space.service';
import { GraveService } from '../graves/services/grave.service';
import { IndexedDbService } from '../../core/services/indexeddb.service';
import { ApiError } from '../../core/services/family-api';
import { IconComponent } from '../../shared/components/icon.component';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { LOCAL_SPACE_ID, Profile } from '../../shared/models/space.model';
import { pluralPl } from '../../shared/utils/grave-display';

/** Zakładanie rodzinnej mapy: nazwa, podpis założyciela i co zrobić z grobami z „Moje". */
@Component({
  selector: 'app-create-space-page',
  imports: [RouterLink, IconComponent, ProfileFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <a class="round-btn round-btn--sm back" routerLink="/settings" aria-label="Wróć">
        <app-icon name="arrow-left" [size]="20" />
      </a>
      <h1>Nowa rodzinna mapa</h1>
      <p class="lead">Każdy, kto dostanie link, dołączy i zobaczy groby z tej mapy.</p>

      <label class="field">
        <span>Nazwa mapy</span>
        <input type="text" maxlength="40" [value]="name()" (input)="name.set($any($event.target).value)" />
      </label>

      @if (localCount() > 0) {
      <fieldset class="choice">
        <legend>Groby z „Moje" ({{ localText() }})</legend>
        <label><input type="radio" name="move" [checked]="move()" (change)="move.set(true)" /> Przenieś na nową mapę</label>
        <label><input type="radio" name="move" [checked]="!move()" (change)="move.set(false)" /> Zostaw w „Moje"</label>
      </fieldset>
      }

      <app-profile-form
        nameLabel="Twój podpis na mapie"
        submitLabel="Utwórz mapę"
        busyLabel="Tworzę mapę…"
        [busy]="busy()"
        (submitted)="create($event)"
      />
      @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .screen {
        max-width: 560px;
        margin: 0 auto;
        padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .back {
        align-self: flex-start;
      }
      h1 {
        margin: 0;
        font-size: 28px;
      }
      .lead {
        margin: 0;
        color: var(--ink-muted);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink-muted);
        input {
          height: 48px;
          padding: 0 14px;
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          background: var(--card);
          color: var(--ink);
          font: inherit;
          font-size: 16px;
          font-weight: 400;
        }
      }
      .choice {
        margin: 0;
        padding: 12px 14px;
        border: none;
        border-radius: var(--radius-md);
        background: var(--card);
        display: flex;
        flex-direction: column;
        gap: 8px;
        legend {
          padding: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-muted);
        }
        label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
        }
      }
      .error {
        margin: 0;
        color: var(--danger);
      }
    `,
  ],
})
export class CreateSpacePageComponent {
  private readonly spaces = inject(SpaceService);
  private readonly db = inject(IndexedDbService);
  private readonly graveService = inject(GraveService);
  private readonly router = inject(Router);

  readonly name = signal('Rodzinna mapa');
  readonly move = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly localCount = signal(0);
  readonly localText = computed(() => {
    const n = this.localCount();
    return `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
  });

  constructor() {
    this.db.graveIds(LOCAL_SPACE_ID).then((ids) => this.localCount.set(ids.length));
  }

  async create(profile: Profile): Promise<void> {
    const name = this.name().replace(/\s+/g, ' ').trim();
    if (!name) {
      this.error.set('Podaj nazwę mapy.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const space = await this.spaces.create(name, profile, this.move());
      await this.graveService.loadGraves();
      this.router.navigate(['/mapy', space.id], { replaceUrl: true });
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Nie udało się utworzyć mapy. Sprawdź internet.');
    } finally {
      this.busy.set(false);
    }
  }
}
```

- [ ] **Step 7: Panel mapy `space-page.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { ApiError } from '../../core/services/family-api';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { Member, Profile } from '../../shared/models/space.model';
import { lastSeenText } from '../../shared/utils/member-display';
import { syncStatusText } from '../../shared/utils/sync-status';

interface Note {
  type: 'success' | 'error' | 'info';
  icon: IconName;
  text: string;
}

/** Co zrobić z grobami po wyjściu/usunięciu mapy — wybór w panelu, nie w `confirm()`. */
type Exit = 'leave' | 'delete' | 'removed';

@Component({
  selector: 'app-space-page',
  imports: [RouterLink, IconComponent, AvatarComponent, ProfileFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './space-page.component.html',
  styleUrls: ['../settings/settings-page.component.scss', './space-page.component.scss'],
})
export class SpacePageComponent {
  readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);
  private readonly router = inject(Router);

  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  readonly space = computed(() => this.spaces.spaces().find((s) => s.id === this.id()) ?? null);
  readonly isOwner = computed(() => this.space()?.role === 'owner');
  readonly removed = computed(() => this.space()?.status === 'removed');
  readonly members = computed(() => this.spaces.members()[this.id()] ?? []);
  readonly me = computed(() => this.members().find((m) => m.id === this.space()?.memberId) ?? null);
  readonly others = computed(() => this.members().filter((m) => m.id !== this.space()?.memberId));
  readonly status = computed(() => {
    const s = this.space();
    return s ? syncStatusText(this.sync.syncOf(s.id), s.syncedAt) : '';
  });

  readonly busy = signal(false);
  readonly note = signal<Note | null>(null);
  readonly editingName = signal(false);
  readonly editingMe = signal(false);
  readonly menuFor = signal<string | null>(null);
  readonly exit = signal<Exit | null>(null);
  readonly nameDraft = signal('');

  readonly lastSeen = (m: Member) => lastSeenText(m.lastSeenAt);
  readonly joined = (m: Member) =>
    new Date(m.joinedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  constructor() {
    this.spaces.ready.then(() => {
      if (!this.space()) {
        this.router.navigate(['/settings'], { replaceUrl: true });
        return;
      }
      if (this.removed()) this.exit.set('removed');
      this.spaces.loadMembers(this.id()).catch(() => {});
    });
  }

  startRename(): void {
    this.nameDraft.set(this.space()?.name ?? '');
    this.editingName.set(true);
  }

  async saveName(): Promise<void> {
    await this.run(async () => {
      await this.spaces.rename(this.id(), this.nameDraft());
      this.editingName.set(false);
    }, 'Nie udało się zmienić nazwy.');
  }

  async saveMe(profile: Profile): Promise<void> {
    await this.run(async () => {
      await this.spaces.updateMe(this.id(), profile);
      this.editingMe.set(false);
    }, 'Nie udało się zapisać podpisu.');
  }

  async share(): Promise<void> {
    const space = this.space();
    if (!space) return;
    await this.run(async () => {
      if ((await this.spaces.shareInvite(space)) === 'copied') {
        this.note.set({ type: 'success', icon: 'check', text: 'Link skopiowany — wklej go w wiadomości do rodziny.' });
      }
    }, 'Nie udało się udostępnić linku.');
  }

  async rotate(): Promise<void> {
    const space = this.space();
    if (!space) return;
    const ok = confirm('Wygenerować nowy link zaproszenia? Stary przestanie działać. Osoby, które już dołączyły, zostają.');
    if (!ok) return;
    await this.run(async () => {
      await this.spaces.rotateInvite(space);
      this.note.set({ type: 'success', icon: 'check', text: 'Nowy link gotowy. Wyślij go osobom, które mają dołączyć.' });
    }, 'Nie udało się zmienić linku. Sprawdź internet.');
  }

  async removeMember(m: Member): Promise<void> {
    this.menuFor.set(null);
    if (!confirm(`Usunąć ${m.name} z mapy? Jej/jego telefon przestanie się synchronizować.`)) return;
    await this.run(() => this.spaces.removeMember(this.id(), m.id), 'Nie udało się usunąć osoby.');
  }

  async transfer(m: Member): Promise<void> {
    this.menuFor.set(null);
    if (!confirm(`Przekazać rolę założyciela osobie ${m.name}? Stracisz możliwość zarządzania mapą.`)) return;
    await this.run(() => this.spaces.transferOwner(this.id(), m.id), 'Nie udało się przekazać roli.');
  }

  /** Wyjście, usunięcie mapy albo porządek po usunięciu z mapy — z wyborem losu grobów. */
  async finish(keep: boolean): Promise<void> {
    const kind = this.exit();
    if (!kind) return;
    const pending = this.sync.syncOf(this.id()).pending;
    if (kind !== 'removed' && pending > 0 && !confirm(`${pending} niewysłanych zmian nie trafi do rodziny. Kontynuować?`)) {
      return;
    }
    await this.run(async () => {
      if (kind === 'leave') await this.spaces.leave(this.id(), keep);
      else if (kind === 'delete') await this.spaces.deleteSpace(this.id(), keep);
      else await this.spaces.forget(this.id(), keep);
      this.router.navigate(['/settings'], { replaceUrl: true });
    }, 'Nie udało się. Sprawdź internet i spróbuj ponownie.');
  }

  private async run(action: () => Promise<void>, fallback: string): Promise<void> {
    this.busy.set(true);
    this.note.set(null);
    try {
      await action();
    } catch (err) {
      const text = err instanceof ApiError || err instanceof Error ? err.message : fallback;
      this.note.set({ type: 'error', icon: 'alert', text: text || fallback });
    } finally {
      this.busy.set(false);
    }
  }
}
```

`space-page.component.html`:

```html
@if (space(); as s) {
<div class="screen">
  <header class="head">
    <a class="round-btn round-btn--sm" routerLink="/settings" aria-label="Wróć">
      <app-icon name="arrow-left" [size]="20" />
    </a>
    @if (editingName()) {
    <form class="rename" (submit)="$event.preventDefault(); saveName()">
      <input type="text" maxlength="40" aria-label="Nazwa mapy" [value]="nameDraft()" (input)="nameDraft.set($any($event.target).value)" />
      <button type="submit" class="pill-btn pill-btn--dark" [disabled]="busy() || !nameDraft().trim()">Zapisz</button>
    </form>
    } @else {
    <h1>
      {{ s.name }}
      @if (isOwner() && !removed()) {
      <button type="button" class="icon-btn" (click)="startRename()" aria-label="Zmień nazwę mapy">
        <app-icon name="edit" [size]="18" />
      </button>
      }
    </h1>
    }
    <p>{{ status() }}</p>
  </header>

  @if (exit(); as kind) {
  <section class="card exit" role="group" aria-label="Co z grobami">
    <p class="exit__text">
      @switch (kind) { @case ('removed') { Nie masz już dostępu do tej mapy. Groby są w telefonie tylko do odczytu. }
      @case ('delete') { Mapa zniknie z serwera. } @default { Telefon opuści mapę. } } Co zrobić z jej grobami w tym telefonie?
    </p>
    <button type="button" class="cta" [disabled]="busy()" (click)="finish(true)">Zachowaj kopię w „Moje"</button>
    <button type="button" class="pill-btn pill-btn--light" [disabled]="busy()" (click)="finish(false)">Usuń z telefonu</button>
    @if (kind !== 'removed') {
    <button type="button" class="replace-link" (click)="exit.set(null)">Anuluj</button>
    }
  </section>
  }

  @if (!removed()) {
  <section class="group">
    <h2>Ty</h2>
    <div class="card">
      @if (editingMe()) {
      <div class="me-form">
        <app-profile-form submitLabel="Zapisz podpis" [busy]="busy()" (submitted)="saveMe($event)" />
      </div>
      } @else {
      <button type="button" class="row" (click)="editingMe.set(true)">
        @if (me(); as m) {
        <app-avatar [name]="m.name" [color]="m.color" [size]="40" />
        <span class="row__text">
          <span class="row__title">{{ m.name }}</span>
          <span class="row__sub">{{ isOwner() ? 'Założyciel mapy' : 'Członek mapy' }} · zmień podpis</span>
        </span>
        } @else {
        <span class="row__icon"><app-icon name="users" [size]="20" /></span>
        <span class="row__text"><span class="row__title">Twój podpis</span><span class="row__sub">Wczytuję…</span></span>
        }
      </button>
      }
    </div>
  </section>

  <section class="group">
    <h2>Członkowie · {{ members().length }}</h2>
    <div class="card">
      @for (m of others(); track m.id) {
      <div class="row row--static member">
        <app-avatar [name]="m.name" [color]="m.color" [size]="40" />
        <span class="row__text">
          <span class="row__title">{{ m.name }} @if (m.role === 'owner') {<span class="tag">Założyciel</span>}</span>
          <span class="row__sub">dołączył(a) {{ joined(m) }} · {{ lastSeen(m) }}</span>
        </span>
        @if (isOwner()) {
        <button type="button" class="icon-btn" [attr.aria-expanded]="menuFor() === m.id" [attr.aria-label]="'Opcje: ' + m.name" (click)="menuFor.set(menuFor() === m.id ? null : m.id)">
          <app-icon name="more" [size]="20" />
        </button>
        }
      </div>
      @if (menuFor() === m.id) {
      <div class="member-menu">
        <button type="button" class="pill-btn pill-btn--light" [disabled]="busy()" (click)="transfer(m)">Przekaż rolę założyciela</button>
        <button type="button" class="pill-btn pill-btn--light danger" [disabled]="busy()" (click)="removeMember(m)">Usuń z mapy</button>
      </div>
      } } @empty {
      <p class="empty">Na razie tylko ty. Wyślij zaproszenie, żeby dołączyła rodzina.</p>
      }
    </div>
  </section>

  <section class="group">
    <h2>Zaproszenie i mapa</h2>
    <div class="card">
      <button type="button" class="row" [disabled]="busy()" (click)="share()">
        <span class="row__icon row__icon--dark"><app-icon name="share" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Wyślij zaproszenie</span>
          <span class="row__sub">WhatsApp, SMS, e-mail albo schowek</span>
        </span>
        <app-icon class="row__chevron" name="chevron-right" [size]="18" />
      </button>
      <button type="button" class="row" (click)="spaces.setActive(s.id)" [disabled]="spaces.activeSpaceId() === s.id">
        <span class="row__icon"><app-icon name="map" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">{{ spaces.activeSpaceId() === s.id ? 'To jest aktywna mapa' : 'Pokaż tę mapę' }}</span>
          <span class="row__sub">Start, lista i mapa pokazują groby aktywnej mapy</span>
        </span>
      </button>
      @if (isOwner()) {
      <button type="button" class="row" [disabled]="busy()" (click)="rotate()">
        <span class="row__icon"><app-icon name="key" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Zmień link zaproszenia</span>
          <span class="row__sub">Stary przestanie działać — dołączone osoby zostają</span>
        </span>
      </button>
      }
      @if (!isOwner()) {
      <button type="button" class="row" (click)="exit.set('leave')">
        <span class="row__icon"><app-icon name="logout" [size]="20" /></span>
        <span class="row__text"><span class="row__title">Opuść mapę</span><span class="row__sub">Telefon przestanie się synchronizować</span></span>
      </button>
      } @else if (others().length === 0) {
      <button type="button" class="row" (click)="exit.set('delete')">
        <span class="row__icon"><app-icon name="trash" [size]="20" /></span>
        <span class="row__text"><span class="row__title">Usuń mapę</span><span class="row__sub">Jesteś na niej sam(a) — mapa zniknie z serwera</span></span>
      </button>
      } @else {
      <div class="row row--static">
        <span class="row__icon"><app-icon name="logout" [size]="20" /></span>
        <span class="row__text"><span class="row__title">Opuść mapę</span><span class="row__sub">Najpierw przekaż rolę założyciela innej osobie (⋯ przy jej imieniu)</span></span>
      </div>
      }
    </div>
  </section>
  }

  @if (note(); as n) {
  <div [class]="'status status--' + n.type" role="status">
    <app-icon [name]="n.icon" [size]="18" />
    <span>{{ n.text }}</span>
  </div>
  }
</div>
}
```

`space-page.component.scss` (style wiersza, karty, `status`, `tag`, `replace-link` przychodzą z `settings-page.component.scss`):

```scss
.head {
  gap: 10px;

  h1 {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.icon-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--ink-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--stone);
  }
}

.rename {
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    height: 44px;
    padding: 0 12px;
    border: 1px solid var(--hairline);
    border-radius: var(--radius-sm);
    background: var(--card);
    color: var(--ink);
    font: inherit;
    font-size: 18px;
  }
}

.member .row__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-menu {
  padding: 4px 10px 12px 62px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .danger {
    color: var(--danger);
  }
}

.me-form {
  padding: 10px;
}

.empty {
  margin: 0;
  padding: 14px;
  font-size: 14px;
  color: var(--ink-muted);
}

.exit {
  padding: 16px;
  gap: 10px;

  &__text {
    margin: 0 0 4px;
    font-size: 14px;
    line-height: 1.45;
  }
}
```

- [ ] **Step 8: Ustawienia — lista map**

W `settings-page.component.ts`: wstrzyknij `SpaceService` (`readonly spaces = inject(SpaceService);`); usuń `familyBusy`, `familyNote`, `familyStatus`, `createFamily`, `shareFamily`, `rotateFamilyLink`, `leaveFamily`, `runFamilyAction` i lokalną `relativeTime`; dodaj:

```ts
  readonly mapRows = computed(() =>
    this.spaces.sharedSpaces().map((s) => ({
      id: s.id,
      name: s.name,
      active: s.id === this.spaces.activeSpaceId(),
      people: this.spaces.members()[s.id] ?? [],
      status: s.status === 'needs-profile' ? 'Czeka na twój podpis' : syncStatusText(this.family.syncOf(s.id), s.syncedAt),
      error: ['error', 'revoked', 'removed'].includes(this.family.syncOf(s.id).state),
    }))
  );
```

(import `syncStatusText`, `AvatarStackComponent` w `imports` komponentu, `RouterLink`). W `onFileSelected` zamień `this.family.connected()` na `this.spaces.activeSpace()?.id !== 'local'` i tekst na „Dotyczy całej mapy „{{nazwa}}" — groby znikną też u pozostałych osób." (`${this.spaces.activeSpace()?.name}`).

W `settings-page.component.html` zamień nagłówek `<p>` na:

```html
    <p>Aktywna mapa: {{ spaces.activeSpace()?.name ?? 'Moje' }}</p>
```

a całą sekcję „Rodzinna mapa" (od `<section class="group">` z `<h2>Rodzinna mapa</h2>` do jej `</section>`) na:

```html
  <section class="group">
    <h2>Rodzinne mapy</h2>
    <div class="card">
      @for (m of mapRows(); track m.id) {
      <a class="row" [routerLink]="['/mapy', m.id]">
        <span class="row__icon row__icon--dark"><app-icon name="users" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">{{ m.name }} @if (m.active) {<span class="tag tag--on">Aktywna</span>}</span>
          <span class="row__sub" [class.row__sub--error]="m.error">{{ m.status }}</span>
        </span>
        <app-avatar-stack [people]="m.people" [size]="24" />
        <app-icon class="row__chevron" name="chevron-right" [size]="18" />
      </a>
      }
      <a class="row" routerLink="/mapy/nowa">
        <span class="row__icon"><app-icon name="plus" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Utwórz rodzinną mapę</span>
          <span class="row__sub">Wspólne groby z bliskimi — każda rodzina osobno</span>
        </span>
        <app-icon class="row__chevron" name="chevron-right" [size]="18" />
      </a>
    </div>
    <p class="aside">Dostałeś(-aś) link od rodziny? Otwórz go na tym telefonie.</p>
    @if (family.photoWarning(); as warning) {
    <div class="status status--info" role="status">
      <app-icon name="alert" [size]="18" />
      <span>{{ warning }} Zdjęcie jest zapisane w tym telefonie.</span>
    </div>
    }
  </section>
```

W `settings-page.component.scss` dodaj do `.row`: `text-decoration: none;` (wiersze-linki) oraz `&__title { display: flex; align-items: center; gap: 8px; }` (tag obok nazwy).

- [ ] **Step 9: Build, testy, E2E**

Run: `npx ng build`; `npx ng test --watch=false` → PASS.

E2E (dwa konteksty, lokalny Worker):
1. A: Ustawienia → „Utwórz rodzinną mapę" → nazwa „Rodzina żony", „Przenieś" przy 2 grobach w „Moje", podpis → panel mapy: „Ty: Kacper · Założyciel mapy", „Członkowie · 1", „Na razie tylko ty…".
2. A: „Wyślij zaproszenie" (w Playwright schowek → `navigator.clipboard.readText()`), B dołącza z linku.
3. A: odśwież panel → B na liście z „online przed chwilą"; „⋯" → „Przekaż rolę założyciela" → A widzi „Członek mapy", „Opuść mapę" aktywne.
4. B (teraz założyciel): „⋯" przy A → „Usuń z mapy". A: po synchronizacji (≤ 60 s albo powrót do karty) panel pokazuje wybór „Nie masz już dostępu…" → „Zachowaj kopię w »Moje«" → groby w „Moje", mapa znika z listy.
5. B: „Usuń mapę" (jest sam) → „Usuń z telefonu" → mapa znika; `GET /space` jej kluczem → 401.
6. Zmiana nazwy przez założyciela widoczna u członka po synchronizacji.

- [ ] **Step 10: Commit**

```bash
git add src
git commit -m "feat: panel rodzinnej mapy z członkami, lista map i zakładanie mapy"
```

### Task B7: Przełącznik map (Start i Mapa)

**Files:**
- Create: `src/app/shared/components/space-switcher.component.ts`
- Modify: `src/app/features/home/home-page.component.ts`, `.html`, `.scss`; `src/app/features/map/components/map-overlay.component.ts`; `src/app/core/services/family-sync.service.ts`

**Interfaces:**
- Consumes: `SpaceService` (`spaces`, `activeSpace`, `setActive`, `members`), `FamilySyncService.syncOf`, `IndexedDbService.countBySpace`, `syncStatusText`, `AvatarStackComponent`.
- Produces: `<app-space-switcher />` — pigułka + panel od dołu; ukryta, gdy telefon ma tylko „Moje".

- [ ] **Step 1: `space-switcher.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { IndexedDbService } from '../../core/services/indexeddb.service';
import { AvatarStackComponent } from './avatar.component';
import { IconComponent } from './icon.component';
import { isShared } from '../models/space.model';
import { pluralPl } from '../utils/grave-display';
import { syncStatusText } from '../utils/sync-status';

/** Pigułka z aktywną mapą; dotknięcie otwiera listę map do przełączenia. */
@Component({
  selector: 'app-space-switcher',
  imports: [RouterLink, AvatarStackComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
    <button type="button" class="pill" (click)="toggle()" [attr.aria-expanded]="open()" aria-haspopup="dialog">
      @if (activeState(); as state) {
      <span [class]="'dot dot--' + state" aria-hidden="true"></span>
      }
      <span class="pill__name">{{ spaces.activeSpace()?.name ?? 'Moje' }}</span>
      <app-avatar-stack [people]="activePeople()" [size]="22" />
      <app-icon name="chevron-right" [size]="16" class="pill__chev" />
    </button>
    } @if (open()) {
    <div class="backdrop" (click)="open.set(false)"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="Wybierz mapę">
      <h2>Mapy w tym telefonie</h2>
      @for (row of rows(); track row.id) {
      <button type="button" class="map-row" [class.active]="row.active" (click)="choose(row.id)">
        <span class="map-row__text">
          <span class="map-row__name">{{ row.name }}</span>
          <span class="map-row__sub">{{ row.sub }}</span>
        </span>
        <app-avatar-stack [people]="row.people" [size]="24" />
        @if (row.active) {
        <app-icon name="check" [size]="20" [stroke]="2" />
        }
      </button>
      }
      <a class="pill-btn pill-btn--light" routerLink="/mapy/nowa" (click)="open.set(false)">
        <app-icon name="plus" [size]="18" /> Utwórz rodzinną mapę
      </a>
      <p class="hint">Masz link od rodziny? Otwórz go na tym telefonie.</p>
    </section>
    }
  `,
  styles: [
    `
      .pill {
        height: 34px;
        max-width: 100%;
        padding: 0 10px 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: none;
        border-radius: var(--radius-pill);
        background: var(--card);
        color: var(--ink);
        box-shadow: var(--shadow-card);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .pill__name {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .pill__chev {
        color: var(--ink-faint);
        transform: rotate(90deg);
      }
      .dot {
        width: 8px;
        height: 8px;
        flex-shrink: 0;
        border-radius: var(--radius-pill);
        background: var(--ok);
        &--syncing {
          background: var(--locate);
        }
        &--offline,
        &--off {
          background: var(--ink-faint);
        }
        &--error,
        &--revoked,
        &--removed {
          background: var(--danger);
        }
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.35);
      }
      .sheet {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1001;
        max-width: 560px;
        max-height: 80vh;
        overflow-y: auto;
        margin: 0 auto;
        padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        background: var(--stone);
        color: var(--ink);
        box-shadow: var(--shadow-float);
      }
      h2 {
        margin: 0 4px 6px;
        font-size: 18px;
      }
      .map-row {
        min-height: 60px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 2px solid transparent;
        border-radius: var(--radius-md);
        background: var(--card);
        color: var(--ink);
        font: inherit;
        text-align: left;
        cursor: pointer;
        &.active {
          border-color: var(--ink);
        }
      }
      .map-row__text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .map-row__name {
        font-size: 15px;
        font-weight: 600;
      }
      .map-row__sub {
        font-size: 13px;
        color: var(--ink-muted);
      }
      .pill-btn {
        margin-top: 6px;
        gap: 8px;
      }
      .hint {
        margin: 4px 4px 0;
        font-size: 13px;
        color: var(--ink-muted);
      }
    `,
  ],
})
export class SpaceSwitcherComponent {
  readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);
  private readonly db = inject(IndexedDbService);

  readonly open = signal(false);
  private readonly counts = signal<Record<string, number>>({});

  readonly visible = computed(() => this.spaces.sharedSpaces().length > 0);
  readonly activeState = computed(() => {
    const active = this.spaces.activeSpace();
    return active && isShared(active) ? this.sync.syncOf(active.id).state : null;
  });
  readonly activePeople = computed(() => this.spaces.members()[this.spaces.activeSpaceId()] ?? []);

  readonly rows = computed(() =>
    this.spaces.spaces().map((s) => {
      const n = this.counts()[s.id] ?? 0;
      const graves = `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
      const sub = isShared(s)
        ? `${graves} · ${syncStatusText(this.sync.syncOf(s.id), s.syncedAt)}`
        : `${graves} · tylko w tym telefonie`;
      return {
        id: s.id,
        name: s.name,
        sub,
        active: s.id === this.spaces.activeSpaceId(),
        people: this.spaces.members()[s.id] ?? [],
      };
    })
  );

  async toggle(): Promise<void> {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    this.counts.set(await this.db.countBySpace());
  }

  choose(id: string): void {
    this.spaces.setActive(id);
    this.open.set(false);
    this.spaces.loadMembers(id).catch(() => {});
  }
}
```

- [ ] **Step 2: Start**

W `home-page.component.html` zamień blok `@if (family.connected()) { <a class="family-chip" ...> ... </a> }` na `<app-space-switcher />` umieszczony jako osobna linia nad `<h1>` (poza `<span class="date">`):

```html
      <span class="date">{{ today }}</span>
      <app-space-switcher />
      <h1>Twoi bliscy,<br />zawsze blisko</h1>
```

W `home-page.component.ts`: usuń `family` i `familyTitle` oraz import `FamilySyncService`; dodaj `SpaceSwitcherComponent` do `imports`. W `.scss` usuń reguły `.family-chip` (i jej elementów).

- [ ] **Step 3: Mapa**

W `map-overlay.component.ts` dodaj `SpaceSwitcherComponent` do `imports` i jako pierwszy element w `<div class="overlay overlay-top-left">`:

```html
      <app-space-switcher />
```

- [ ] **Step 4: Koniec warstwy zgodności**

Usuń z `FamilySyncService` całą sekcję zgodności (`current`, `connected`, `state`, `pending`, `errorMessage`, `lastSyncAt`) i nieużywany import `isShared`. Run: `npx ng build` — kompilator wskaże pozostałe użycia; nie powinno ich być.

- [ ] **Step 5: Build, testy, E2E**

Run: `npx ng build`; `npx ng test --watch=false` → PASS.

E2E: telefon z „Moje" (1 grób) i dwiema mapami (2 i 3 groby):
- pigułka na Starcie i na Mapie pokazuje nazwę aktywnej mapy i awatary;
- panel: trzy mapy z liczbami grobów, ✓ przy aktywnej; wybór innej → lista na Starcie i pinezki na Mapie zmieniają się na jej groby;
- telefon tylko z „Moje" → pigułki brak; widok Mapy mieści się na 375 px szerokości bez poziomego przewijania (`resize_window` mobile).

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: przełącznik map na Starcie i Mapie"
```

### Task B8: Szczegóły grobu — kto zmienił, przenoszenie i kopie, tryb tylko do odczytu

**Files:**
- Modify: `src/app/core/services/space.service.ts`, `src/app/features/graves/pages/grave-details/grave-details-page.component.ts`, `.html`, `.scss`; `src/app/features/home/home-page.component.ts`, `.html`, `.scss`

**Interfaces:**
- Consumes: `IndexedDbService.moveGraves`, `copyGraveTo`, `hasPhotoBlob`, `putPhotoBlob`, `getGrave` (B4); `FamilyApi.photo` (B4); `SpaceService.members`, `loadMembers`, `readOnly`, `forget` (B4/B6); `relativeTime` (B1); `AvatarComponent`.
- Produces: `SpaceService.moveGrave(graveId, toSpaceId)`, `copyGrave(graveId, toSpaceId): Promise<{ skippedPhotos: number }>`, `ensurePhotoBytes(graveId): Promise<number>` (liczba brakujących po próbie).

- [ ] **Step 1: `SpaceService` — przenoszenie i kopie**

```ts
  /**
   * Dociąga do telefonu brakujące bajty zdjęć grobu z jego mapy.
   * Zwraca, ilu wariantów nadal brakuje (np. bez internetu).
   */
  async ensurePhotoBytes(graveId: string): Promise<number> {
    const grave = await this.db.getGrave(graveId);
    const spaceId = await this.db.getGraveSpaceId(graveId);
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    let missing = 0;
    for (const photo of grave?.photos ?? []) {
      if (/^(https?:|data:)/.test(photo.url)) continue;
      for (const variant of ['full', 'thumb'] as const) {
        if (await this.db.hasPhotoBlob(photo.id, variant)) continue;
        const blob = token && navigator.onLine ? await this.api.photo(token, photo.id, variant).catch(() => null) : null;
        if (blob) await this.db.putPhotoBlob(photo.id, variant, blob, null);
        else if (variant === 'full') missing++;
      }
    }
    return missing;
  }

  /** Przenosi grób (ten sam id) na inną mapę. Bez bajtów zdjęć w telefonie odmawia — zginęłyby. */
  async moveGrave(graveId: string, toSpaceId: string): Promise<void> {
    if ((await this.ensurePhotoBytes(graveId)) > 0) {
      throw new Error('Nie wszystkie zdjęcia są w telefonie. Połącz się z internetem i spróbuj ponownie.');
    }
    await this.db.moveGraves([graveId], toSpaceId);
  }

  /** Kopia grobu na inną mapę; zdjęcia, których nie da się pobrać, są pomijane. */
  async copyGrave(graveId: string, toSpaceId: string): Promise<{ skippedPhotos: number }> {
    await this.ensurePhotoBytes(graveId);
    const res = await this.db.copyGraveTo(graveId, toSpaceId);
    return { skippedPhotos: res.skippedPhotos };
  }
```

- [ ] **Step 2: Szczegóły grobu — logika**

W `grave-details-page.component.ts` wstrzyknij `readonly spaces = inject(SpaceService);`, dodaj `AvatarComponent` do `imports` i:

```ts
  readonly readOnly = computed(() => this.spaces.readOnly());

  /** „Ostatnio zmienił(a): Ania · 3 dni temu" — tylko na rodzinnej mapie, gdy znamy osobę. */
  readonly changedBy = computed(() => {
    const g = this.grave();
    const spaceId = this.spaces.activeSpaceId();
    if (!g?.updatedBy || spaceId === LOCAL_SPACE_ID) return null;
    const member = this.spaces.members()[spaceId]?.find((m) => m.id === g.updatedBy);
    return member ? { member, when: relativeTime(new Date(g.updatedAt).getTime()) } : null;
  });

  /** Mapy, na które można przenieść albo skopiować grób. */
  readonly targets = computed(() =>
    this.spaces
      .spaces()
      .filter((s) => s.id !== this.spaces.activeSpaceId() && s.status !== 'removed')
  );
  readonly transferMode = signal<'move' | 'copy' | null>(null);
  readonly transferNote = signal<string | null>(null);

  async transfer(toSpaceId: string): Promise<void> {
    const g = this.grave();
    const mode = this.transferMode();
    const target = this.spaces.spaces().find((s) => s.id === toSpaceId);
    const from = this.spaces.activeSpace();
    if (!g || !mode || !target || !from) return;
    if (mode === 'move' && isShared(from)) {
      const ok = confirm(`„${this.title()}" zniknie z mapy „${from.name}" także u pozostałych osób. Przenieść?`);
      if (!ok) return;
    }
    this.busy.set(true);
    this.transferNote.set(null);
    try {
      if (mode === 'move') {
        await this.spaces.moveGrave(g.id, toSpaceId);
        // Grób jest teraz na mapie docelowej — pokaż ją, żeby szczegóły zostały na ekranie
        this.spaces.setActive(toSpaceId);
        this.transferNote.set(`Przeniesiono na mapę „${target.name}".`);
      } else {
        const { skippedPhotos } = await this.spaces.copyGrave(g.id, toSpaceId);
        const skipped = skippedPhotos > 0 ? ` Pominięto ${skippedPhotos} ${pluralPl(skippedPhotos, 'zdjęcie', 'zdjęcia', 'zdjęć')} — nie ma ich w telefonie.` : '';
        this.transferNote.set(`Skopiowano na mapę „${target.name}".${skipped}`);
      }
      this.transferMode.set(null);
    } catch (err) {
      this.transferNote.set(err instanceof Error ? err.message : 'Nie udało się. Spróbuj ponownie.');
    } finally {
      this.busy.set(false);
    }
  }
```

(importy: `SpaceService`, `AvatarComponent`, `LOCAL_SPACE_ID`, `isShared`, `relativeTime`). W konstruktorze dociągnij członków aktywnej mapy: `this.spaces.loadMembers(this.spaces.activeSpaceId()).catch(() => {});`.

- [ ] **Step 3: Szczegóły grobu — szablon**

- Przyciski „Dodaj zdjęcie", „Usuń to zdjęcie" i link „Edytuj grób" w `.hero__actions` owiń w `@if (!readOnly()) { ... }`.
- Nad przyciskiem „Usuń grób" wstaw:

```html
    @if (changedBy(); as c) {
    <p class="changed-by">
      <app-avatar [name]="c.member.name" [color]="c.member.color" [size]="22" />
      Ostatnio zmienił(a): {{ c.member.name }} · {{ c.when }}
    </p>
    }

    @if (!readOnly() && targets().length > 0) {
    <div class="transfer">
      @if (transferMode(); as mode) {
      <span class="transfer__label">{{ mode === 'move' ? 'Przenieś na mapę:' : 'Kopiuj na mapę:' }}</span>
      @for (t of targets(); track t.id) {
      <button type="button" class="chip" [disabled]="busy()" (click)="transfer(t.id)">{{ t.name }}</button>
      }
      <button type="button" class="chip" (click)="transferMode.set(null)">Anuluj</button>
      } @else {
      <button type="button" class="chip" (click)="transferMode.set('move')">Przenieś do innej mapy</button>
      <button type="button" class="chip" (click)="transferMode.set('copy')">Kopiuj do innej mapy</button>
      }
    </div>
    } @if (transferNote(); as note) {
    <p class="transfer__note" role="status">{{ note }}</p>
    }
```

- Przycisk „Usuń grób" owiń w `@if (!readOnly())`, a przycisk „Odwiedzony" w `.actions` też (Nawiguj zostaje).
- Do `.scss`:

```scss
.changed-by {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-muted);
}

.transfer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  &__label {
    width: 100%;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-muted);
  }

  &__note {
    margin: 0;
    font-size: 13px;
    color: var(--ink-muted);
  }
}
```

- [ ] **Step 4: Start — baner mapy tylko do odczytu**

W `home-page.component.ts` wstrzyknij `readonly spaces = inject(SpaceService);` i dodaj:

```ts
  async forgetRemoved(keep: boolean): Promise<void> {
    const space = this.spaces.activeSpace();
    if (space) await this.spaces.forget(space.id, keep);
  }
```

W `home-page.component.html` przycisk „Dodaj grób" (`routerLink="/graves/add"`) owiń w `@if (!spaces.readOnly())`, a pod `</header>` wstaw:

```html
  @if (spaces.readOnly()) {
  <div class="removed" role="status">
    <p>Nie masz już dostępu do mapy „{{ spaces.activeSpace()?.name }}". Groby są tylko do odczytu.</p>
    <div class="removed__actions">
      <button type="button" class="pill-btn pill-btn--dark" (click)="forgetRemoved(true)">Zachowaj w „Moje"</button>
      <button type="button" class="pill-btn pill-btn--light" (click)="forgetRemoved(false)">Usuń z telefonu</button>
    </div>
  </div>
  }
```

i w `.scss`:

```scss
.removed {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: var(--radius-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 14px;

  p {
    margin: 0;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
```

Pusty Start („Dodaj pierwszy grób") też owiń warunkiem `!spaces.readOnly()`, jeśli ma link do dodawania.

- [ ] **Step 5: Build, testy, E2E**

Run: `npx ng build`; `npx ng test --watch=false` → PASS.

E2E (lokalny Worker, dwa konteksty, mapy z B6):
1. A (Moje + mapa X): grób w „Moje" ze zdjęciem → „Przenieś do innej mapy" → X → szczegóły nadal widoczne, aktywna X; w B (członek X) po synchronizacji grób **ze zdjęciem** jest na X.
2. B: edytuje grób → A po synchronizacji widzi „Ostatnio zmienił(a): Ania · przed chwilą".
3. **Bez bajtów zdjęć:** w nowym kontekście C dołącz do X, w DevTools/`browser_evaluate` usuń z `photoBlobs` bajty zdjęcia tego grobu, przejdź w tryb offline (`context.setOffline(true)`), „Przenieś do innej mapy" → „Moje" → komunikat „Nie wszystkie zdjęcia są w telefonie…", grób zostaje na X. Online → przeniesienie się udaje, zdjęcie widoczne w „Moje".
4. „Kopiuj do innej mapy" → na mapie docelowej nowy grób z tymi samymi danymi i zdjęciem; usunięcie kopii nie rusza oryginału.
5. Członek usunięty z X: Start pokazuje baner, brak „Dodaj grób", w szczegółach brak edycji/usuwania/„Odwiedzony"; „Zachowaj w »Moje«" → groby w „Moje", baner znika.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: kto zmienił grób, przenoszenie i kopie między mapami, mapa tylko do odczytu"
```

### Task B9: Weryfikacja końcowa, build produkcyjny i PR

**Files:**
- Modify: `frontend/grave-app-front/README.md` (sekcja o rodzinnych mapach, jeśli istnieje — inaczej pomiń), `CLAUDE.md` w repo nadrzędnym nie wymaga zmian.

- [ ] **Step 1: Pełny zestaw testów i lint typów**

Run: `npx ng test --watch=false` → PASS; `npx ng build` → bez błędów i bez ostrzeżeń o budżecie powyżej dotychczasowych.

- [ ] **Step 2: Build produkcyjny**

`npx ng build` (konfiguracja prod), `preview_start grave-app-dist` (4270): aplikacja się ładuje, w konsoli brak błędów, `grep -r "localhost:8791" dist/grave-app-front/browser` → brak trafień (CI i tak to sprawdza). **Nie** wykonuj akcji rodzinnych na tym buildzie — mówi do produkcyjnego API.

- [ ] **Step 3: Przegląd scenariuszy z Review Focus**

Potwierdź (testy jednostkowe + E2E z B4–B8), że każdy z 5 punktów sekcji „Review Focus" ma dowód; dopisz brakujący scenariusz, jeśli któregoś nie przeszedłeś.

- [ ] **Step 4: PR (bez merge'a)**

```bash
git push -u origin feature/rodzina-front
gh pr create --repo kacperk72/grave-app --base main --title "Rodzinne mapy: członkowie, wiele map, przełącznik" --body-file -
```

Treść: co widzi użytkownik (podpis, lista członków, przełącznik, przenoszenie), migracja Dexie v5 (bez utraty danych, mapa czeka na podpis), zależność od PR z API (musi być wdrożony pierwszy), jak przetestowano, lista kroków po wdrożeniu, na końcu `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Merge decyduje użytkownik.

- [ ] **Step 5: Po wdrożeniu (z użytkownikiem)**

1. Użytkownik otwiera aplikację na swoim telefonie **jako pierwszy** → podpis → zostaje założycielem → nazywa mapę.
2. Sprawdzenie w D1 (Cloudflare MCP `d1_database_query`, tylko SELECT): `SELECT name, role, removed_at FROM members WHERE space_id = (SELECT space_id FROM members WHERE role = 'owner' ORDER BY joined_at LIMIT 1)` — jeden `owner` i to użytkownik. Jeśli założycielem został ktoś inny — użytkownik decyduje: przekazanie roli w aplikacji (prośba do tej osoby) albo ręczna poprawka w D1 za jego zgodą.
3. `ALLOW_INVITE_AS_MEMBER=false` dopiero później, osobnym PR, gdy wszyscy członkowie mają wpis w `members`.
