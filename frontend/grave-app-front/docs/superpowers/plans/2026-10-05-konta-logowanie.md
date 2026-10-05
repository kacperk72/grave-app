# Konta (e-mail i hasło) — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opcjonalne konto (e-mail + hasło, kod z maila do potwierdzenia adresu i resetu), które przypina mapy rodzinne i prywatną „Moje” do osoby, a nie do przeglądarki.

**Architecture:** Worker dostaje użytkowników, sesje (token `Bearer`), kody z maila (Resend) i hasła PBKDF2. Członek mapy może mieć wiele kluczy urządzeń (`member_tokens`), więc logowanie na nowym urządzeniu wydaje mu klucz do każdej mapy konta, a logowanie z urządzenia z innym członkiem tej samej mapy scala ich w jednego. „Moje” po zalogowaniu to mapa `personal` na serwerze — ten sam mechanizm synchronizacji co mapa rodzinna. Dwa PR-y: najpierw API (zgodne wstecz), potem front.

**Tech Stack:** Cloudflare Worker + D1 + KV (TypeScript, wrangler 4), WebCrypto (PBKDF2, SHA-256), Resend HTTP API, Angular 21 zoneless (signals, standalone, OnPush), Dexie 4, Vitest.

**Spec:** `frontend/grave-app-front/docs/superpowers/specs/2026-10-05-konta-logowanie-design.md`

## Global Constraints

- **Push na `main` = wydanie produkcyjne** (front: Hostinger, API: Cloudflare z migracjami D1). Gałęzie + PR; merge tylko za zgodą użytkownika.
- **Migracja niczego nie usuwa ani nie nadpisuje** w istniejących wierszach (tylko nowe tabele/kolumny i kopia kluczy do `member_tokens`). `members.token_hash` zostaje i nadal jest wypełniane.
- **Nigdy nie testuj na produkcji** (test dymny, E2E). Lokalnie: `grave-app-api` (8791, `MAIL_MODE=log`) i `grave-app` (4260) z `.claude/launch.json`. Bez grobów testowych w aplikacji; groby do testów wstrzykiwane do IndexedDB w izolowanych kontekstach.
- **Darmowy plan Cloudflare, bez karty.** Hasła: PBKDF2-SHA256, sól 16 B, **20 000 iteracji** (`PASSWORD_ITERATIONS`), algorytm i liczba iteracji zapisane przy haśle.
- Hasło **8–128 znaków**; blokada logowania **15 minut po 5** błędnych hasłach; kod z maila: **6 cyfr, 15 minut, 5 prób, 5 próśb na godzinę na adres**; `setupToken` ważny **15 minut**, jednorazowy; sesja **365 dni**, przedłużana najwyżej raz na dobę.
- Komunikaty: logowanie zawsze „E-mail lub hasło są nieprawidłowe” (401); `/auth/request` zawsze 202 tą samą treścią; blokada 429 „Za dużo prób. Spróbuj za kilkanaście minut albo ustaw nowe hasło.”
- W bazie tylko SHA-256 kodów, linków, `setupToken`, sesji i kluczy członków; hasła tylko jako hash PBKDF2. Nic z tego nie trafia do logów — poza trybem `MAIL_MODE=log`, który działa wyłącznie, gdy wszystkie `ALLOWED_ORIGINS` to `http://localhost:*`.
- Mail: nadawca `znajdzgroby.pl <logowanie@znajdzgroby.pl>`, temat „Kod logowania do znajdzgroby.pl: 123 456”, link `<APP_URL>/logowanie#<link>`.
- Front: `npm ci --legacy-peer-deps`; Angular: standalone, `inject()`, signals, `@if/@for`, OnPush; Prettier 100 znaków, pojedyncze cudzysłowy; teksty po polsku.
- Nazw `GraveMapDB` i kluczy `gravemap-*` nie zmieniać. Nowe klucze `localStorage`: `znajdzgroby-session`, `znajdzgroby-login-banner`, `znajdzgroby-last-link`.

## Review Focus

1. **Wygasła albo nieważna sesja** — `POST /account/link` zwraca 401: aplikacja zachowuje groby, czyści sesję i pokazuje stan „niezalogowany” zamiast błędu (Task 6, E2E w Task 9).
2. **Wielkie litery i spacje w e-mailu** („ Kacper@Example.com”) — to samo konto przy zakładaniu, logowaniu i resecie (Task 2: test dymny).
3. **Codzienne `link()` z tego samego urządzenia** nie mnoży kluczy urządzeń — liczba `member_tokens` członka się nie zmienia (Task 3: test dymny).
4. **Wylogowanie z niewysłanymi zmianami** — ostrzeżenie i możliwość rezygnacji; dane nie znikają po cichu (Task 8: E2E).
5. **Klucz członka należący do innego konta** przesłany w `link` — nie jest przejmowany ani scalany (Task 3: test dymny).

---

## Część A — API (PR 1, gałąź `feat/konta-api` od `main`)

Pracuj w `grave-app/worker`. Test: `npm run typecheck` i `npm run smoke` (Worker uruchomiony przez `preview_start` `grave-app-api`; po zmianie `package.json`/`wrangler.jsonc` zrestartuj podgląd).

### Task 1 (A1): Migracja 0005 i klucze urządzeń członków

**Files:**
- Create: `worker/migrations/0005_accounts.sql`
- Modify: `worker/src/auth.ts`, `worker/src/members.ts`, `worker/scripts/smoke.mjs`

**Interfaces:**
- Produces: tabele `users`, `sessions`, `login_codes`, `member_tokens`; kolumny `members.user_id`, `members.merged_into`, `spaces.kind`, `spaces.owner_user_id`; `Space.kind: 'family' | 'personal'`; `insertMember(env, m) → D1PreparedStatement[]` (członek + jego klucz w `member_tokens`); `NewMember.userId?: string | null`.

- [ ] **Step 1: Test dymny — nowy członek ma klucz w `member_tokens`**

W `smoke.mjs` dodaj pomocnika i sekcję (przed `const legacyToken = await legacy();`):

```js
/** Wykonuje zapytanie zmieniające dane w lokalnej D1 (tylko testy lokalne). */
function sqlRun(query) {
  execSync(`npx wrangler d1 execute grave-app --local --command "${query}"`, { cwd: workerDir, encoding: 'utf8' });
}

/** Każdy członek ma klucz urządzenia w member_tokens — także ci sprzed migracji (kopia). */
async function memberTokens() {
  const created = await call('POST', '/spaces', { body: { name: 'Klucze', member: { name: 'Ala', color: 'sky' } } });
  const joined = await call('POST', '/join', { token: created.data.invite, body: { name: 'Ola', color: 'rose' } });
  check('nowy członek ma klucz w member_tokens', sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${joined.data.memberId}'`) === 1);
  check('założyciel ma klucz w member_tokens', sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${created.data.memberId}'`) === 1);
  const space = await call('GET', '/space', { token: joined.data.memberToken });
  check('klucz z member_tokens działa', space.status === 200 && space.data.me?.id === joined.data.memberId, space);
  check('każdy członek ma co najmniej jeden klucz', sql('SELECT COUNT(*) AS n FROM members m WHERE NOT EXISTS (SELECT 1 FROM member_tokens t WHERE t.member_id = m.id)') === 0);
}
```

i wywołanie `await memberTokens();` po `await legacyDelete();`.

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npm run smoke` → FAIL (`no such table: member_tokens`).

- [ ] **Step 3: Migracja `worker/migrations/0005_accounts.sql`**

```sql
-- Konta: użytkownicy z hasłem, sesje urządzeń, kody z maila (potwierdzenie adresu / nowe hasło).
-- Migracja tylko dodaje: istniejący członkowie, groby i zdjęcia zostają bez zmian.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algo TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  link_hash TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  setup_hash TEXT UNIQUE,
  setup_expires_at INTEGER
);
CREATE INDEX login_codes_email ON login_codes (email, created_at);

-- Wiele urządzeń (kluczy) na jednego członka mapy; obecne klucze kopiujemy 1:1
CREATE TABLE member_tokens (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX member_tokens_member ON member_tokens (member_id);
INSERT INTO member_tokens (token_hash, member_id, created_at)
  SELECT token_hash, id, joined_at FROM members;

ALTER TABLE members ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE members ADD COLUMN merged_into TEXT;
CREATE UNIQUE INDEX members_one_per_user ON members (space_id, user_id)
  WHERE user_id IS NOT NULL AND removed_at IS NULL;

ALTER TABLE spaces ADD COLUMN kind TEXT NOT NULL DEFAULT 'family';
ALTER TABLE spaces ADD COLUMN owner_user_id TEXT REFERENCES users(id);
CREATE UNIQUE INDEX spaces_one_personal ON spaces (owner_user_id) WHERE kind = 'personal';
```

Run: `npm run db:migrate:local` → „0005_accounts.sql ✅”.

- [ ] **Step 4: `auth.ts` — klucz członka z `member_tokens`, `kind` mapy**

- `interface Space` dostaje `kind: 'family' | 'personal';`.
- Zapytanie w `authenticate()`:

```ts
  const row = await env.DB.prepare(
    `SELECT m.id, m.space_id, m.name, m.color, m.role, m.removed_at, s.rev, s.name AS space_name, s.kind
       FROM member_tokens t
       JOIN members m ON m.id = t.member_id
       JOIN spaces s ON s.id = m.space_id
      WHERE t.token_hash = ?`
  )
```

  (typ wiersza + `kind: 'family' | 'personal'`; w zwracanym `space` dodaj `kind: row.kind`).
- `findSpaceByInvite`: `'SELECT id, rev, name, kind FROM spaces WHERE token_hash = ?'`.
- `spaceFromInvite`: mapa prywatna nie ma zaproszeń —

```ts
  if (!space || space.kind === 'personal') throw new HttpError(401, 'Link do rodzinnej mapy jest nieaktualny');
```

  oraz w ścieżce dostępu przejściowego w `authenticate()` pomiń mapy `personal` (`if (space && space.kind !== 'personal')`).

- [ ] **Step 5: `members.ts` — `insertMember` zapisuje też klucz urządzenia**

```ts
interface NewMember {
  id: string;
  spaceId: string;
  tokenHash: string;
  name: string;
  color: string;
  role: 'owner' | 'member';
  userId?: string | null;
}

/** Członek i jego pierwszy klucz urządzenia. `members.token_hash` zostaje wypełnione (powrót do starszej wersji). */
export function insertMember(env: Env, m: NewMember): D1PreparedStatement[] {
  const now = Date.now();
  return [
    env.DB.prepare(
      `INSERT INTO members (id, space_id, token_hash, name, color, role, joined_at, last_seen_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(m.id, m.spaceId, m.tokenHash, m.name, m.color, m.role, now, now, m.userId ?? null),
    env.DB.prepare('INSERT INTO member_tokens (token_hash, member_id, created_at) VALUES (?, ?, ?)').bind(
      m.tokenHash,
      m.id,
      now
    ),
  ];
}
```

W `createSpace`: `await env.DB.batch([insertSpace(name), ...insertMember(env, {...})]);`. W `joinSpace` oba wywołania `await insertMember(env, member).run();` zamień na `await env.DB.batch(insertMember(env, member));` (wyłapanie `UNIQUE` przy dwóch założycielach zostaje).

- [ ] **Step 6: Typy i test dymny**

Run: `npm run typecheck` → bez błędów; `npm run smoke` → `wszystko ok` (stare sekcje też przechodzą — klucze idą teraz przez `member_tokens`).

- [ ] **Step 7: Commit**

```bash
git add worker
git commit -m "feat(api): migracja kont i klucze urządzeń członków (member_tokens)"
```

### Task 2 (A2): Hasła, kody z maila, logowanie i sesje

**Files:**
- Create: `worker/src/password.ts`, `worker/src/mail.ts`, `worker/src/accounts.ts`
- Modify: `worker/src/index.ts` (Env, trasy), `worker/src/http.ts` (CORS `X-Session`), `worker/wrangler.jsonc`, `worker/package.json`, `worker/scripts/smoke.mjs`

**Interfaces:**
- Consumes: `HttpError`, `json`, `readJson` (http), `newToken`, `sha256` (util), tabele z Task 1.
- Produces: `password.ts` — `PASSWORD_ALGO`, `PASSWORD_ITERATIONS`, `randomBase64(bytes)`, `hashPassword(password, saltB64, iterations)`, `verifyPassword(password, stored)`, `needsRehash(algo, iterations)`, `checkPassword(value)`; `mail.ts` — `mailMode(env)`, `sendLoginMail(env, { email, code, link })`; `accounts.ts` — `normalizeEmail(value)`, `requestCode`, `verifyCode`, `setPassword`, `login`, `logout`, `userFromSession(env, token)`, `requireUser(request, env)`, `createSession(env, userId)`; Env: `MAIL_MODE?`, `RESEND_API_KEY?`, `APP_URL`.
- Kontrakt HTTP: patrz tabela w specyfikacji („Endpointy konta”).

- [ ] **Step 1: Konfiguracja trybu deweloperskiego**

`package.json`, skrypt `dev` — dopisz `MAIL_MODE` i `APP_URL`:

```json
"dev": "wrangler dev --port 8791 --test-scheduled --var ALLOWED_ORIGINS:http://localhost:4260,http://localhost:4200,http://localhost:4270 --var MAIL_MODE:log --var APP_URL:http://localhost:4260",
```

`wrangler.jsonc`, w `vars`:

```jsonc
    // Adres aplikacji w linkach z maili (lokalnie nadpisywany w `npm run dev`)
    "APP_URL": "https://znajdzgroby.pl",
    // Wysyłka maili: "resend" (produkcja, sekret RESEND_API_KEY) albo "log" (tylko lokalnie)
    "MAIL_MODE": "resend"
```

Zrestartuj `grave-app-api`.

- [ ] **Step 2: Test dymny kont**

W `smoke.mjs` dodaj (przed `const legacyToken`):

```js
/** Zakłada konto: kod z odpowiedzi trybu deweloperskiego → hasło → sesja. */
async function register(email, password) {
  const req = await call('POST', '/auth/request', { body: { email } });
  const ver = await call('POST', '/auth/verify', { body: { email, code: req.data?.dev?.code } });
  const set = await call('POST', '/auth/password', { body: { setupToken: ver.data?.setupToken, password } });
  return set.data?.session;
}

/** Zakładanie konta, logowanie, blokada, nowe hasło, wylogowanie. */
async function accounts() {
  const email = `ala-${Date.now()}@example.com`;
  const bad = await call('POST', '/auth/request', { body: { email: 'zly-adres' } });
  check('zły e-mail: 400', bad.status === 400, bad);

  const r1 = await call('POST', '/auth/request', { body: { email } });
  check('prośba o kod: 202 + kod w trybie deweloperskim', r1.status === 202 && /^\d{6}$/.test(r1.data?.dev?.code ?? ''), r1);
  const code = r1.data.dev.code;
  const wrongCode = code === '000000' ? '111111' : '000000';
  const wrong = await call('POST', '/auth/verify', { body: { email, code: wrongCode } });
  check('zły kod: 401', wrong.status === 401, wrong);
  const ver = await call('POST', '/auth/verify', { body: { email: ` ${email.toUpperCase()} `, code } });
  check('dobry kod (e-mail z wielkich liter i spacjami): setupToken', ver.status === 200 && typeof ver.data?.setupToken === 'string', ver);
  const again = await call('POST', '/auth/verify', { body: { email, code } });
  check('kod jednorazowy: 401', again.status === 401, again);

  const short = await call('POST', '/auth/password', { body: { setupToken: ver.data.setupToken, password: 'krotkie' } });
  check('hasło krótsze niż 8 znaków: 400', short.status === 400, short);
  const set = await call('POST', '/auth/password', { body: { setupToken: ver.data.setupToken, password: 'dobrehaslo1' } });
  check('ustawienie hasła: sesja', set.status === 200 && typeof set.data?.session === 'string' && set.data.user?.email === email, set);
  const reuseSetup = await call('POST', '/auth/password', { body: { setupToken: ver.data.setupToken, password: 'innehaslo1' } });
  check('setupToken jednorazowy: 401', reuseSetup.status === 401, reuseSetup);

  const acc = await call('GET', '/account', { token: set.data.session });
  check('GET /account z sesją', acc.status === 200 && acc.data?.user?.email === email, acc);

  const badPw = await call('POST', '/auth/login', { body: { email, password: 'zlehaslo00' } });
  const noUser = await call('POST', '/auth/login', { body: { email: `nikt-${Date.now()}@example.com`, password: 'dobrehaslo1' } });
  check('złe hasło i brak konta: ten sam 401', badPw.status === 401 && noUser.status === 401 && badPw.data?.error === noUser.data?.error, [badPw, noUser]);
  const okLogin = await call('POST', '/auth/login', { body: { email: email.toUpperCase(), password: 'dobrehaslo1' } });
  check('logowanie (wielkie litery w e-mailu)', okLogin.status === 200 && typeof okLogin.data?.session === 'string', okLogin);

  // Przeliczenie hasha po podniesieniu liczby iteracji
  sqlRun(`UPDATE users SET password_iterations = 1000 WHERE email = '${email}'`);
  await call('POST', '/auth/login', { body: { email, password: 'dobrehaslo1' } });
  check('słabszy hash przeliczony przy logowaniu', sql(`SELECT password_iterations AS n FROM users WHERE email = '${email}'`) === 20000);

  for (let i = 0; i < 5; i++) await call('POST', '/auth/login', { body: { email, password: 'zlehaslo00' } });
  const locked = await call('POST', '/auth/login', { body: { email, password: 'dobrehaslo1' } });
  check('blokada po 5 złych hasłach: 429', locked.status === 429, locked);

  // Nowe hasło: zdejmuje blokadę i wylogowuje inne urządzenia
  const r2 = await call('POST', '/auth/request', { body: { email } });
  const link = r2.data.dev.link.split('#')[1];
  const ver2 = await call('POST', '/auth/verify', { body: { link } });
  check('potwierdzenie linkiem', ver2.status === 200 && typeof ver2.data?.setupToken === 'string', ver2);
  const reset = await call('POST', '/auth/password', { body: { setupToken: ver2.data.setupToken, password: 'nowehaslo22' } });
  check('nowe hasło: sesja', reset.status === 200, reset);
  const oldSession = await call('GET', '/account', { token: set.data.session });
  check('nowe hasło wylogowuje inne urządzenia', oldSession.status === 401, oldSession);
  const loginNew = await call('POST', '/auth/login', { body: { email, password: 'nowehaslo22' } });
  check('logowanie nowym hasłem po blokadzie', loginNew.status === 200, loginNew);

  // 5 złych kodów unieważnia kod
  const r3 = await call('POST', '/auth/request', { body: { email } });
  for (let i = 0; i < 5; i++) await call('POST', '/auth/verify', { body: { email, code: r3.data.dev.code === '000000' ? '111111' : '000000' } });
  const afterAttempts = await call('POST', '/auth/verify', { body: { email, code: r3.data.dev.code } });
  check('po 5 złych kodach dobry kod nie działa', afterAttempts.status === 401, afterAttempts);

  // Limit 5 próśb o kod na godzinę (r1, r2, r3 + 2 = 5; szósta bez wysyłki)
  await call('POST', '/auth/request', { body: { email } });
  await call('POST', '/auth/request', { body: { email } });
  const limited = await call('POST', '/auth/request', { body: { email } });
  check('limit próśb: 202 bez kodu', limited.status === 202 && !limited.data?.dev, limited);

  const out = await call('POST', '/auth/logout', { token: loginNew.data.session });
  const afterOut = await call('GET', '/account', { token: loginNew.data.session });
  check('wylogowanie', out.status === 200 && afterOut.status === 401, afterOut);
}
```

Wywołanie `await accounts();` na końcu listy sekcji.

- [ ] **Step 3: Uruchom — ma nie przejść**

Run: `npm run smoke` → FAIL od „zły e-mail: 400” (404).

- [ ] **Step 4: `worker/src/password.ts`**

```ts
import { HttpError } from './http';

/** Hasła: PBKDF2-SHA256 z WebCrypto. Liczba iteracji ograniczona przez 10 ms CPU darmowego Workera. */
export const PASSWORD_ALGO = 'pbkdf2-sha256';
export const PASSWORD_ITERATIONS = 20_000;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

export interface StoredPassword {
  password_hash: string;
  password_salt: string;
  password_algo: string;
  password_iterations: number;
}

export function randomBase64(bytes: number): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export async function hashPassword(password: string, saltB64: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(saltB64), iterations },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

/** Porównanie w stałym czasie — czas odpowiedzi nie zdradza, ile bajtów się zgadza. */
export async function verifyPassword(password: string, stored: StoredPassword): Promise<boolean> {
  const actual = fromBase64(await hashPassword(password, stored.password_salt, stored.password_iterations));
  const expected = fromBase64(stored.password_hash);
  if (actual.byteLength !== expected.byteLength) return false;
  return crypto.subtle.timingSafeEqual(actual, expected);
}

export function needsRehash(algo: string, iterations: number): boolean {
  return algo !== PASSWORD_ALGO || iterations < PASSWORD_ITERATIONS;
}

export function checkPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD || value.length > MAX_PASSWORD) {
    throw new HttpError(400, `Hasło musi mieć od ${MIN_PASSWORD} do ${MAX_PASSWORD} znaków`);
  }
  return value;
}
```

- [ ] **Step 5: `worker/src/mail.ts`**

```ts
import type { Env } from './index';
import { HttpError } from './http';

export interface LoginMail {
  email: string;
  code: string;
  link: string;
}

/**
 * „log” wypisuje kod zamiast wysyłać maila — wyłącznie lokalnie. Jeśli ktoś przez pomyłkę
 * ustawi go na produkcji (adresy inne niż localhost), Worker i tak wysyła przez Resend.
 */
export function mailMode(env: Env): 'resend' | 'log' {
  const localOnly = env.ALLOWED_ORIGINS.split(',').every((o) => o.trim().startsWith('http://localhost:'));
  return env.MAIL_MODE === 'log' && localOnly ? 'log' : 'resend';
}

/** Wysyła kod; w trybie „log” zwraca go (dla testu dymnego). */
export async function sendLoginMail(env: Env, mail: LoginMail): Promise<{ code: string; link: string } | undefined> {
  if (mailMode(env) === 'log') {
    console.log(`[mail:log] ${mail.email} kod=${mail.code} link=${mail.link}`);
    return { code: mail.code, link: mail.link };
  }
  if (!env.RESEND_API_KEY) throw new HttpError(503, 'Logowanie jest chwilowo niedostępne');
  const pretty = `${mail.code.slice(0, 3)} ${mail.code.slice(3)}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'znajdzgroby.pl <logowanie@znajdzgroby.pl>',
      to: [mail.email],
      subject: `Kod logowania do znajdzgroby.pl: ${pretty}`,
      text:
        `Twój kod do znajdzgroby.pl: ${pretty}\n\n` +
        `Albo kliknij: ${mail.link}\n\n` +
        'Kod jest ważny 15 minut. Jeśli to nie Ty — zignoruj tę wiadomość.',
    }),
  });
  if (!res.ok) {
    console.error('Resend', res.status, await res.text().catch(() => ''));
    throw new HttpError(502, 'Nie udało się wysłać maila. Spróbuj za chwilę.');
  }
  return undefined;
}
```

- [ ] **Step 6: `worker/src/accounts.ts` (część 1: logowanie)**

```ts
import type { Env } from './index';
import { HttpError, json, readJson } from './http';
import { newToken, sha256 } from './util';
import { sendLoginMail } from './mail';
import {
  PASSWORD_ALGO,
  PASSWORD_ITERATIONS,
  checkPassword,
  hashPassword,
  needsRehash,
  randomBase64,
  verifyPassword,
} from './password';

const MINUTE = 60_000;
const CODE_TTL_MS = 15 * MINUTE;
const SETUP_TTL_MS = 15 * MINUTE;
const MAX_CODE_REQUESTS_PER_HOUR = 5;
const MAX_CODE_ATTEMPTS = 5;
const MAX_LOGIN_FAILURES = 5;
const LOCK_MS = 15 * MINUTE;
const SESSION_TTL_MS = 365 * 24 * 60 * MINUTE;
const SESSION_TOUCH_MS = 24 * 60 * MINUTE;
const BAD_LOGIN = 'E-mail lub hasło są nieprawidłowe';
const BAD_CODE = 'Kod jest nieprawidłowy albo wygasł';
// Atrapa soli: przy nieistniejącym koncie liczymy hash tak samo długo, jak przy istniejącym
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA==';

export interface User {
  id: string;
  email: string;
}

/** Przycięty, małymi literami, prosta postać x@y.z; null = niepoprawny. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function bearer(request: Request): string {
  const header = request.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function sixDigits(): string {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = newToken();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(await sha256(token), userId, now, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

/** Użytkownik z tokenu sesji albo null (zły lub wygasły). Przedłuża sesję najwyżej raz na dobę. */
export async function userFromSession(env: Env, token: string): Promise<User | null> {
  if (!token) return null;
  const hash = await sha256(token);
  const now = Date.now();
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(hash, now)
    .first<{ id: string; email: string; last_seen_at: number }>();
  if (!row) return null;
  if (row.last_seen_at < now - SESSION_TOUCH_MS) {
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(now, now + SESSION_TTL_MS, hash)
      .run();
  }
  return { id: row.id, email: row.email };
}

export async function requireUser(request: Request, env: Env): Promise<User> {
  const user = await userFromSession(env, bearer(request));
  if (!user) throw new HttpError(401, 'Sesja wygasła — zaloguj się ponownie');
  return user;
}

export async function requestCode(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) throw new HttpError(400, 'Podaj poprawny adres e-mail');

  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_codes WHERE email = ? AND created_at > ?')
    .bind(email, now - 60 * MINUTE)
    .first<{ n: number }>();
  // Ta sama odpowiedź przy limicie — nie zdradzamy niczego o adresie
  if ((recent?.n ?? 0) >= MAX_CODE_REQUESTS_PER_HOUR) return json({ ok: true }, 202);

  const code = sixDigits();
  const link = newToken();
  await env.DB.prepare(
    `INSERT INTO login_codes (id, email, code_hash, link_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), email, await sha256(code), await sha256(link), now, now + CODE_TTL_MS)
    .run();
  const dev = await sendLoginMail(env, { email, code, link: `${env.APP_URL}/logowanie#${link}` });
  return json({ ok: true, ...(dev ? { dev } : {}) }, 202);
}

export async function verifyCode(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as { email?: unknown; code?: unknown; link?: unknown } | null;
  const now = Date.now();
  type CodeRow = { id: string; email: string; code_hash: string; attempts: number; expires_at: number; used_at: number | null };

  let row: CodeRow | null = null;
  if (typeof body?.link === 'string' && body.link) {
    row = await env.DB.prepare(
      'SELECT id, email, code_hash, attempts, expires_at, used_at FROM login_codes WHERE link_hash = ?'
    )
      .bind(await sha256(body.link))
      .first<CodeRow>();
  } else {
    const email = normalizeEmail(body?.email);
    if (!email || typeof body?.code !== 'string') throw new HttpError(401, BAD_CODE);
    row = await env.DB.prepare(
      `SELECT id, email, code_hash, attempts, expires_at, used_at FROM login_codes
        WHERE email = ? ORDER BY created_at DESC LIMIT 1`
    )
      .bind(email)
      .first<CodeRow>();
    if (row && row.used_at === null && row.expires_at > now && row.attempts < MAX_CODE_ATTEMPTS) {
      if ((await sha256(body.code.trim())) !== row.code_hash) {
        await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
        throw new HttpError(401, BAD_CODE);
      }
    }
  }
  if (!row || row.used_at !== null || row.expires_at <= now || row.attempts >= MAX_CODE_ATTEMPTS) {
    throw new HttpError(401, BAD_CODE);
  }

  const setupToken = newToken();
  await env.DB.prepare('UPDATE login_codes SET used_at = ?, setup_hash = ?, setup_expires_at = ? WHERE id = ?')
    .bind(now, await sha256(setupToken), now + SETUP_TTL_MS, row.id)
    .run();
  return json({ setupToken, email: row.email });
}

export async function setPassword(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as { setupToken?: unknown; password?: unknown } | null;
  const password = checkPassword(body?.password);
  const now = Date.now();
  const setupHash = typeof body?.setupToken === 'string' ? await sha256(body.setupToken) : '';
  const code = await env.DB.prepare('SELECT id, email FROM login_codes WHERE setup_hash = ? AND setup_expires_at > ?')
    .bind(setupHash, now)
    .first<{ id: string; email: string }>();
  if (!code) throw new HttpError(401, 'Czas na ustawienie hasła minął — poproś o nowy kod');

  const salt = randomBase64(16);
  const hash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(code.email).first<{ id: string }>();
  const userId = existing?.id ?? crypto.randomUUID();
  await env.DB.batch([
    existing
      ? env.DB.prepare(
          `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?, password_iterations = ?,
             failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?`
        ).bind(hash, salt, PASSWORD_ALGO, PASSWORD_ITERATIONS, now, userId)
      : env.DB.prepare(
          `INSERT INTO users (id, email, password_hash, password_salt, password_algo, password_iterations, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(userId, code.email, hash, salt, PASSWORD_ALGO, PASSWORD_ITERATIONS, now, now),
    // Nowe hasło wylogowuje wszystkie urządzenia; setupToken jednorazowy
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    env.DB.prepare('UPDATE login_codes SET setup_hash = NULL WHERE id = ?').bind(code.id),
  ]);
  const session = await createSession(env, userId);
  return json({ session, user: { id: userId, email: code.email } });
}

export async function login(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  const now = Date.now();
  const user = email
    ? await env.DB.prepare(
        `SELECT id, email, password_hash, password_salt, password_algo, password_iterations, failed_logins, locked_until
           FROM users WHERE email = ?`
      )
        .bind(email)
        .first<{
          id: string;
          email: string;
          password_hash: string;
          password_salt: string;
          password_algo: string;
          password_iterations: number;
          failed_logins: number;
          locked_until: number | null;
        }>()
    : null;

  if (!user) {
    await hashPassword(password, DUMMY_SALT, PASSWORD_ITERATIONS);
    throw new HttpError(401, BAD_LOGIN);
  }
  if (user.locked_until && user.locked_until > now) {
    throw new HttpError(429, 'Za dużo prób. Spróbuj za kilkanaście minut albo ustaw nowe hasło.');
  }
  if (!(await verifyPassword(password, user))) {
    const failures = user.failed_logins + 1;
    await env.DB.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')
      .bind(failures >= MAX_LOGIN_FAILURES ? 0 : failures, failures >= MAX_LOGIN_FAILURES ? now + LOCK_MS : null, user.id)
      .run();
    throw new HttpError(401, BAD_LOGIN);
  }

  if (needsRehash(user.password_algo, user.password_iterations)) {
    const salt = randomBase64(16);
    const hash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
    await env.DB.prepare(
      `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?, password_iterations = ?, updated_at = ?
        WHERE id = ?`
    )
      .bind(hash, salt, PASSWORD_ALGO, PASSWORD_ITERATIONS, now, user.id)
      .run();
  }
  if (user.failed_logins > 0 || user.locked_until) {
    await env.DB.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').bind(user.id).run();
  }
  const session = await createSession(env, user.id);
  return json({ session, user: { id: user.id, email: user.email } });
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const token = bearer(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true });
}

export async function getAccount(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const { results } = await env.DB.prepare(
    `SELECT s.id AS spaceId, s.kind, s.name, m.role, m.id AS memberId
       FROM members m JOIN spaces s ON s.id = m.space_id
      WHERE m.user_id = ? AND m.removed_at IS NULL
      ORDER BY s.kind = 'personal' DESC, m.joined_at`
  )
    .bind(user.id)
    .all();
  return json({ user, spaces: results });
}
```

Uwaga: przy rehashu w ścieżce blokady (5. błędne hasło) liczymy `failed_logins` od zera po nałożeniu blokady — wtedy kolejne 5 prób po jej wygaśnięciu znów blokuje.

- [ ] **Step 7: Trasy, Env, CORS**

`http.ts`: `'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Session',`.

`index.ts`: w `interface Env` dodaj:

```ts
  /** Adres aplikacji w linkach z maili. */
  APP_URL: string;
  /** "resend" albo "log" (tylko lokalnie). */
  MAIL_MODE?: string;
  /** Sekret: klucz API Resend. */
  RESEND_API_KEY?: string;
```

importy z `./accounts` (`getAccount, login, logout, requestCode, setPassword, verifyCode`) i w `route()` przed `const session = await authenticate(request, env);`:

```ts
  // Konta (sesja w Authorization tylko tam, gdzie potrzebna)
  if (request.method === 'POST' && path === '/auth/request') return requestCode(request, env);
  if (request.method === 'POST' && path === '/auth/verify') return verifyCode(request, env);
  if (request.method === 'POST' && path === '/auth/password') return setPassword(request, env);
  if (request.method === 'POST' && path === '/auth/login') return login(request, env);
  if (request.method === 'POST' && path === '/auth/logout') return logout(request, env);
  if (request.method === 'GET' && path === '/account') return getAccount(request, env);
```

- [ ] **Step 8: Typy i test dymny**

Run: `npm run typecheck`; `npm run smoke` → `wszystko ok`.

- [ ] **Step 9: Commit**

```bash
git add worker
git commit -m "feat(api): konta — hasła PBKDF2, kody z maila (Resend), logowanie i sesje"
```

### Task 3 (A3): Przypinanie urządzeń do konta, mapa prywatna, scalanie członków

**Files:**
- Modify: `worker/src/accounts.ts`, `worker/src/members.ts`, `worker/src/index.ts`, `worker/scripts/smoke.mjs`

**Interfaces:**
- Consumes: `requireUser`, `userFromSession`, `insertMember` (zwraca tablicę), `Space.kind`.
- Produces: `POST /account/link {tokens}` → `{ spaces: [{ spaceId, kind, name, role, memberId, memberToken }] }`; `POST /join` z `X-Session`; 403 „To prywatna mapa” dla zarządzania mapą `personal`.

- [ ] **Step 1: Test dymny przypinania**

```js
/** Przypinanie kluczy urządzeń do konta, mapa prywatna, scalanie duplikatów, blokady mapy prywatnej. */
async function accountLink() {
  const u = await register(`u-${Date.now()}@example.com`, 'dobrehaslo1');

  // Mapa rodzinna założona bez konta (A = założyciel) + B dołącza bez konta
  const fam = await call('POST', '/spaces', { body: { name: 'Rodzina L', member: { name: 'Kacper', color: 'clay' } } });
  const b = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Bartek', color: 'sky' } });

  const l1 = await call('POST', '/account/link', { token: u, body: { tokens: [fam.data.memberToken] } });
  const famRow = l1.data?.spaces?.find((s) => s.spaceId === fam.data.spaceId);
  const personal = l1.data?.spaces?.find((s) => s.kind === 'personal');
  check('przypięcie: mapa rodzinna i prywatna', l1.status === 200 && famRow?.memberId === fam.data.memberId && famRow?.memberToken === fam.data.memberToken && personal?.name === 'Moje', l1);
  check('mapa prywatna pierwsza', l1.data.spaces[0].kind === 'personal', l1.data.spaces);

  const before = sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${fam.data.memberId}'`);
  const tokensNow = l1.data.spaces.map((s) => s.memberToken);
  const l2 = await call('POST', '/account/link', { token: u, body: { tokens: tokensNow } });
  check('ponowne link() z tego samego urządzenia nie mnoży kluczy', sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${fam.data.memberId}'`) === before && l2.data.spaces.length === 2, l2);

  const l3 = await call('POST', '/account/link', { token: u, body: { tokens: [] } });
  const fam3 = l3.data.spaces.find((s) => s.spaceId === fam.data.spaceId);
  check('nowe urządzenie: ten sam członek, nowy klucz', fam3.memberId === fam.data.memberId && fam3.memberToken !== fam.data.memberToken, l3);
  const viaNew = await call('GET', '/space', { token: fam3.memberToken });
  check('nowy klucz urządzenia działa', viaNew.status === 200 && viaNew.data.me?.id === fam.data.memberId, viaNew);
  check('mapa prywatna tworzona raz', l3.data.spaces.filter((s) => s.kind === 'personal').length === 1 && l3.data.spaces.find((s) => s.kind === 'personal').spaceId === personal.spaceId);

  // Duplikat: ta sama osoba dołączyła drugi raz bez konta → scalenie przy link()
  const dup = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Kacper', color: 'sage' } });
  await call('POST', '/account/link', { token: u, body: { tokens: [dup.data.memberToken] } });
  const members = await call('GET', '/members', { token: b.data.memberToken });
  check('scalenie: duplikat znika z listy członków', members.data.members.length === 2, members.data);
  const dupNow = await call('GET', '/space', { token: dup.data.memberToken });
  check('klucz duplikatu wskazuje teraz scalonego członka', dupNow.data?.me?.id === fam.data.memberId && dupNow.data.me.role === 'owner', dupNow);

  // Scalenie z przejęciem roli założyciela: E (konto, dołączył wcześniej) + O (później, założyciel po przekazaniu)
  const f3 = await call('POST', '/spaces', { body: { name: 'Rodzina R', member: { name: 'Celina', color: 'moss' } } });
  const e = await call('POST', '/join', { token: f3.data.invite, headers: { 'X-Session': u }, body: { name: 'Kacper', color: 'clay' } });
  const o = await call('POST', '/join', { token: f3.data.invite, body: { name: 'Kacper', color: 'sky' } });
  await call('POST', `/members/${o.data.memberId}/owner`, { token: f3.data.memberToken });
  await call('POST', '/account/link', { token: u, body: { tokens: [o.data.memberToken] } });
  const merged = await call('GET', '/space', { token: o.data.memberToken });
  check('scalenie przenosi rolę założyciela na zachowanego członka', merged.data?.me?.id === e.data.memberId && merged.data.me.role === 'owner', merged);

  // Dołączenie z sesją, gdy konto już jest w mapie → bez duplikatu
  const again = await call('POST', '/join', { token: f3.data.invite, headers: { 'X-Session': u }, body: { name: 'Kacper', color: 'clay' } });
  check('dołączenie z sesją: istniejący członek, nowy klucz', again.status === 201 && again.data.memberId === e.data.memberId, again);

  // Cudzy członek nie jest przejmowany
  const v = await register(`v-${Date.now()}@example.com`, 'dobrehaslo1');
  const lv = await call('POST', '/account/link', { token: v, body: { tokens: [fam.data.memberToken] } });
  check('klucz członka innego konta nie jest przejmowany', lv.data.spaces.length === 1 && lv.data.spaces[0].kind === 'personal', lv);

  // Mapa prywatna: bez zaproszeń, wyjścia i usuwania
  const p = l1.data.spaces.find((s) => s.kind === 'personal').memberToken;
  for (const [method, path] of [['POST', '/space/rotate'], ['POST', '/space/leave'], ['DELETE', '/space']]) {
    const res = await call(method, path, { token: p });
    check(`mapa prywatna: ${method} ${path} → 403`, res.status === 403, res);
  }
  const unlinked = await call('POST', '/account/link', { token: 'zla-sesja', body: { tokens: [] } });
  check('link bez ważnej sesji: 401', unlinked.status === 401, unlinked);
}
```

W `call()` dopuść dodatkowe nagłówki: sygnatura `call(method, path, { token, body, headers } = {})` i `const h = { ...(headers ?? {}) };` przed ustawieniem `Authorization`/`Content-Type`. Wywołanie `await accountLink();` na końcu.

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npm run smoke` → FAIL od „przypięcie: mapa rodzinna i prywatna” (404).

- [ ] **Step 3: `accounts.ts` — `linkAccount`, mapa prywatna, scalanie**

Import: `import { insertMember } from './members';`. Dodaj:

```ts
type MemberRow = { id: string; space_id: string; user_id: string | null; role: 'owner' | 'member'; joined_at: number };

/**
 * Scala dwóch członków tej samej osoby w jednej mapie. Zostaje ten, kto dołączył wcześniej;
 * rola założyciela przechodzi na niego, klucze urządzeń drugiego też. Drugi znika z listy.
 */
async function mergeMembers(env: Env, a: MemberRow, b: MemberRow, userId: string): Promise<string> {
  const [keep, drop] = a.joined_at <= b.joined_at ? [a, b] : [b, a];
  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  // Kolejność ze względu na indeksy „jeden założyciel” i „jeden członek konta w mapie”
  if (drop.role === 'owner') {
    statements.push(env.DB.prepare("UPDATE members SET role = 'member' WHERE id = ?").bind(drop.id));
  }
  statements.push(
    env.DB.prepare('UPDATE members SET removed_at = ?, merged_into = ? WHERE id = ?').bind(now, keep.id, drop.id),
    env.DB.prepare('UPDATE members SET user_id = ? WHERE id = ?').bind(userId, keep.id)
  );
  if (drop.role === 'owner') {
    statements.push(env.DB.prepare("UPDATE members SET role = 'owner' WHERE id = ?").bind(keep.id));
  }
  statements.push(env.DB.prepare('UPDATE member_tokens SET member_id = ? WHERE member_id = ?').bind(keep.id, drop.id));
  await env.DB.batch(statements);
  return keep.id;
}

async function ensurePersonalSpace(env: Env, user: User): Promise<void> {
  const existing = await env.DB.prepare("SELECT id FROM spaces WHERE kind = 'personal' AND owner_user_id = ?")
    .bind(user.id)
    .first();
  if (existing) return;
  const spaceId = crypto.randomUUID();
  const now = Date.now();
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO spaces (id, token_hash, rev, created_at, last_seen_at, name, kind, owner_user_id)
         VALUES (?, ?, 0, ?, ?, 'Moje', 'personal', ?)`
      ).bind(spaceId, await sha256(newToken()), now, now, user.id),
      ...insertMember(env, {
        id: crypto.randomUUID(),
        spaceId,
        tokenHash: await sha256(newToken()),
        name: user.email.split('@')[0].slice(0, 40) || 'Ja',
        color: 'slate',
        role: 'owner',
        userId: user.id,
      }),
    ]);
  } catch (err) {
    // Dwa równoległe link() — indeks spaces_one_personal wpuścił tylko pierwsze
    if (!String(err).includes('UNIQUE')) throw err;
  }
}

/** Przypina klucze tego urządzenia do konta i zwraca wszystkie mapy konta z kluczem dla urządzenia. */
export async function linkAccount(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const body = (await readJson(request)) as { tokens?: unknown } | null;
  const tokens = Array.isArray(body?.tokens)
    ? body.tokens.filter((t): t is string => typeof t === 'string' && t.length > 0).slice(0, 50)
    : [];

  const deviceToken = new Map<string, string>(); // memberId → klucz tego urządzenia
  for (const token of tokens) {
    const m = await env.DB.prepare(
      `SELECT m.id, m.space_id, m.user_id, m.role, m.joined_at
         FROM member_tokens t JOIN members m ON m.id = t.member_id JOIN spaces s ON s.id = m.space_id
        WHERE t.token_hash = ? AND m.removed_at IS NULL AND s.kind = 'family'`
    )
      .bind(await sha256(token))
      .first<MemberRow>();
    if (!m || (m.user_id && m.user_id !== user.id)) continue; // brak albo cudzy członek
    let keepId = m.id;
    if (!m.user_id) {
      const e = await env.DB.prepare(
        'SELECT id, space_id, user_id, role, joined_at FROM members WHERE space_id = ? AND user_id = ? AND removed_at IS NULL'
      )
        .bind(m.space_id, user.id)
        .first<MemberRow>();
      if (e) {
        keepId = await mergeMembers(env, e, m, user.id);
      } else {
        await env.DB.prepare('UPDATE members SET user_id = ? WHERE id = ?').bind(user.id, m.id).run();
      }
    }
    deviceToken.set(keepId, token);
  }

  await ensurePersonalSpace(env, user);

  const { results } = await env.DB.prepare(
    `SELECT s.id AS spaceId, s.kind, s.name, m.role, m.id AS memberId
       FROM members m JOIN spaces s ON s.id = m.space_id
      WHERE m.user_id = ? AND m.removed_at IS NULL
      ORDER BY s.kind = 'personal' DESC, m.joined_at`
  )
    .bind(user.id)
    .all<{ spaceId: string; kind: string; name: string; role: string; memberId: string }>();

  const spaces = [];
  for (const row of results) {
    let memberToken = deviceToken.get(row.memberId);
    if (!memberToken) {
      memberToken = newToken();
      await env.DB.prepare('INSERT INTO member_tokens (token_hash, member_id, created_at) VALUES (?, ?, ?)')
        .bind(await sha256(memberToken), row.memberId, Date.now())
        .run();
    }
    spaces.push({ ...row, memberToken });
  }
  return json({ spaces });
}
```

- [ ] **Step 4: `members.ts` — dołączanie z sesją i blokady mapy prywatnej**

Import: `import { userFromSession } from './accounts';` (cykl importów `accounts ↔ members` jest bezpieczny — tylko funkcje, bez kodu na poziomie modułu).

Na początku `joinSpace` po walidacji imienia i koloru:

```ts
  // Zalogowany: członek przypięty do konta; jeśli konto już jest w tej mapie — nowy klucz dla istniejącego
  const user = await userFromSession(env, request.headers.get('X-Session') ?? '');
  if (user) {
    const existing = await env.DB.prepare(
      'SELECT id, role FROM members WHERE space_id = ? AND user_id = ? AND removed_at IS NULL'
    )
      .bind(space.id, user.id)
      .first<{ id: string; role: 'owner' | 'member' }>();
    if (existing) {
      const memberToken = newToken();
      await env.DB.prepare('INSERT INTO member_tokens (token_hash, member_id, created_at) VALUES (?, ?, ?)')
        .bind(await sha256(memberToken), existing.id, Date.now())
        .run();
      return json({ spaceId: space.id, name: space.name, memberToken, memberId: existing.id, role: existing.role }, 201);
    }
  }
```

i w obiekcie `member` dodaj `userId: user?.id ?? null,`.

Dodaj pomocnika i wywołaj go na początku `leaveSpace`, `rotateInvite`, `removeMember`, `transferOwner`, `deleteSpace`:

```ts
function rejectPersonal(session: Session): void {
  if (session.space.kind === 'personal') throw new HttpError(403, 'To prywatna mapa');
}
```

- [ ] **Step 5: Trasa**

`index.ts`: import `linkAccount` i obok `/account`:

```ts
  if (request.method === 'POST' && path === '/account/link') return linkAccount(request, env);
```

- [ ] **Step 6: Typy i test dymny**

Run: `npm run typecheck`; `npm run smoke` → `wszystko ok`.

- [ ] **Step 7: Commit**

```bash
git add worker
git commit -m "feat(api): przypinanie urządzeń do konta, mapa prywatna i scalanie członków"
```

### Task 4 (A4): README, Resend i wdrożenie API

**Files:**
- Modify: `worker/README.md`

- [ ] **Step 1: README** — sekcja „Konta”: przepływy, tabela endpointów z specyfikacji, `MAIL_MODE`, `APP_URL`, sekret `RESEND_API_KEY`, limity (kod 15 min / 5 prób / 5 na godzinę, blokada logowania, sesja 365 dni), `PASSWORD_ITERATIONS` i jak je podnieść po przejściu na płatny plan.

- [ ] **Step 2: Typy, test dymny, commit**

Run: `npm run typecheck`; `npm run smoke` → `wszystko ok`.

```bash
git add worker/README.md frontend/grave-app-front/docs/superpowers
git commit -m "docs(api): konta w README"
```

- [ ] **Step 3: PR (bez merge'a)** — `gh pr create --repo kacperk72/grave-app --base main --head feat/konta-api`, opis: co dochodzi, zgodność wstecz (obecna aplikacja nie zauważa zmian), migracja 0005 (tylko dodaje; kopia kluczy do `member_tokens`), wymagany sekret Resend, test dymny; `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: Instrukcja dla użytkownika (Resend)** — napisz użytkownikowi kroki: konto na resend.com → Domains → Add `znajdzgroby.pl` (region EU) → rekordy DNS do dodania w hPanelu Hostingera (DNS / Nameservers → Zarządzaj rekordami DNS) dokładnie tak, jak pokaże Resend → Verify → API Keys → klucz „Sending access” → w `worker/`: `npx wrangler secret put RESEND_API_KEY`. Bez tego `/auth/request` zwraca 503, reszta API działa.

- [ ] **Step 5: Po merge'u (za zgodą)** — sprawdź: `GET /` ok; w D1 (tylko SELECT): `SELECT (SELECT COUNT(*) FROM members) AS m, (SELECT COUNT(*) FROM member_tokens) AS t` → `t >= m`; produkcyjna aplikacja nadal synchronizuje. Po pierwszym prawdziwym logowaniu użytkownika: w panelu Cloudflare → Workers → `grave-app-api` → Logs, zapytanie `POST /auth/login` — czas CPU poniżej 10 ms (przy błędzie 1102 „exceeded CPU” obniż `PASSWORD_ITERATIONS` do 10 000 i wdroż poprawkę; hasła przeliczą się same).

---

## Część B — aplikacja (PR 2, gałąź `feat/konta-front` od `main` po merge'u PR 1)

Pracuj w `grave-app/frontend/grave-app-front`. Testy: `npx ng test --watch=false`; build: `npx ng build`.

### Task 5 (B1): Czysta logika konta

**Files:**
- Create: `src/app/shared/utils/account-rules.ts` (+ `.spec.ts`), `src/app/shared/utils/account-link.ts` (+ `.spec.ts`)
- Modify: `src/app/shared/models/space.model.ts`

**Interfaces:**
- Produces: `LocalSpace.kind?: 'family' | 'personal'`; `normalizeEmail(value): string | null`; `passwordProblem(value): string | null`; `shouldShowLoginBanner({ loggedIn, graveCount, dismissedAt, now }): boolean`; `interface LinkedSpace { spaceId; kind; name; role; memberId; memberToken }`; `planAccountLink(local: LocalSpace[], linked: LinkedSpace[]): LinkStep[]`, `type LinkStep = { localId: string; changes: Partial<LocalSpace> } | { localId: null; fields: Partial<LocalSpace> & Pick<LocalSpace, 'name'> }`.

- [ ] **Step 1: Testy**

`account-rules.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeEmail, passwordProblem, shouldShowLoginBanner } from './account-rules';

const DAY = 24 * 60 * 60 * 1000;

describe('normalizeEmail', () => {
  it('przycina i zmienia na małe litery', () => expect(normalizeEmail('  Kacper@Example.COM ')).toBe('kacper@example.com'));
  it('odrzuca adres bez @ albo domeny', () => {
    expect(normalizeEmail('kacper')).toBeNull();
    expect(normalizeEmail('kacper@x')).toBeNull();
  });
});

describe('passwordProblem', () => {
  it('za krótkie', () => expect(passwordProblem('abc')).toBe('Hasło musi mieć co najmniej 8 znaków'));
  it('za długie', () => expect(passwordProblem('x'.repeat(129))).toBe('Hasło może mieć najwyżej 128 znaków'));
  it('dobre', () => expect(passwordProblem('dobrehaslo')).toBeNull());
});

describe('shouldShowLoginBanner', () => {
  const base = { loggedIn: false, graveCount: 3, dismissedAt: null, now: 10 * DAY };
  it('niezalogowany z grobami → pokaż', () => expect(shouldShowLoginBanner(base)).toBe(true));
  it('zalogowany → nie', () => expect(shouldShowLoginBanner({ ...base, loggedIn: true })).toBe(false));
  it('bez grobów → nie', () => expect(shouldShowLoginBanner({ ...base, graveCount: 0 })).toBe(false));
  it('„Później” mniej niż 7 dni temu → nie', () =>
    expect(shouldShowLoginBanner({ ...base, dismissedAt: 10 * DAY - 2 * DAY })).toBe(false));
  it('„Później” ponad 7 dni temu → tak', () =>
    expect(shouldShowLoginBanner({ ...base, dismissedAt: 10 * DAY - 8 * DAY })).toBe(true));
});
```

`account-link.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LinkedSpace, planAccountLink } from './account-link';
import { LocalSpace, localSpace, newSharedSpace } from '../models/space.model';

const linked = (over: Partial<LinkedSpace>): LinkedSpace => ({
  spaceId: 's1', kind: 'family', name: 'Rodzina', role: 'member', memberId: 'm1', memberToken: 't1', ...over,
});

describe('planAccountLink', () => {
  it('mapa znana po serverId → aktualizacja klucza, roli i nazwy', () => {
    const fam = newSharedSpace({ id: 'L1', serverId: 's1', name: 'Stara', memberToken: 'old', rev: 7 });
    const steps = planAccountLink([localSpace(), fam], [linked({ memberToken: 'new', role: 'owner' })]);
    expect(steps).toEqual([
      { localId: 'L1', changes: { serverId: 's1', name: 'Rodzina', kind: 'family', role: 'owner', memberId: 'm1', memberToken: 'new', status: 'active' } },
    ]);
  });
  it('nowa mapa → dodanie od rev 0', () => {
    const steps = planAccountLink([localSpace()], [linked({ spaceId: 's9' })]);
    expect(steps[0]).toMatchObject({ localId: null, fields: { serverId: 's9', rev: 0, status: 'active', kind: 'family' } });
  });
  it('mapa prywatna dostaje kind personal i nazwę Moje', () => {
    const steps = planAccountLink([localSpace()], [linked({ spaceId: 'p1', kind: 'personal', name: 'Moje', role: 'owner' })]);
    expect(steps[0]).toMatchObject({ localId: null, fields: { kind: 'personal', name: 'Moje' } });
  });
  it('mapa wcześniej usunięta z telefonu (removed) → pobierz od zera', () => {
    const fam = newSharedSpace({ id: 'L1', serverId: 's1', name: 'R', status: 'removed', rev: 5 });
    const steps = planAccountLink([fam], [linked({})]);
    expect(steps[0]).toMatchObject({ localId: 'L1', changes: { status: 'active', rev: 0 } });
  });
  it('mapy telefonu spoza konta zostają bez zmian', () => {
    const other: LocalSpace = newSharedSpace({ id: 'L2', serverId: 'sX', name: 'Inna' });
    expect(planAccountLink([localSpace(), other], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Uruchom — FAIL** (`Could not resolve`).

Run: `npx ng test --watch=false --include src/app/shared/utils/account-rules.spec.ts --include src/app/shared/utils/account-link.spec.ts`

- [ ] **Step 3: Implementacja**

`space.model.ts` — w `LocalSpace` po `status`:

```ts
  /** 'personal' = prywatna „Moje” konta na serwerze; brak = mapa rodzinna. */
  kind?: 'family' | 'personal';
```

`account-rules.ts`:

```ts
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const BANNER_PAUSE_MS = 7 * 24 * 60 * 60 * 1000;

/** Ta sama normalizacja co w Workerze (`worker/src/accounts.ts`). */
export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function passwordProblem(value: string): string | null {
  if (value.length < MIN_PASSWORD) return `Hasło musi mieć co najmniej ${MIN_PASSWORD} znaków`;
  if (value.length > MAX_PASSWORD) return `Hasło może mieć najwyżej ${MAX_PASSWORD} znaków`;
  return null;
}

/** Pasek „Zaloguj się, żeby nie stracić grobów” na Starcie. */
export function shouldShowLoginBanner(input: {
  loggedIn: boolean;
  graveCount: number;
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (input.loggedIn || input.graveCount === 0) return false;
  return input.dismissedAt === null || input.now - input.dismissedAt > BANNER_PAUSE_MS;
}
```

`account-link.ts`:

```ts
import { LocalSpace, SpaceRole, isShared } from '../models/space.model';

/** Mapa konta z odpowiedzi `POST /account/link`. */
export interface LinkedSpace {
  spaceId: string;
  kind: 'family' | 'personal';
  name: string;
  role: SpaceRole;
  memberId: string;
  memberToken: string;
}

export type LinkStep =
  | { localId: string; changes: Partial<LocalSpace> }
  | { localId: null; fields: Partial<LocalSpace> & Pick<LocalSpace, 'name'> };

/**
 * Jak połączyć mapy konta z mapami w telefonie: znane (po id serwera) dostają klucz tego
 * urządzenia, nowe są dodawane i pobierane od zera. Mapy telefonu spoza konta zostają.
 */
export function planAccountLink(local: LocalSpace[], linked: LinkedSpace[]): LinkStep[] {
  return linked.map((l) => {
    const fields: Partial<LocalSpace> = {
      serverId: l.spaceId,
      name: l.name,
      kind: l.kind,
      role: l.role,
      memberId: l.memberId,
      memberToken: l.memberToken,
      status: 'active',
    };
    const known = local.find((s) => isShared(s) && s.serverId === l.spaceId);
    if (!known) return { localId: null, fields: { ...fields, name: l.name, rev: 0 } };
    return { localId: known.id, changes: known.status === 'removed' ? { ...fields, rev: 0 } : fields };
  });
}
```

- [ ] **Step 4: Testy przechodzą** (komenda jak w Step 2) → PASS; potem pełne `npx ng test --watch=false` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: logika konta — e-mail, hasło, pasek logowania, łączenie map konta"
```

### Task 6 (B2): Sesja, API konta i `AccountService`

**Files:**
- Create: `src/app/core/services/session.ts`, `src/app/core/services/account.service.ts`
- Modify: `src/app/core/services/family-api.ts`, `src/app/core/services/space.service.ts`, `src/app/app.ts`

**Interfaces:**
- Consumes: `planAccountLink`, `LinkedSpace` (Task 5), `SpaceService` (`spaces`, `update`, `add`, `setActive`, `forget`, `activeSpaceId`), `IndexedDbService.graveIds/moveGraves`, `FamilySyncService.sync`.
- Produces: `session.ts` — `readSession(): StoredSession | null`, `writeSession(s)`, `clearSession()`, `interface StoredSession { token: string; email: string }`; `FamilyApi` — `authRequest(email)`, `authVerify(body)`, `authPassword(setupToken, password)`, `authLogin(email, password)`, `authLogout(session)`, `accountLink(session, tokens)`, `join(invite, profile, session?)`; `AccountService` — sygnały `session`, `loggedIn`; `login(email, password)`, `requestCode(email)`, `verify(input)`, `setPassword(setupToken, password)`, `link(): Promise<{ movedGraves: number }>`, `linkIfDue()`, `logout()`.

- [ ] **Step 1: `session.ts`**

```ts
import { readStorage, removeStorage, writeStorage } from './storage';

const SESSION_KEY = 'znajdzgroby-session';

export interface StoredSession {
  token: string;
  email: string;
}

export function readSession(): StoredSession | null {
  try {
    const parsed = JSON.parse(readStorage(SESSION_KEY) ?? 'null') as StoredSession | null;
    return parsed && typeof parsed.token === 'string' && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  writeStorage(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  removeStorage(SESSION_KEY);
}
```

- [ ] **Step 2: `FamilyApi` — endpointy konta**

`request()` dostaje opcjonalne dodatkowe nagłówki: sygnatura `request<T>(method, path, token, body?, extraHeaders: Record<string, string> = {})` i `const headers: Record<string, string> = { ...extraHeaders };`. Nowe metody:

```ts
  authRequest(email: string): Promise<{ ok: true }> {
    return this.request('POST', '/auth/request', null, { email });
  }

  authVerify(body: { email: string; code: string } | { link: string }): Promise<{ setupToken: string; email: string }> {
    return this.request('POST', '/auth/verify', null, body);
  }

  authPassword(setupToken: string, password: string): Promise<AuthResult> {
    return this.request('POST', '/auth/password', null, { setupToken, password });
  }

  authLogin(email: string, password: string): Promise<AuthResult> {
    return this.request('POST', '/auth/login', null, { email, password });
  }

  authLogout(session: string): Promise<unknown> {
    return this.request('POST', '/auth/logout', session);
  }

  async accountLink(session: string, tokens: string[]): Promise<LinkedSpace[]> {
    return (await this.request<{ spaces: LinkedSpace[] }>('POST', '/account/link', session, { tokens })).spaces;
  }
```

z `export interface AuthResult { session: string; user: { id: string; email: string } }` i importem `LinkedSpace` z `../../shared/utils/account-link`. Metoda `join`:

```ts
  join(invite: string, profile: Profile, session?: string): Promise<JoinResult> {
    return this.request('POST', '/join', invite, profile, session ? { 'X-Session': session } : {});
  }
```

- [ ] **Step 3: `SpaceService.join` — dołączanie jako konto**

W `join()` zamień `const res = await this.api.join(invite, profile);` na:

```ts
    const res = await this.api.join(invite, profile, readSession()?.token);
```

(import `readSession` z `./session`).

- [ ] **Step 4: `account.service.ts`**

```ts
import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiError, FamilyApi } from './family-api';
import { SpaceService } from './space.service';
import { IndexedDbService } from './indexeddb.service';
import { FamilySyncService } from './family-sync.service';
import { StoredSession, clearSession, readSession, writeSession } from './session';
import { readStorage, writeStorage } from './storage';
import { LOCAL_SPACE_ID, credentialOf, newSharedSpace } from '../../shared/models/space.model';
import { planAccountLink } from '../../shared/utils/account-link';

const LAST_LINK_KEY = 'znajdzgroby-last-link';
const LINK_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Konto (opcjonalne): sesja w tym urządzeniu i przypięcie map do konta. Po zalogowaniu „Moje”
 * z telefonu przechodzi do prywatnej mapy konta na serwerze, a mapy z innych urządzeń pojawiają się tutaj.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api = inject(FamilyApi);
  private readonly spaces = inject(SpaceService);
  private readonly db = inject(IndexedDbService);
  private readonly sync = inject(FamilySyncService);

  readonly session = signal<StoredSession | null>(readSession());
  readonly loggedIn = computed(() => !!this.session());

  async login(email: string, password: string): Promise<{ movedGraves: number }> {
    const res = await this.api.authLogin(email, password);
    this.save({ token: res.session, email: res.user.email });
    return this.link();
  }

  requestCode(email: string): Promise<unknown> {
    return this.api.authRequest(email);
  }

  async verify(input: { email: string; code: string } | { link: string }): Promise<{ setupToken: string; email: string }> {
    return this.api.authVerify(input);
  }

  async setPassword(setupToken: string, password: string): Promise<{ movedGraves: number }> {
    const res = await this.api.authPassword(setupToken, password);
    this.save({ token: res.session, email: res.user.email });
    return this.link();
  }

  /** Przypina mapy tego urządzenia do konta i dociąga mapy konta. Zwraca, ile grobów z „Moje” poszło na konto. */
  async link(): Promise<{ movedGraves: number }> {
    const session = this.session();
    if (!session) return { movedGraves: 0 };
    await this.spaces.ready;
    const tokens = this.spaces
      .spaces()
      .filter((s) => s.memberToken && s.status === 'active')
      .map((s) => s.memberToken!);
    let linked;
    try {
      linked = await this.api.accountLink(session.token, tokens);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Sesja wygasła albo hasło zmieniono na innym urządzeniu: dane zostają, konto „wylogowane”
        this.dropSession();
      }
      throw err;
    }

    for (const step of planAccountLink(this.spaces.spaces(), linked)) {
      if (step.localId) await this.spaces.update(step.localId, step.changes);
      else await this.spaces.add(newSharedSpace(step.fields));
    }

    const personal = this.spaces.spaces().find((s) => s.kind === 'personal');
    let movedGraves = 0;
    if (personal) {
      const localIds = await this.db.graveIds(LOCAL_SPACE_ID);
      movedGraves = localIds.length;
      if (movedGraves > 0) await this.db.moveGraves(localIds, personal.id);
      if (this.spaces.activeSpaceId() === LOCAL_SPACE_ID) this.spaces.setActive(personal.id);
    }
    writeStorage(LAST_LINK_KEY, String(Date.now()));
    this.sync.sync();
    return { movedGraves };
  }

  /** Raz na dobę przy starcie: mapy dodane na innym urządzeniu pojawiają się i tutaj. */
  linkIfDue(): void {
    if (!this.session()) return;
    const last = Number(readStorage(LAST_LINK_KEY)) || 0;
    if (Date.now() - last < LINK_EVERY_MS) return;
    this.link().catch(() => {});
  }

  /** Wylogowanie: dane konta znikają z tej przeglądarki (są na serwerze), „Moje” lokalne zostaje puste. */
  async logout(): Promise<void> {
    const session = this.session();
    if (session) await this.api.authLogout(session.token).catch(() => {});
    for (const space of this.spaces.spaces()) {
      if (space.id !== LOCAL_SPACE_ID) await this.spaces.forget(space.id, false);
    }
    this.dropSession();
  }

  /** Liczba niewysłanych zmian we wszystkich mapach — do ostrzeżenia przed wylogowaniem. */
  async pendingChanges(): Promise<number> {
    let total = 0;
    for (const space of this.spaces.spaces()) {
      if (credentialOf(space)) total += await this.db.queueCount(space.id);
    }
    return total;
  }

  private save(session: StoredSession): void {
    writeSession(session);
    this.session.set(session);
  }

  private dropSession(): void {
    clearSession();
    this.session.set(null);
  }
}
```

- [ ] **Step 5: Start aplikacji**

`app.ts`: `private readonly account = inject(AccountService);` i w konstruktorze (dodaj, jeśli go nie ma): `this.account.linkIfDue();`.

- [ ] **Step 6: Build i testy**

Run: `npx ng build` → bez błędów; `npx ng test --watch=false` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: sesja i AccountService — logowanie, przypinanie map do konta, wylogowanie"
```

### Task 7 (B3): Ekran `/logowanie`

**Files:**
- Create: `src/app/features/account/login-page.component.ts`
- Modify: `src/app/app.routes.ts`, `src/app/app.ts` (`showNav`: ukryj nawigację na `/logowanie`)

**Interfaces:**
- Consumes: `AccountService` (Task 6), `normalizeEmail`, `passwordProblem` (Task 5), `markOnboardingSeen`.
- Produces: trasa `/logowanie` (z obsługą `#<link>`).

- [ ] **Step 1: Trasa** — w `app.routes.ts` przed `'**'`:

```ts
  {
    path: 'logowanie',
    loadComponent: () =>
      import('./features/account/login-page.component').then((m) => m.LoginPageComponent),
  },
```

oraz w `app.ts` w `showNav` dopisz `p.startsWith('/logowanie') ||`.

- [ ] **Step 2: Komponent**

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AccountService } from '../../core/services/account.service';
import { ApiError } from '../../core/services/family-api';
import { markOnboardingSeen } from '../../core/services/onboarding';
import { IconComponent } from '../../shared/components/icon.component';
import { normalizeEmail, passwordProblem } from '../../shared/utils/account-rules';

type Step = 'login' | 'email' | 'code' | 'password' | 'done';

/**
 * Logowanie e-mailem i hasłem. „Załóż konto” i „Nie pamiętam hasła” to ten sam przepływ:
 * e-mail → kod z maila → ustawienie hasła. Link z maila (`/logowanie#<link>`) pomija wpisywanie kodu.
 */
@Component({
  selector: 'app-login-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <a class="round-btn round-btn--sm back" routerLink="/settings" aria-label="Wróć">
        <app-icon name="arrow-left" [size]="20" />
      </a>

      @switch (step()) { @case ('login') {
      <h1>Zaloguj się</h1>
      <p class="lead">Twoje groby i zdjęcia będą na każdym urządzeniu, na którym się zalogujesz.</p>
      <form (submit)="$event.preventDefault(); login()">
        <label class="field"><span>E-mail</span>
          <input type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" />
        </label>
        <label class="field"><span>Hasło</span>
          <span class="pw">
            <input [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" [value]="password()" (input)="password.set($any($event.target).value)" />
            <button type="button" class="pw__toggle" (click)="showPassword.set(!showPassword())">{{ showPassword() ? 'Ukryj' : 'Pokaż' }}</button>
          </span>
        </label>
        <button type="submit" class="cta" [disabled]="busy()">{{ busy() ? 'Loguję…' : 'Zaloguj' }}</button>
      </form>
      <button type="button" class="link" (click)="startSetup('reset')">Nie pamiętam hasła</button>
      <button type="button" class="link" (click)="startSetup('register')">Nie mam konta — załóż</button>
      } @case ('email') {
      <h1>{{ mode() === 'register' ? 'Załóż konto' : 'Nowe hasło' }}</h1>
      <p class="lead">Wyślemy na Twój e-mail 6-cyfrowy kod, żeby potwierdzić, że adres jest Twój.</p>
      <form (submit)="$event.preventDefault(); sendCode()">
        <label class="field"><span>E-mail</span>
          <input type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" />
        </label>
        <button type="submit" class="cta" [disabled]="busy()">{{ busy() ? 'Wysyłam…' : 'Wyślij kod' }}</button>
      </form>
      <button type="button" class="link" (click)="step.set('login')">Mam już hasło — zaloguj się</button>
      } @case ('code') {
      <h1>Wpisz kod z maila</h1>
      <p class="lead">Wysłaliśmy kod na {{ email() }}. Sprawdź też folder „Spam”.</p>
      <form (submit)="$event.preventDefault(); checkCode()">
        <label class="field"><span>Kod (6 cyfr)</span>
          <input inputmode="numeric" autocomplete="one-time-code" maxlength="7" [value]="code()" (input)="code.set($any($event.target).value)" />
        </label>
        <button type="submit" class="cta" [disabled]="busy()">{{ busy() ? 'Sprawdzam…' : 'Dalej' }}</button>
      </form>
      <button type="button" class="link" [disabled]="resendIn() > 0" (click)="sendCode()">
        {{ resendIn() > 0 ? 'Wyślij ponownie za ' + resendIn() + ' s' : 'Wyślij ponownie' }}
      </button>
      } @case ('password') {
      <h1>Ustaw hasło</h1>
      <p class="lead">Konto: {{ email() }}</p>
      <form (submit)="$event.preventDefault(); savePassword()">
        <label class="field"><span>Hasło (min. 8 znaków)</span>
          <span class="pw">
            <input [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" [value]="password()" (input)="password.set($any($event.target).value)" />
            <button type="button" class="pw__toggle" (click)="showPassword.set(!showPassword())">{{ showPassword() ? 'Ukryj' : 'Pokaż' }}</button>
          </span>
        </label>
        <button type="submit" class="cta" [disabled]="busy()">{{ busy() ? 'Zapisuję…' : 'Zapisz hasło' }}</button>
      </form>
      } @case ('done') {
      <h1>Gotowe</h1>
      <p class="lead">{{ doneText() }}</p>
      <a class="cta" routerLink="/start">Przejdź do grobów</a>
      } } @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .screen { max-width: 520px; margin: 0 auto; padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 32px; display: flex; flex-direction: column; gap: 14px; }
      .back { align-self: flex-start; }
      h1 { margin: 0; font-size: 28px; }
      .lead { margin: 0; color: var(--ink-muted); line-height: 1.45; }
      form { display: flex; flex-direction: column; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink-muted); }
      input { height: 48px; padding: 0 14px; border: 1px solid var(--hairline); border-radius: var(--radius-sm); background: var(--card); color: var(--ink); font: inherit; font-size: 16px; font-weight: 400; width: 100%; box-sizing: border-box; }
      .pw { position: relative; display: block; }
      .pw input { padding-right: 76px; }
      .pw__toggle { position: absolute; right: 8px; top: 8px; height: 32px; padding: 0 10px; border: none; border-radius: var(--radius-pill); background: var(--pill); color: var(--ink); font-size: 13px; cursor: pointer; }
      .link { align-self: flex-start; padding: 6px 0; border: none; background: none; color: var(--ink-muted); font-size: 14px; text-decoration: underline; cursor: pointer; }
      .link:disabled { text-decoration: none; cursor: default; }
      .error { margin: 0; color: var(--danger); font-size: 14px; }
    `,
  ],
})
export class LoginPageComponent {
  private readonly account = inject(AccountService);
  private readonly router = inject(Router);

  readonly step = signal<Step>('login');
  readonly mode = signal<'register' | 'reset'>('register');
  readonly email = signal(this.account.session()?.email ?? '');
  readonly password = signal('');
  readonly code = signal('');
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly resendIn = signal(0);
  readonly doneText = signal('');
  private setupToken = '';
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    markOnboardingSeen();
    const link = decodeURIComponent(location.hash.replace(/^#/, '')).trim();
    if (link) {
      history.replaceState(history.state, '', location.pathname);
      this.run(async () => {
        const res = await this.account.verify({ link });
        this.setupToken = res.setupToken;
        this.email.set(res.email);
        this.step.set('password');
      });
    }
  }

  login(): void {
    const email = normalizeEmail(this.email());
    if (!email || !this.password()) {
      this.error.set('Podaj e-mail i hasło');
      return;
    }
    this.run(async () => this.finish(await this.account.login(email, this.password())));
  }

  startSetup(mode: 'register' | 'reset'): void {
    this.mode.set(mode);
    this.error.set(null);
    this.step.set('email');
  }

  sendCode(): void {
    const email = normalizeEmail(this.email());
    if (!email) {
      this.error.set('Podaj poprawny adres e-mail');
      return;
    }
    this.run(async () => {
      await this.account.requestCode(email);
      this.email.set(email);
      this.step.set('code');
      this.startResendTimer();
    });
  }

  checkCode(): void {
    const code = this.code().replace(/\s/g, '');
    this.run(async () => {
      const res = await this.account.verify({ email: this.email(), code });
      this.setupToken = res.setupToken;
      this.step.set('password');
    });
  }

  savePassword(): void {
    const problem = passwordProblem(this.password());
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.run(async () => this.finish(await this.account.setPassword(this.setupToken, this.password())));
  }

  private finish(res: { movedGraves: number }): void {
    this.password.set('');
    this.doneText.set(
      res.movedGraves > 0
        ? `Przenoszę ${res.movedGraves} grobów z „Moje” na konto — zdjęcia wyślą się w tle.`
        : 'Jesteś zalogowany. Twoje mapy są teraz na koncie.'
    );
    this.step.set('done');
  }

  private startResendTimer(): void {
    clearInterval(this.timer);
    this.resendIn.set(60);
    this.timer = setInterval(() => {
      this.resendIn.update((n) => Math.max(0, n - 1));
      if (this.resendIn() === 0) clearInterval(this.timer);
    }, 1000);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (err) {
      this.error.set(err instanceof ApiError || err instanceof Error ? err.message : 'Coś poszło nie tak. Spróbuj ponownie.');
    } finally {
      this.busy.set(false);
    }
  }
}
```

- [ ] **Step 3: Build, testy**

Run: `npx ng build`; `npx ng test --watch=false` → PASS.

- [ ] **Step 4: E2E (lokalny Worker `MAIL_MODE=log`)** — w Playwright, izolowany kontekst: `/logowanie` → „Nie mam konta — załóż” → e-mail → kod z odpowiedzi sieciowej `POST /auth/request` (pole `dev.code`, przechwycone przez `page.waitForResponse`) → „Dalej” → hasło `krotkie` (komunikat „co najmniej 8 znaków”) → `dobrehaslo1` → „Gotowe”. Wyloguj przez `localStorage.removeItem('znajdzgroby-session')`, przeładuj → „Zaloguj się” z tym hasłem → „Gotowe”. Złe hasło → „E-mail lub hasło są nieprawidłowe”.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: ekran logowania — hasło, zakładanie konta i nowe hasło kodem z maila"
```

### Task 8 (B4): Konto w Ustawieniach, pasek na Starcie, mapa prywatna w interfejsie

**Files:**
- Modify: `src/app/features/settings/settings-page.component.ts`, `.html`; `src/app/features/home/home-page.component.ts`, `.html`, `.scss`; `src/app/features/welcome/welcome-page.component.ts`; `src/app/features/family/join-family-page.component.ts`; `src/app/shared/components/space-switcher.component.ts`; `src/app/features/graves/pages/grave-details/grave-details-page.component.ts`

**Interfaces:**
- Consumes: `AccountService` (`loggedIn`, `session`, `logout`, `pendingChanges`), `shouldShowLoginBanner`, `LocalSpace.kind`.

- [ ] **Step 1: Ustawienia — sekcja „Konto”** (pierwsza `section` w `settings-page.component.html`, przed „Rodzinne mapy”):

```html
  <section class="group">
    <h2>Konto</h2>
    <div class="card">
      @if (account.session(); as s) {
      <div class="row row--static">
        <span class="row__icon row__icon--dark"><app-icon name="users" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">{{ s.email }}</span>
          <span class="row__sub">Groby i zdjęcia są na koncie — zaloguj się na innym urządzeniu, żeby je zobaczyć</span>
        </span>
      </div>
      <button type="button" class="row" (click)="logout()">
        <span class="row__icon"><app-icon name="logout" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Wyloguj</span>
          <span class="row__sub">Dane konta znikną z tej przeglądarki, zostają na koncie</span>
        </span>
      </button>
      } @else {
      <a class="row" routerLink="/logowanie">
        <span class="row__icon row__icon--dark"><app-icon name="users" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Zaloguj się</span>
          <span class="row__sub">Żeby mieć groby i zdjęcia na każdym urządzeniu i w każdej przeglądarce</span>
        </span>
        <app-icon class="row__chevron" name="chevron-right" [size]="18" />
      </a>
      }
    </div>
  </section>
```

W `settings-page.component.ts`: `readonly account = inject(AccountService);` i:

```ts
  async logout(): Promise<void> {
    const pending = await this.account.pendingChanges();
    const warning = pending > 0 ? ` ${pending} zmian nie zostało jeszcze wysłanych i przepadnie.` : '';
    if (!confirm(`Wylogować? Groby konta znikną z tej przeglądarki (zostają na koncie).${warning}`)) return;
    await this.account.logout();
  }
```

W `mapRows` filtruj mapy rodzinne: `this.spaces.sharedSpaces().filter((s) => s.kind !== 'personal')`. Opis wiersza eksportu: `Plik bez zdjęć · {{ dataSummary() }}` (zamiast „Plik dla rodziny · …”).

- [ ] **Step 2: Start — pasek logowania**

`home-page.component.ts`: `readonly account = inject(AccountService);` oraz:

```ts
  private readonly bannerDismissedAt = signal<number | null>(Number(readStorage('znajdzgroby-login-banner')) || null);
  readonly showLoginBanner = computed(() =>
    shouldShowLoginBanner({
      loggedIn: this.account.loggedIn(),
      graveCount: this.graveService.gravesCount(),
      dismissedAt: this.bannerDismissedAt(),
      now: Date.now(),
    })
  );

  dismissLoginBanner(): void {
    const now = Date.now();
    writeStorage('znajdzgroby-login-banner', String(now));
    this.bannerDismissedAt.set(now);
  }
```

`home-page.component.html` pod `</header>` (przed banerem mapy tylko do odczytu):

```html
  @if (showLoginBanner()) {
  <div class="login-banner" role="status">
    <p>Zaloguj się, żeby nie stracić grobów przy zmianie telefonu lub przeglądarki.</p>
    <div class="login-banner__actions">
      <a class="pill-btn pill-btn--dark" routerLink="/logowanie">Zaloguj się</a>
      <button type="button" class="pill-btn pill-btn--light" (click)="dismissLoginBanner()">Później</button>
    </div>
  </div>
  }
```

`home-page.component.scss`:

```scss
.login-banner {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: var(--radius-md);
  background: var(--card);
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

- [ ] **Step 3: Powitanie** — pod przyciskiem „Zaczynamy”:

```html
        <button type="button" class="import" (click)="loginExisting()">Mam już konto — zaloguj się</button>
```

i w klasie (z `Router` wstrzykniętym, jeśli brak):

```ts
  loginExisting(): void {
    markOnboardingSeen();
    this.router.navigate(['/logowanie']);
  }
```

- [ ] **Step 4: Dołączanie** — w `join-family-page.component.ts`, w gałęzi `ready` pod notatką o grobach, gdy brak sesji:

```html
      @if (!account.loggedIn()) {
      <p class="hint">Masz konto? <a routerLink="/logowanie">Zaloguj się</a> przed dołączeniem — mapa będzie wtedy na każdym Twoim urządzeniu.</p>
      }
```

(`readonly account = inject(AccountService);`, styl `.hint { margin: 0; font-size: 13px; color: var(--ink-muted); }`).

- [ ] **Step 5: Przełącznik i szczegóły grobu — jedna „Moje”**

`space-switcher.component.ts`, w `rows`: pomiń lokalną „Moje”, gdy jest mapa prywatna konta:

```ts
    this.spaces
      .spaces()
      .filter((s) => !(s.id === LOCAL_SPACE_ID && this.spaces.spaces().some((p) => p.kind === 'personal')))
      .map((s) => { /* bez zmian */ })
```

(import `LOCAL_SPACE_ID`; mapa prywatna jest pierwsza dzięki kolejności z `link()` — `createdAt`; jeśli nie, posortuj `kind === 'personal'` na początek). Opis wiersza mapy prywatnej: `${graves} · na koncie` zamiast stanu synchronizacji rodzinnej.

`grave-details-page.component.ts`, w `targets`: ten sam filtr (lokalna „Moje” znika, gdy jest prywatna).

- [ ] **Step 6: Build, testy, E2E**

Run: `npx ng build`; `npx ng test --watch=false` → PASS.

E2E (lokalny Worker, izolowane konteksty):
- kontekst A z 2 grobami w „Moje” (wstrzyknięte) → pasek na Starcie widoczny → „Później” → pasek znika i po przeładowaniu nie wraca;
- A: Ustawienia → „Zaloguj się” → załóż konto → po „Gotowe” przełącznik pokazuje jedną „Moje” z 2 grobami; `GET /changes` mapy prywatnej (kluczem z IndexedDB) zwraca 2 groby;
- A: dodanie grobu → po synchronizacji „0 zmian czeka”; wylogowanie przy wstrzymanej sieci (`context.setOffline(true)` przed edycją) → okno ostrzega o niewysłanych zmianach, „Anuluj” zostawia dane.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: konto w Ustawieniach, pasek logowania na Starcie, jedna „Moje” po zalogowaniu"
```

### Task 9 (B5): E2E wielu urządzeń, build produkcyjny i PR

**Files:** brak nowych (weryfikacja)

- [ ] **Step 1: E2E — scenariusze ze specyfikacji** (lokalny Worker `MAIL_MODE=log`, `grave-app` na 4260, trzy izolowane konteksty):
  1. A: groby w „Moje” ze zdjęciem (dodanym przez UI) + członek mapy rodzinnej (bez konta) → załóż konto → groby i zdjęcie na serwerze (`GET /photos/<id>` kluczem mapy prywatnej = 200).
  2. B: zaloguj tym samym e-mailem i hasłem → „Moje” z grobami i zdjęciem (bajty dociągnięte), mapa rodzinna obecna.
  3. C: członek tej samej mapy rodzinnej bez konta (osobne dołączenie) → zaloguj tym kontem → w panelu mapy jeden „Kacper” zamiast dwóch.
  4. B: „Nie pamiętam hasła” → nowe hasło → w A po przeładowaniu i `linkIfDue` (wymuś: usuń `znajdzgroby-last-link`) sesja wygasła: Ustawienia pokazują „Zaloguj się”, groby nadal widoczne (Review Focus 1).
  5. A: wyloguj → mapy konta znikają, „Moje” lokalne puste; zaloguj ponownie → wszystko wraca.

- [ ] **Step 2: Build produkcyjny** — `npx ng build`: zero ostrzeżeń, `grep -l "localhost:8791" dist/grave-app-front/browser/*.js` → brak.

- [ ] **Step 3: PR (bez merge'a)** — `gh pr create --repo kacperk72/grave-app --base main --head feat/konta-front`, opis: ekrany, przypinanie, „Moje” na koncie, wylogowanie, zależność od wdrożonego PR z API, jak sprawdzone; `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: Po wdrożeniu (z użytkownikiem)** — kolejność: użytkownik zakłada konto na telefonie z brązowym „Kacprem”, potem loguje się w drugiej przeglądarce (zielony scala się z brązowym), potem rodzina. Sprawdzenie w D1 (tylko SELECT): `SELECT m.name, m.role, u.email FROM members m LEFT JOIN users u ON u.id = m.user_id WHERE m.removed_at IS NULL`.
