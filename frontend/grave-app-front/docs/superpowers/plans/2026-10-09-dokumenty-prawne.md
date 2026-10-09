# Dokumenty prawne, zgoda i usuwanie konta — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regulamin i polityka prywatności w aplikacji, zgoda przy przekazaniu danych na serwer (konto, mapy rodzinne), stały dostęp do dokumentów, samodzielne usunięcie konta, czcionka bez Google i sprzątanie starych danych logowania.

**Architecture:** Worker dostaje migrację 0007 (wersja zgody przy koncie i członku), wymóg `acceptTerms` przy zakładaniu konta, podgląd i wykonanie usunięcia konta jednym `DB.batch` oraz sprzątanie w cronie. Aplikacja dostaje stałe wersji (`shared/legal.ts`), dwa ekrany dokumentów, wspólny checkbox zgody (logowanie, formularz profilu przy mapach), okno „Usuń konto” w Ustawieniach i czcionkę Onest z własnego serwera.

**Tech Stack:** Cloudflare Worker + D1 (TypeScript), Angular 21 zoneless (signals, standalone, OnPush), Vitest, Playwright (E2E przez MCP), `npm run smoke` (test dymny Workera).

**Spec:** `frontend/grave-app-front/docs/superpowers/specs/2026-10-09-dokumenty-prawne-design.md` · makieta: `frontend/grave-app-front/docs/makiety/dokumenty-prawne.html`

## Global Constraints

- Push na `main` = wydanie produkcyjne (front przez Hostinger, Worker + migracje D1 przez Actions). Praca na gałęzi `feat/dokumenty-prawne`, PR, scalenie tylko za zgodą użytkownika.
- Testy i E2E wyłącznie lokalnie: Worker `grave-app-api` (port 8791, `MAIL_MODE=log`), aplikacja `grave-app` (port 4260). Nigdy na produkcji.
- Darmowy plan Cloudflare, bez nowych płatnych usług.
- Nie zmieniać nazw `GraveMapDB` ani kluczy `gravemap-*`.
- `TERMS_VERSION = 1` w Workerze (`worker/src/legal.ts`) i w aplikacji (`src/app/shared/legal.ts`) — zawsze ta sama liczba.
- Kontakt w dokumentach: `kontakt@znajdzgroby.pl`; administrator / usługodawca: Kacper Kubit. W repo (publicznym) żadnych prywatnych adresów e-mail — w testach i makietach `@example.com`.
- Wiek: 18+ (konto i mapy rodzinne). Zamknięcie serwisu: co najmniej 30 dni uprzedzenia. Reklamacje: odpowiedź do 14 dni.
- Teksty dla użytkownika po polsku, ton jak w aplikacji (krótko, na „ty”).
- Treść dokumentów to projekt, nie porada prawna — tak opisany w PR.

## Review Focus

1. **Mapa rodzinna, w której poza użytkownikiem są tylko usunięci lub scaleni członkowie** — przy usuwaniu konta to mapa „samotna” (efekt `delete`), nie przekazanie roli osobie, której już nie ma (Task 2: test dymny).
2. **Ten sam e-mail po usunięciu konta** — można od razu założyć konto od nowa; stare kody i sesje nie przeszkadzają (Task 2: test dymny).
3. **Link z maila przy resecie istniejącego konta** — bez checkboxa zgody; przy nowym koncie z checkboxem (pole `exists` z `/auth/verify`) (Task 1: test dymny, Task 6: E2E).
4. **Usuwanie konta bez internetu albo z wygasłą sesją** — czytelny komunikat, dane w telefonie nietknięte; przy 401 sesja czyszczona jak przy wygasłej sesji (Task 7: E2E).
5. **Dokument otwarty z checkboxa w nowej karcie** — formularz w pierwotnej karcie zachowuje wpisane hasło / imię (Task 6: E2E).

---

### Task 1: API — zgoda przy koncie i mapach, `exists` w weryfikacji, sprzątanie w cronie

**Files:**
- Create: `worker/migrations/0007_legal.sql`, `worker/src/legal.ts`, `worker/src/cleanup.ts`
- Modify: `worker/src/accounts.ts` (`verifyCode`, `setPassword`), `worker/src/members.ts` (`NewMember`, `insertMember`, `createSpace`, `joinSpace`), `worker/src/index.ts` (`scheduled`), `worker/scripts/smoke.mjs`

**Interfaces:**
- Produces: `TERMS_VERSION: number` (= 1), `parseTermsVersion(value: unknown): number | null`; `POST /auth/verify` → `{ setupToken, email, exists: boolean }`; `POST /auth/login` i `POST /auth/password` → `user: { id, email, termsVersion: number | null }`; `POST /auth/password` wymaga `acceptTerms: 1` dla nowego konta; `POST /spaces` i `POST /join` przyjmują opcjonalne `acceptTerms`; `cleanupAuth(env: Env): Promise<void>`.

- [ ] **Step 1: Test dymny (czerwony)** — w `smoke.mjs` zmień helper `register` i wywołanie `set` w `accounts()`, potem dodaj sekcję `legalConsent()` przed `const legacyToken = await legacy();` i wywołaj ją po `await hardening();`:

```js
// register(): nowe konta wymagają zgody
async function register(email, password) {
  const req = await call('POST', '/auth/request', { body: { email } });
  const ver = await call('POST', '/auth/verify', { body: { email, code: req.data?.dev?.code } });
  const set = await call('POST', '/auth/password', { body: { setupToken: ver.data?.setupToken, password, acceptTerms: 1 } });
  return set.data?.session;
}
```

W `accounts()` zamień `const set = await call('POST', '/auth/password', { body: { setupToken: ver.data?.setupToken, password: 'dobrehaslo1' } });` na wersję z `acceptTerms: 1`.

```js
/** Zgoda na regulamin: konto wymaga, reset nie; mapy zapisują wersję; cron sprząta. */
async function legalConsent() {
  sqlRun('UPDATE login_codes SET ip_hash = NULL');
  const email = `zgoda-${Date.now()}@example.com`;
  const r1 = await call('POST', '/auth/request', { body: { email } });
  const v1 = await call('POST', '/auth/verify', { body: { email, code: r1.data?.dev?.code } });
  check('weryfikacja nowego adresu: exists=false', v1.status === 200 && v1.data?.exists === false, v1);
  const noTerms = await call('POST', '/auth/password', { body: { setupToken: v1.data?.setupToken, password: 'dobrehaslo1' } });
  check('nowe konto bez zgody: 400', noTerms.status === 400, noTerms);
  const withTerms = await call('POST', '/auth/password', { body: { setupToken: v1.data?.setupToken, password: 'dobrehaslo1', acceptTerms: 1 } });
  check('nowe konto ze zgodą: sesja', withTerms.status === 200 && typeof withTerms.data?.session === 'string', withTerms);
  check('wersja regulaminu zapisana przy koncie', sql(`SELECT terms_version AS n FROM users WHERE email = '${email}'`) === 1);

  const r2 = await call('POST', '/auth/request', { body: { email } });
  const v2 = await call('POST', '/auth/verify', { body: { email, code: r2.data?.dev?.code } });
  check('weryfikacja istniejącego konta: exists=true', v2.data?.exists === true, v2);
  const reset = await call('POST', '/auth/password', { body: { setupToken: v2.data?.setupToken, password: 'nowehaslo22' } });
  check('nowe hasło istniejącego konta bez zgody: OK', reset.status === 200 && reset.data?.user?.termsVersion === 1, reset);
  check('zgoda konta: data i godzina zapisane', sql(`SELECT COUNT(*) AS n FROM users WHERE email = '${email}' AND terms_accepted_at > 0`) === 1);
  const logged = await call('POST', '/auth/login', { body: { email, password: 'nowehaslo22' } });
  check('logowanie zwraca wersję zgody konta (nowe urządzenie bez ponownej zgody)', logged.data?.user?.termsVersion === 1, logged);

  const fam = await call('POST', '/spaces', { body: { name: 'Zgoda', member: { name: 'Ala', color: 'sky' }, acceptTerms: 1 } });
  check('założyciel mapy: wersja zgody zapisana', sql(`SELECT terms_version AS n FROM members WHERE id = '${fam.data.memberId}'`) === 1);
  const j = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Ola', color: 'rose', acceptTerms: 1 } });
  check('dołączający: wersja zgody zapisana', sql(`SELECT terms_version AS n FROM members WHERE id = '${j.data.memberId}'`) === 1);
  check('dołączający: data i godzina zgody zapisane', sql(`SELECT COUNT(*) AS n FROM members WHERE id = '${j.data.memberId}' AND terms_accepted_at > 0`) === 1);
  const old = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Stara', color: 'sage' } });
  check('dołączenie bez pola zgody (stara aplikacja) dalej działa', old.status === 201, old);
  check('bez zgody: brak daty zgody', sql(`SELECT COUNT(*) AS n FROM members WHERE id = '${old.data.memberId}' AND terms_accepted_at IS NULL`) === 1);

  // Cron: kody starsze niż 24 h i wygasłe sesje znikają
  const uid = sql(`SELECT id AS n FROM users WHERE email = '${email}'`);
  sqlRun(`INSERT INTO login_codes (id, email, code_hash, link_hash, created_at, expires_at) VALUES ('stary-kod', 'x@example.com', 'h', 'stary-link', 1, 2)`);
  sqlRun(`INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES ('stara-sesja', '${uid}', 1, 1, 2)`);
  let cron = null;
  for (let i = 0; i < 5 && !cron; i++) cron = await fetch(`${API}/__scheduled?cron=17+3+*+*+*`).catch(() => null);
  check('cron: stary kod usunięty', sql("SELECT COUNT(*) AS n FROM login_codes WHERE id = 'stary-kod'") === 0);
  check('cron: wygasła sesja usunięta', sql("SELECT COUNT(*) AS n FROM sessions WHERE token_hash = 'stara-sesja'") === 0);
  check('cron: aktywna sesja została', sql(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = '${uid}'`) >= 1);
}
```

- [ ] **Step 2: Uruchom i zobacz czerwony**

Run: `npx wrangler d1 migrations apply grave-app --local` (brak nowych), potem `npm run smoke` w `worker/` (lokalny Worker uruchomiony przez `preview_start grave-app-api`).
Expected: FAIL na `exists=false`, `bez zgody: 400`, `wersja regulaminu zapisana…` (brak kolumny → błąd sql), `cron:` — reszta OK.

- [ ] **Step 3: Migracja i stała**

`worker/migrations/0007_legal.sql`:
```sql
-- Zgoda na regulamin: wersja oraz data i godzina — przy koncie i przy członku mapy. Migracja tylko dodaje kolumny.
ALTER TABLE users ADD COLUMN terms_version INTEGER;
ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER;
ALTER TABLE members ADD COLUMN terms_version INTEGER;
ALTER TABLE members ADD COLUMN terms_accepted_at INTEGER;
```

`worker/src/legal.ts`:
```ts
/** Wersja regulaminu i polityki prywatności — ta sama liczba co TERMS_VERSION w aplikacji. */
export const TERMS_VERSION = 1;

/** Wersja zgody z ciała zapytania albo null (brak / śmieci / wersja z przyszłości). */
export function parseTermsVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= TERMS_VERSION
    ? value
    : null;
}
```

- [ ] **Step 4: `verifyCode` zwraca `exists`** — w `accounts.ts` zamień końcowe `return json({ setupToken, email: row.email });` na:
```ts
  // Tylko właściciel skrzynki zna kod — może się dowiedzieć, czy konto już jest (nowe hasło vs zakładanie)
  const exists = await env.DB.prepare('SELECT 1 AS yes FROM users WHERE email = ?').bind(row.email).first();
  return json({ setupToken, email: row.email, exists: exists !== null });
```

- [ ] **Step 5: `setPassword` wymaga zgody przy zakładaniu** — w `accounts.ts`:
  - import: `import { TERMS_VERSION, parseTermsVersion } from './legal';`
  - typ ciała: `{ setupToken?: unknown; password?: unknown; acceptTerms?: unknown }`
  - przenieś zapytanie `existing` **przed** `hashPassword`, rozszerzone o zgodę: `SELECT id, terms_version FROM users WHERE email = ?` (`.first<{ id: string; terms_version: number | null }>()`), i dodaj zaraz po nim:
```ts
  const terms = parseTermsVersion(body?.acceptTerms);
  if (!existing && terms !== TERMS_VERSION) {
    throw new HttpError(400, 'Zaakceptuj regulamin, żeby założyć konto');
  }
```
  - INSERT nowego użytkownika z kolumnami zgody:
```ts
      : env.DB.prepare(
          `INSERT INTO users (id, email, password_hash, password_salt, password_algo, password_iterations,
             created_at, updated_at, terms_version, terms_accepted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(userId, code.email, hash, salt, PASSWORD_ALGO, PASSWORD_ITERATIONS, now, now, TERMS_VERSION, now),
```
  - odpowiedź: `return json({ session, user: { id: userId, email: code.email, termsVersion: existing ? existing.terms_version : TERMS_VERSION } });`

- [ ] **Step 5b: Logowanie zwraca wersję zgody** — w `login`: do SELECT użytkownika dopisz `terms_version`, do typu `UserRow` pole `terms_version: number | null`, odpowiedź `json({ session, user: { id: user.id, email: user.email, termsVersion: user.terms_version } })`. (Aplikacja oznacza wtedy zgodę na nowym urządzeniu — Task 6.)

- [ ] **Step 6: Mapy zapisują wersję zgody** — w `members.ts`:
  - `import { parseTermsVersion } from './legal';`
  - `NewMember` dostaje `termsVersion?: number | null;`
  - `insertMember`: kolumny `terms_version, terms_accepted_at` w INSERT (`... user_id, terms_version, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` i `.bind(..., m.userId ?? null, m.termsVersion ?? null, m.termsVersion ? now : null)`).
  - `createSpace`: typ ciała `acceptTerms?: unknown`; w `insertMember(env, {...})` dodaj `termsVersion: parseTermsVersion(body.acceptTerms)`.
  - `joinSpace`: typ ciała `{ name?: unknown; color?: unknown; acceptTerms?: unknown }`; w obiekcie `member` dodaj `termsVersion: parseTermsVersion(body?.acceptTerms)`.

- [ ] **Step 7: Sprzątanie w cronie** — `worker/src/cleanup.ts`:
```ts
import type { Env } from './index';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kody z maila (ze skrótem IP) żyją 24 h, wygasłe sesje znikają — okresy z polityki prywatności. */
export async function cleanupAuth(env: Env, now = Date.now()): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_codes WHERE created_at < ?').bind(now - DAY_MS),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
}
```
W `index.ts`: `import { cleanupAuth } from './cleanup';` i w `scheduled`: `await purgePhotos(env); await cleanupAuth(env);`.

- [ ] **Step 8: Zielony**

Run: `npx wrangler d1 migrations apply grave-app --local`; `npx tsc --noEmit -p .`; `npm run smoke`.
Expected: migracja 0007 ✅, typy bez błędów, smoke „wszystko ok”.

- [ ] **Step 9: Commit**
```bash
git add worker
git commit -m "feat(api): zgoda na regulamin przy koncie i mapach, exists w weryfikacji, sprzątanie kodów i sesji"
```

---

### Task 2: API — podgląd i usunięcie konta

**Files:**
- Create: `worker/src/deletion.ts`
- Modify: `worker/src/accounts.ts` (wydzielenie `checkUserPassword` z `login`, eksport `UserRow`), `worker/src/members.ts` (eksport `LEGACY_ACTIVITY_MS`), `worker/src/index.ts` (trasy), `worker/scripts/smoke.mjs`

**Interfaces:**
- Consumes: `requireUser(request, env): Promise<User>` (accounts.ts), `json`, `HttpError`, `readJson` (http.ts).
- Produces: `GET /account/deletion` → `DeletionPreview`; `POST /account/delete` `{ password }` → `{ ok: true }`; 401 „Hasło jest nieprawidłowe”, 429 przy blokadzie.
```ts
export type FamilyEffect = 'leave' | 'transfer' | 'delete';
export interface DeletionPreview {
  personal: { graves: number; photos: number };
  families: { spaceId: string; name: string; effect: FamilyEffect; heir?: string }[];
}
```

- [ ] **Step 1: Test dymny (czerwony)** — sekcja `accountDeletion()` w `smoke.mjs`, wywołana po `await legalConsent();`:

```js
/** Usunięcie konta: podgląd, złe hasło, skutki w mapach, anonimizacja, ponowna rejestracja. */
async function accountDeletion() {
  sqlRun('UPDATE login_codes SET ip_hash = NULL');
  const email = `usun-${Date.now()}@example.com`;
  const d = await register(email, 'dobrehaslo1');
  const me = await call('GET', '/account', { token: d });
  const uid = me.data?.user?.id;

  // F1: D zakłada, Ola dołącza → przekazanie roli; F2: Ewa zakłada, D dołącza z sesją → wyjście;
  // F3: D sam (Ula dołączyła i wyszła) → usunięcie
  const f1 = await call('POST', '/spaces', { body: { name: 'F1', member: { name: 'Kacper', color: 'clay' } } });
  const ola = await call('POST', '/join', { token: f1.data.invite, body: { name: 'Ola', color: 'rose' } });
  const f2 = await call('POST', '/spaces', { body: { name: 'F2', member: { name: 'Ewa', color: 'sky' } } });
  const dInF2 = await call('POST', '/join', { token: f2.data.invite, headers: { 'X-Session': d }, body: { name: 'Kacper', color: 'clay' } });
  const f3 = await call('POST', '/spaces', { body: { name: 'F3', member: { name: 'Kacper', color: 'clay' } } });
  const ula = await call('POST', '/join', { token: f3.data.invite, body: { name: 'Ula', color: 'moss' } });
  await call('POST', '/space/leave', { token: ula.data.memberToken });
  const linked = await call('POST', '/account/link', { token: d, body: { tokens: [f1.data.memberToken, f3.data.memberToken] } });
  const personal = linked.data.spaces.find((s) => s.kind === 'personal');
  await call('POST', '/changes', { token: personal.memberToken, body: { changes: [{ id: 'g-usun-1', deleted: false, data: grave('g-usun-1') }] } });
  await call('POST', '/changes', { token: f3.data.memberToken, body: { changes: [{ id: 'g-usun-3', deleted: false, data: grave('g-usun-3') }] } });
  sqlRun(`INSERT INTO photo_objects (key, space_id, bytes, created_at) VALUES ('${personal.spaceId}/p1/full', '${personal.spaceId}', 10, 1), ('${personal.spaceId}/p1/thumb', '${personal.spaceId}', 5, 1)`);

  const pv = await call('GET', '/account/deletion', { token: d });
  const eff = Object.fromEntries((pv.data?.families ?? []).map((f) => [f.name, f]));
  check('podgląd: Moje — 1 grób, 1 zdjęcie', pv.data?.personal?.graves === 1 && pv.data?.personal?.photos === 1, pv.data);
  check('podgląd: F1 przekazanie roli Oli', eff.F1?.effect === 'transfer' && eff.F1?.heir === 'Ola', eff.F1);
  check('podgląd: F2 wyjście', eff.F2?.effect === 'leave', eff.F2);
  check('podgląd: F3 (tylko usunięci inni) usunięcie mapy', eff.F3?.effect === 'delete', eff.F3);

  const bad = await call('POST', '/account/delete', { token: d, body: { password: 'zlehaslo00' } });
  check('usunięcie ze złym hasłem: 401, konto zostaje', bad.status === 401 && sql(`SELECT COUNT(*) AS n FROM users WHERE id = '${uid}'`) === 1, bad);

  const del = await call('POST', '/account/delete', { token: d, body: { password: 'dobrehaslo1' } });
  check('usunięcie konta: 200', del.status === 200, del);
  check('konto i sesje skasowane', sql(`SELECT COUNT(*) AS n FROM users WHERE id = '${uid}'`) === 0 && sql(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = '${uid}'`) === 0);
  check('sesja po usunięciu: 401', (await call('GET', '/account', { token: d })).status === 401);
  const olaNow = await call('GET', '/space', { token: ola.data.memberToken });
  check('F1: Ola jest założycielką', olaNow.data?.me?.role === 'owner', olaNow);
  check('F1: stary klucz D nie działa', (await call('GET', '/space', { token: f1.data.memberToken })).status === 401);
  const f2Members = await call('GET', '/members', { token: f2.data.memberToken });
  check('F2: D zniknął z listy członków', f2Members.data?.members?.length === 1, f2Members.data);
  check('F2: klucz D nie działa', (await call('GET', '/space', { token: dInF2.data.memberToken })).status === 401);
  check('F3 i Moje usunięte z grobami', sql(`SELECT COUNT(*) AS n FROM spaces WHERE id IN ('${f3.data.spaceId}', '${personal.spaceId}')`) === 0 && sql("SELECT COUNT(*) AS n FROM graves WHERE id IN ('g-usun-1', 'g-usun-3')") === 0);
  check('zdjęcia Moje w kolejce kasowania', sql(`SELECT COUNT(*) AS n FROM photo_purge WHERE key LIKE '${personal.spaceId}/%'`) === 2);
  check('członkowie zanonimizowani', sql(`SELECT COUNT(*) AS n FROM members WHERE user_id = '${uid}'`) === 0 && sql(`SELECT COUNT(*) AS n FROM members WHERE id = '${dInF2.data.memberId}' AND name = 'Usunięte konto' AND removed_at IS NOT NULL`) === 1);

  const again = await register(email, 'dobrehaslo1');
  check('ten sam e-mail: nowe konto po usunięciu', typeof again === 'string');
}
```

- [ ] **Step 2: Uruchom i zobacz czerwony**

Run: `npm run smoke` w `worker/`.
Expected: FAIL od „podgląd: …” (404) w dół; wcześniejsze sekcje OK.

- [ ] **Step 3: Wspólne sprawdzanie hasła** — w `accounts.ts` wydziel z `login` funkcję i użyj jej w `login`:

```ts
/**
 * Sprawdza hasło konta z licznikiem prób: próba liczona atomowo PRZED PBKDF2 (równoległe zgadywanie też
 * blokuje), 5. próba zakłada blokadę na 15 minut, dobre hasło zeruje licznik. 429 przy blokadzie.
 */
export async function checkUserPassword(env: Env, user: UserRow, password: string, now = Date.now()): Promise<boolean> {
  const attempt = await env.DB.prepare(
    `UPDATE users
        SET failed_logins = (CASE WHEN locked_until IS NOT NULL THEN 0 ELSE failed_logins END) + 1,
            locked_until = CASE WHEN (CASE WHEN locked_until IS NOT NULL THEN 0 ELSE failed_logins END) + 1 >= ?1
                                THEN ?2 ELSE NULL END
      WHERE id = ?3 AND (locked_until IS NULL OR locked_until <= ?4)
      RETURNING failed_logins`
  )
    .bind(MAX_LOGIN_FAILURES, now + LOCK_MS, user.id, now)
    .first<{ failed_logins: number }>();
  if (!attempt) throw new HttpError(429, 'Za dużo prób. Spróbuj za kilkanaście minut albo ustaw nowe hasło.');
  if (!(await verifyPassword(password, user))) return false;
  await env.DB.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').bind(user.id).run();
  return true;
}
```
W `login`: zastąp blok od `const attempt = …` do `if (!(await verifyPassword…)) throw …` wywołaniem `if (!(await checkUserPassword(env, user, password, now))) throw new HttpError(401, BAD_LOGIN);` i usuń końcowe zerowanie licznika (robi to `checkUserPassword`). `type UserRow` → `export type UserRow`. Dodaj `export const USER_COLUMNS = 'id, email, password_hash, password_salt, password_algo, password_iterations, failed_logins, locked_until, terms_version';` i użyj go w SELECT w `login`.

- [ ] **Step 4: `LEGACY_ACTIVITY_MS`** — w `members.ts` zmień `const LEGACY_ACTIVITY_MS` na `export const LEGACY_ACTIVITY_MS`.

- [ ] **Step 5: `worker/src/deletion.ts`**

```ts
import type { Env } from './index';
import { HttpError, json, readJson } from './http';
import { USER_COLUMNS, UserRow, checkUserPassword, requireUser } from './accounts';
import { LEGACY_ACTIVITY_MS } from './members';

export type FamilyEffect = 'leave' | 'transfer' | 'delete';

interface FamilyStep {
  spaceId: string;
  name: string;
  memberId: string;
  effect: FamilyEffect;
  heir?: string;
  heirId?: string;
}

interface DeletionPlan {
  personalSpaceId: string | null;
  personal: { graves: number; photos: number };
  families: FamilyStep[];
}

/** Co zrobi usunięcie konta — ta sama funkcja liczy podgląd i wykonanie. */
async function planAccountDeletion(env: Env, userId: string): Promise<DeletionPlan> {
  const personal = await env.DB.prepare("SELECT id FROM spaces WHERE kind = 'personal' AND owner_user_id = ?")
    .bind(userId)
    .first<{ id: string }>();
  let graves = 0;
  let photos = 0;
  if (personal) {
    const counts = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM graves WHERE space_id = ?1 AND deleted = 0) AS graves,
              (SELECT COUNT(*) FROM photo_objects WHERE space_id = ?1 AND key LIKE '%/full') AS photos`
    )
      .bind(personal.id)
      .first<{ graves: number; photos: number }>();
    graves = counts?.graves ?? 0;
    photos = counts?.photos ?? 0;
  }

  const { results } = await env.DB.prepare(
    `SELECT m.id AS memberId, m.role, s.id AS spaceId, s.name, s.invite_seen_at AS seen
       FROM members m JOIN spaces s ON s.id = m.space_id
      WHERE m.user_id = ? AND m.removed_at IS NULL AND s.kind = 'family'
      ORDER BY m.joined_at`
  )
    .bind(userId)
    .all<{ memberId: string; role: string; spaceId: string; name: string; seen: number | null }>();

  const families: FamilyStep[] = [];
  for (const row of results) {
    const other = await env.DB.prepare(
      'SELECT id, name FROM members WHERE space_id = ? AND removed_at IS NULL AND id != ? ORDER BY joined_at LIMIT 1'
    )
      .bind(row.spaceId, row.memberId)
      .first<{ id: string; name: string }>();
    const base = { spaceId: row.spaceId, name: row.name, memberId: row.memberId };
    if (other) {
      families.push(
        row.role === 'owner'
          ? { ...base, effect: 'transfer', heir: other.name, heirId: other.id }
          : { ...base, effect: 'leave' }
      );
      continue;
    }
    // Sam na mapie: usuwamy ją, chyba że niedawno korzystały z niej telefony bez podpisu (stara aplikacja)
    const legacyActive =
      env.ALLOW_INVITE_AS_MEMBER !== 'false' && !!row.seen && row.seen > Date.now() - LEGACY_ACTIVITY_MS;
    families.push({ ...base, effect: legacyActive ? 'leave' : 'delete' });
  }
  return { personalSpaceId: personal?.id ?? null, personal: { graves, photos }, families };
}

export async function accountDeletionPreview(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const plan = await planAccountDeletion(env, user.id);
  return json({
    personal: plan.personal,
    families: plan.families.map(({ spaceId, name, effect, heir }) => ({ spaceId, name, effect, heir })),
  });
}

/** Usuwa konto po sprawdzeniu hasła — wszystko w jednym batchu (wszystko albo nic). */
export async function deleteAccount(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const body = (await readJson(request)) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  const row = await env.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).bind(user.id).first<UserRow>();
  if (!row) throw new HttpError(401, 'Sesja wygasła — zaloguj się ponownie');
  if (!(await checkUserPassword(env, row, password))) throw new HttpError(401, 'Hasło jest nieprawidłowe');

  const plan = await planAccountDeletion(env, user.id);
  const now = Date.now();
  const removeSpace = (id: string) => [
    env.DB.prepare(
      `INSERT INTO photo_purge (key, queued_at) SELECT key, ?1 FROM photo_objects WHERE space_id = ?2
       ON CONFLICT (key) DO NOTHING`
    ).bind(now, id),
    env.DB.prepare('DELETE FROM graves WHERE space_id = ?').bind(id),
    env.DB.prepare('DELETE FROM member_tokens WHERE member_id IN (SELECT id FROM members WHERE space_id = ?)').bind(id),
    env.DB.prepare('DELETE FROM members WHERE space_id = ?').bind(id),
    env.DB.prepare('DELETE FROM spaces WHERE id = ?').bind(id),
  ];
  const statements: D1PreparedStatement[] = [];
  for (const f of plan.families) {
    if (f.effect === 'transfer' && f.heirId) {
      // Najpierw odebranie roli, potem nadanie — indeks members_one_owner
      statements.push(
        env.DB.prepare("UPDATE members SET role = 'member' WHERE id = ?").bind(f.memberId),
        env.DB.prepare("UPDATE members SET role = 'owner' WHERE id = ?").bind(f.heirId)
      );
    }
    if (f.effect === 'delete') statements.push(...removeSpace(f.spaceId));
  }
  if (plan.personalSpaceId) statements.push(...removeSpace(plan.personalSpaceId));
  statements.push(
    // Wszyscy członkowie konta (także usunięci i scaleni): bez imienia, bez kluczy, bez powiązania z kontem
    env.DB.prepare('DELETE FROM member_tokens WHERE member_id IN (SELECT id FROM members WHERE user_id = ?)').bind(user.id),
    env.DB.prepare(
      "UPDATE members SET name = 'Usunięte konto', user_id = NULL, removed_at = COALESCE(removed_at, ?) WHERE user_id = ?"
    ).bind(now, user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(user.email),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)
  );
  await env.DB.batch(statements);
  return json({ ok: true });
}
```

W `index.ts`: `import { accountDeletionPreview, deleteAccount } from './deletion';` i obok trasy `/account/link`:
```ts
  if (request.method === 'GET' && path === '/account/deletion') return accountDeletionPreview(request, env);
  if (request.method === 'POST' && path === '/account/delete') return deleteAccount(request, env);
```
(`User` z `requireUser` ma `id` i `email`.)

- [ ] **Step 6: Zielony**

Run: `npx tsc --noEmit -p .`; `npm run smoke`.
Expected: „wszystko ok” (także sekcje accounts/hardening — `login` korzysta z `checkUserPassword`).

- [ ] **Step 7: Commit**
```bash
git add worker
git commit -m "feat(api): podgląd i usunięcie konta — mapa prywatna, wyjście z map rodzinnych, anonimizacja"
```

---

### Task 3: Aplikacja — stałe dokumentów, pamięć zgody, checkbox, teksty skutków usunięcia

**Files:**
- Create: `src/app/shared/legal.ts`, `src/app/shared/legal.spec.ts`, `src/app/shared/components/terms-checkbox.component.ts`
- Modify: `src/app/shared/utils/account-rules.ts`, `src/app/shared/utils/account-rules.spec.ts`

**Interfaces:**
- Produces: `TERMS_VERSION = 1`, `TERMS_DATE: string`, `CONTACT_EMAIL = 'kontakt@znajdzgroby.pl'`, `acceptedTermsVersion(): number`, `needsTermsAcceptance(accepted?: number): boolean`, `markTermsAccepted(): void`; `<app-terms-checkbox [(accepted)]>`; `DeletionPreview`, `FamilyDeletionEffect`, `personalDeletionText(p: { graves: number; photos: number }): string`, `familyDeletionText(f: FamilyDeletionEffect): string`.

- [ ] **Step 1: Testy (czerwone)** — `src/app/shared/legal.spec.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { TERMS_VERSION, needsTermsAcceptance } from './legal';

describe('needsTermsAcceptance', () => {
  it('bez zgody w tym urządzeniu — trzeba zaakceptować', () => expect(needsTermsAcceptance(0)).toBe(true));
  it('starsza wersja — trzeba zaakceptować', () => expect(needsTermsAcceptance(TERMS_VERSION - 1)).toBe(true));
  it('bieżąca wersja — bez checkboxa', () => expect(needsTermsAcceptance(TERMS_VERSION)).toBe(false));
});
```
Dopisz do `account-rules.spec.ts`:
```ts
describe('teksty usunięcia konta', () => {
  it('Moje z grobami i zdjęciami', () =>
    expect(personalDeletionText({ graves: 12, photos: 1 })).toBe('„Moje” — 12 grobów i 1 zdjęcie zostanie usuniętych'));
  it('puste Moje', () => expect(personalDeletionText({ graves: 0, photos: 0 })).toBe('„Moje” jest puste'));
  it('wyjście', () =>
    expect(familyDeletionText({ spaceId: 'a', name: 'Rodzinna Kępa', effect: 'leave' })).toBe(
      '„Rodzinna Kępa” — wychodzisz. Twoje groby zostają dla rodziny.'
    ));
  it('przekazanie roli', () =>
    expect(familyDeletionText({ spaceId: 'a', name: 'Rodzinna Kubit', effect: 'transfer', heir: 'Weronika' })).toBe(
      '„Rodzinna Kubit” — wychodzisz, rola założyciela przejdzie na: Weronika. Twoje groby zostają dla rodziny.'
    ));
  it('usunięcie mapy', () =>
    expect(familyDeletionText({ spaceId: 'a', name: 'Stara', effect: 'delete' })).toBe(
      '„Stara” — nikogo poza Tobą tu nie ma, mapa zostanie usunięta razem z grobami i zdjęciami.'
    ));
});
```
(import `familyDeletionText, personalDeletionText` w nagłówku pliku).

- [ ] **Step 2: Uruchom i zobacz czerwony**

Run: `npx ng test --watch=false` w `frontend/grave-app-front`.
Expected: FAIL — brak modułu `./legal` i eksportów w `account-rules`.

- [ ] **Step 3: `src/app/shared/legal.ts`**
```ts
import { readStorage, writeStorage } from '../core/services/storage';

/** Wersja regulaminu i polityki prywatności — ta sama liczba co TERMS_VERSION w Workerze. */
export const TERMS_VERSION = 1;
/** Data obowiązywania bieżącej wersji (ustawiana na dzień wydania). */
export const TERMS_DATE = '9.10.2026';
export const CONTACT_EMAIL = 'kontakt@znajdzgroby.pl';

const TERMS_KEY = 'znajdzgroby-terms';

/** Wersja zaakceptowana na tym urządzeniu (0 = żadna). */
export function acceptedTermsVersion(): number {
  return Number(readStorage(TERMS_KEY)) || 0;
}

export function needsTermsAcceptance(accepted = acceptedTermsVersion()): boolean {
  return accepted < TERMS_VERSION;
}

export function markTermsAccepted(): void {
  writeStorage(TERMS_KEY, String(TERMS_VERSION));
}
```

- [ ] **Step 4: Teksty w `account-rules.ts`** (import `pluralPl` z `./grave-display`):
```ts
export type FamilyEffect = 'leave' | 'transfer' | 'delete';

export interface FamilyDeletionEffect {
  spaceId: string;
  name: string;
  effect: FamilyEffect;
  heir?: string;
}

/** Odpowiedź `GET /account/deletion`. */
export interface DeletionPreview {
  personal: { graves: number; photos: number };
  families: FamilyDeletionEffect[];
}

export function personalDeletionText({ graves, photos }: { graves: number; photos: number }): string {
  if (graves === 0 && photos === 0) return '„Moje” jest puste';
  return `„Moje” — ${graves} ${pluralPl(graves, 'grób', 'groby', 'grobów')} i ${photos} ${pluralPl(
    photos,
    'zdjęcie',
    'zdjęcia',
    'zdjęć'
  )} zostanie usuniętych`;
}

export function familyDeletionText(f: FamilyDeletionEffect): string {
  switch (f.effect) {
    case 'transfer':
      return `„${f.name}” — wychodzisz, rola założyciela przejdzie na: ${f.heir}. Twoje groby zostają dla rodziny.`;
    case 'delete':
      return `„${f.name}” — nikogo poza Tobą tu nie ma, mapa zostanie usunięta razem z grobami i zdjęciami.`;
    default:
      return `„${f.name}” — wychodzisz. Twoje groby zostają dla rodziny.`;
  }
}
```

- [ ] **Step 5: `terms-checkbox.component.ts`**
```ts
import { ChangeDetectionStrategy, Component, model } from '@angular/core';

/** Zgoda na regulamin — dokumenty w nowej karcie, żeby nie zgubić wypełnionego formularza. */
@Component({
  selector: 'app-terms-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="terms">
      <input type="checkbox" [checked]="accepted()" (change)="accepted.set($any($event.target).checked)" />
      <span>
        Akceptuję <a href="/regulamin" target="_blank" rel="noopener">Regulamin</a> i zapoznałem/am się
        z <a href="/prywatnosc" target="_blank" rel="noopener">Polityką prywatności</a>
      </span>
    </label>
  `,
  styles: [
    `
      .terms { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: var(--radius-sm);
        background: var(--card); font-size: 14px; line-height: 1.45; cursor: pointer; }
      input { width: 22px; height: 22px; margin: 0; flex-shrink: 0; accent-color: var(--ink); }
      a { color: var(--ink); text-decoration: underline; text-underline-offset: 2px; }
    `,
  ],
})
export class TermsCheckboxComponent {
  readonly accepted = model(false);
}
```

- [ ] **Step 6: Zielony**

Run: `npx ng test --watch=false`; `npx ng build`.
Expected: wszystkie testy PASS (dotychczasowe 94 + 8 nowych), build bez błędów.

- [ ] **Step 7: Commit**
```bash
git add src
git commit -m "feat: wersja regulaminu, pamięć zgody, checkbox zgody i teksty skutków usunięcia konta"
```

---

### Task 4: Aplikacja — ekrany Regulaminu i Polityki prywatności

**Files:**
- Create: `src/app/features/legal/legal-page.component.ts`, `src/app/features/legal/terms-page.component.ts`, `src/app/features/legal/privacy-page.component.ts`
- Modify: `src/app/app.routes.ts`, `src/app/app.ts` (`showNav`)

**Interfaces:**
- Consumes: `TERMS_VERSION`, `TERMS_DATE`, `CONTACT_EMAIL` (Task 3).
- Produces: trasy `/regulamin`, `/prywatnosc`.

- [ ] **Step 1: Ramka dokumentu** — `legal-page.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { IconComponent } from '../../shared/components/icon.component';
import { TERMS_DATE, TERMS_VERSION } from '../../shared/legal';

/** Wspólna ramka dokumentów: „Wróć”, tytuł, wersja; treść przez <ng-content>. */
@Component({
  selector: 'app-legal-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="doc">
      <button type="button" class="round-btn round-btn--sm back" aria-label="Wróć" (click)="back()">
        <app-icon name="arrow-left" [size]="20" />
      </button>
      <h1>{{ title() }}</h1>
      <p class="ver">Wersja {{ version }} · obowiązuje od {{ date }}</p>
      <ng-content />
    </article>
  `,
  styles: [
    `
      .doc { max-width: 680px; margin: 0 auto; padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 48px;
        display: flex; flex-direction: column; gap: 10px; }
      .back { align-self: flex-start; }
      h1 { margin: 6px 0 0; font-size: 30px; }
      .ver { align-self: flex-start; margin: 0 0 6px; padding: 4px 12px; border-radius: var(--radius-pill);
        background: var(--pill); color: var(--ink-muted); font-size: 13px; font-weight: 600; }
      :host ::ng-deep h2 { margin: 18px 0 4px; font-size: 18px; }
      :host ::ng-deep p, :host ::ng-deep li { margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: var(--ink); }
      :host ::ng-deep ol, :host ::ng-deep ul { margin: 0; padding-left: 22px; }
      :host ::ng-deep a { color: var(--ink); text-decoration: underline; text-underline-offset: 2px; }
      :host ::ng-deep table { border-collapse: collapse; width: 100%; font-size: 14px; }
      :host ::ng-deep th, :host ::ng-deep td { text-align: left; vertical-align: top; padding: 8px 6px;
        border-top: 1px solid var(--hairline); }
    `,
  ],
})
export class LegalPageComponent {
  private readonly router = inject(Router);
  readonly title = input.required<string>();
  readonly version = TERMS_VERSION;
  readonly date = TERMS_DATE;

  back(): void {
    // Dokument otwarty z checkboxa w nowej karcie nie ma historii — wtedy Ustawienia
    if (history.length > 1) history.back();
    else void this.router.navigateByUrl('/settings');
  }
}
```

- [ ] **Step 2: Regulamin** — `terms-page.component.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LegalPageComponent } from './legal-page.component';
import { CONTACT_EMAIL } from '../../shared/legal';

@Component({
  selector: 'app-terms-page',
  imports: [LegalPageComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page title="Regulamin">
      <p>Regulamin świadczenia usług drogą elektroniczną w serwisie znajdzgroby.pl. Serwis jest bezpłatny — bez opłat, subskrypcji i reklam.</p>

      <h2>1. Usługodawca</h2>
      <p>Usługi świadczy Kacper Kubit (dalej: „Usługodawca”). Kontakt: <a [href]="'mailto:' + contact">{{ contact }}</a>.</p>

      <h2>2. Co oferuje serwis</h2>
      <ol>
        <li><strong>Aplikacja</strong> — zapisywanie grobów bliskich (miejsce, osoby, zdjęcia, terminy opłat) w pamięci Twojego urządzenia, bez konta.</li>
        <li><strong>Mapy rodzinne</strong> — wspólna lista grobów dla osób, które mają link zaproszenia.</li>
        <li><strong>Konto</strong> — te same groby, zdjęcia i mapy rodzinne na każdym urządzeniu, na którym się zalogujesz.</li>
      </ol>
      <p>Umowa o korzystanie z aplikacji zawierana jest z chwilą rozpoczęcia korzystania, a w przypadku konta i mapy rodzinnej — z chwilą zaakceptowania regulaminu. Umowa jest zawierana na czas nieokreślony.</p>

      <h2>3. Wymagania techniczne</h2>
      <ul>
        <li>urządzenie z aktualną przeglądarką (Chrome, Safari, Firefox lub Edge) z włączoną obsługą JavaScript i pamięci strony,</li>
        <li>dostęp do internetu — do pierwszego uruchomienia, map rodzinnych i konta,</li>
        <li>adres e-mail — do założenia konta.</li>
      </ul>

      <h2>4. Konto</h2>
      <ol>
        <li>Konto może założyć osoba pełnoletnia. Do założenia konta potrzebny jest adres e-mail potwierdzony kodem wysłanym w wiadomości.</li>
        <li>Hasło trzymaj w tajemnicy. Jeśli ktoś mógł je poznać — ustaw nowe przez „Nie pamiętam hasła”.</li>
        <li>Konto usuniesz w każdej chwili w Ustawieniach („Usuń konto”) albo pisząc na {{ contact }}. Usunięcie kasuje konto i mapę „Moje” razem z grobami i zdjęciami; z map rodzinnych wychodzisz — dodane przez Ciebie groby zostają dla rodziny, rola założyciela przechodzi na osobę, która jest w mapie najdłużej, a mapa, w której nie ma już nikogo poza Tobą, jest usuwana.</li>
      </ol>

      <h2>5. Mapy rodzinne</h2>
      <ol>
        <li>Z mapy rodzinnej mogą korzystać osoby pełnoletnie.</li>
        <li>Link zaproszenia działa jak klucz: każdy, kto go ma, może dołączyć i zobaczyć groby. Udostępniaj go tylko zaufanym osobom. Założyciel mapy może zmienić link i usuwać osoby z mapy.</li>
        <li>Członkowie mapy widzą jej groby, zdjęcia, swoje podpisy (imię i kolor) oraz to, kto ostatnio zmieniał grób.</li>
      </ol>

      <h2>6. Treści dodawane przez użytkowników</h2>
      <ol>
        <li>Odpowiadasz za opisy i zdjęcia, które dodajesz. Nie dodawaj treści bezprawnych, obraźliwych ani naruszających prawa innych osób — w szczególności wizerunku i danych żyjących osób bez ich zgody.</li>
        <li>Treści bezprawne można zgłosić na {{ contact }}, podając link lub opis miejsca w serwisie i uzasadnienie. Usługodawca może usunąć treść bezprawną i poinformuje o tym osobę, która ją dodała.</li>
      </ol>

      <h2>7. Odpowiedzialność</h2>
      <ol>
        <li>Serwis jest udostępniany bezpłatnie, w stanie „takim, jaki jest”. Usługodawca dba o jego działanie, ale nie gwarantuje działania bez przerw i błędów.</li>
        <li>Serwis korzysta z darmowej infrastruktury z dziennymi limitami (np. liczby wysyłanych zdjęć) — po ich wyczerpaniu część funkcji wraca następnego dnia. Ważne zdjęcia zachowaj także w galerii telefonu.</li>
        <li>Postanowienia tego punktu nie ograniczają praw konsumenta wynikających z bezwzględnie obowiązujących przepisów.</li>
      </ol>

      <h2>8. Reklamacje</h2>
      <p>Reklamacje i zgłoszenia błędów wysyłaj na {{ contact }}. Opisz, czego dotyczy zgłoszenie i jak się z Tobą skontaktować. Odpowiedź otrzymasz w ciągu 14 dni.</p>

      <h2>9. Zakończenie korzystania</h2>
      <ol>
        <li>Możesz przestać korzystać z serwisu w każdej chwili i usunąć konto.</li>
        <li>Jeśli serwis miałby zostać zamknięty, Usługodawca poinformuje o tym w aplikacji co najmniej 30 dni wcześniej.</li>
      </ol>

      <h2>10. Dane osobowe</h2>
      <p>Zasady przetwarzania danych opisuje <a routerLink="/prywatnosc">Polityka prywatności</a>.</p>

      <h2>11. Zmiany regulaminu i prawo właściwe</h2>
      <ol>
        <li>Nowa wersja regulaminu ma nowy numer i datę. O zmianach poinformujemy w aplikacji; nowa wersja wiąże od chwili jej zaakceptowania.</li>
        <li>Regulamin podlega prawu polskiemu. Nie wyłącza to ochrony, jaką konsumentowi dają przepisy kraju jego zwykłego pobytu.</li>
      </ol>
    </app-legal-page>
  `,
})
export class TermsPageComponent {
  readonly contact = CONTACT_EMAIL;
}
```

- [ ] **Step 3: Polityka prywatności** — `privacy-page.component.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LegalPageComponent } from './legal-page.component';
import { CONTACT_EMAIL } from '../../shared/legal';

@Component({
  selector: 'app-privacy-page',
  imports: [LegalPageComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page title="Polityka prywatności">
      <h2>1. Administrator danych</h2>
      <p>Administratorem Twoich danych osobowych jest Kacper Kubit. W sprawach danych pisz na <a [href]="'mailto:' + contact">{{ contact }}</a>.</p>

      <h2>2. Jakie dane i kiedy</h2>
      <p><strong>Aplikacja bez konta i bez mapy rodzinnej.</strong> Groby, zdjęcia i ustawienia zostają w pamięci Twojego urządzenia — nie wysyłamy ich na serwer. Przy wejściu na stronę i wyświetlaniu mapy Twój adres IP widzą technicznie serwer strony i dostawcy kafelków mapy (punkt 4).</p>
      <p><strong>Mapa rodzinna.</strong> Na serwerze zapisujemy: Twój podpis w mapie (imię i kolor), groby mapy (lokalizacja GPS, cmentarz, dane osób pochowanych, opisy, terminy opłat), zdjęcia, informację, kto ostatnio zmieniał grób, oraz wersję, datę i godzinę zaakceptowania regulaminu.</p>
      <p><strong>Konto.</strong> Dodatkowo: adres e-mail, hasło w postaci skrótu (nie znamy Twojego hasła), sesje zalogowanych urządzeń, skrót adresu IP przy prośbie o kod z maila (ochrona przed nadużyciami) oraz datę i wersję zaakceptowanego regulaminu.</p>
      <p>Dane osób zmarłych nie są danymi osobowymi w rozumieniu RODO, ale opisy i zdjęcia mogą dotyczyć żyjących osób — dodawaj je z rozwagą.</p>

      <h2>3. Cele i podstawy prawne</h2>
      <ul>
        <li>świadczenie usługi — prowadzenie konta, map rodzinnych i synchronizacji (art. 6 ust. 1 lit. b RODO),</li>
        <li>bezpieczeństwo — limity prób logowania i próśb o kod, skrót adresu IP, dzienniki serwera (art. 6 ust. 1 lit. f RODO; uzasadniony interes to ochrona kont i serwisu przed nadużyciami),</li>
        <li>obsługa zgłoszeń wysłanych na adres kontaktowy (art. 6 ust. 1 lit. f RODO).</li>
      </ul>
      <p>Podanie danych jest dobrowolne. Bez adresu e-mail nie założysz konta, a bez podpisu nie dołączysz do mapy rodzinnej — z aplikacji w telefonie możesz korzystać bez nich.</p>

      <h2>4. Komu przekazujemy dane</h2>
      <ul>
        <li>członkom tej samej mapy rodzinnej — widzą jej groby, zdjęcia i podpisy osób,</li>
        <li>Cloudflare, Inc. — serwer aplikacji, baza danych i zdjęcia,</li>
        <li>Hostinger — serwer strony znajdzgroby.pl,</li>
        <li>Resend — wysyłka wiadomości z kodem (tylko adres e-mail i treść wiadomości),</li>
        <li>OpenStreetMap Foundation i Esri — kafelki mapy (adres IP przy pobieraniu kafelków).</li>
      </ul>
      <p>Cloudflare, Resend i Esri to firmy z USA. Dane mogą być przekazywane poza Europejski Obszar Gospodarczy na podstawie standardowych klauzul umownych zatwierdzonych przez Komisję Europejską lub programu EU-U.S. Data Privacy Framework. OpenStreetMap Foundation działa w Wielkiej Brytanii, dla której Komisja wydała decyzję stwierdzającą odpowiedni stopień ochrony.</p>

      <h2>5. Jak długo przechowujemy dane</h2>
      <table>
        <tr><th>Dane</th><th>Okres</th></tr>
        <tr><td>konto, e-mail, skrót hasła, wersja oraz data i godzina zgody</td><td>do usunięcia konta</td></tr>
        <tr><td>sesje urządzeń</td><td>do wylogowania albo 365 dni bez korzystania z aplikacji</td></tr>
        <tr><td>kody z maila i skrót adresu IP</td><td>24 godziny</td></tr>
        <tr><td>dane w mapie rodzinnej</td><td>do usunięcia grobu, mapy albo konta; po usunięciu konta Twój podpis w mapach zastępujemy napisem „Usunięte konto”</td></tr>
        <tr><td>zdjęcia usuniętych map</td><td>do 3 dni po usunięciu</td></tr>
        <tr><td>dzienniki serwera aplikacji</td><td>do 3 dni</td></tr>
        <tr><td>wiadomości wysłane na adres kontaktowy</td><td>do zakończenia sprawy, najdłużej rok</td></tr>
      </table>

      <h2>6. Twoje prawa</h2>
      <p>Masz prawo do dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie. Konto usuniesz sam w Ustawieniach („Usuń konto”); w pozostałych sprawach napisz na {{ contact }}. Masz też prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>

      <h2>7. Pamięć urządzenia, cookies, analityka</h2>
      <p>Aplikacja zapisuje dane w pamięci Twojej przeglądarki (IndexedDB, localStorage) — groby, ustawienia, sesję konta i informację o zaakceptowanym regulaminie. To niezbędne do działania aplikacji. Nie używamy cookies śledzących, narzędzi analitycznych ani reklam i nie profilujemy użytkowników.</p>

      <h2>8. Zmiany polityki</h2>
      <p>Każda zmiana polityki ma nowy numer wersji i datę. Zobacz też <a routerLink="/regulamin">Regulamin</a>.</p>
    </app-legal-page>
  `,
})
export class PrivacyPageComponent {
  readonly contact = CONTACT_EMAIL;
}
```

- [ ] **Step 4: Trasy i nawigacja** — w `app.routes.ts` przed `'**'`:
```ts
  {
    path: 'regulamin',
    loadComponent: () =>
      import('./features/legal/terms-page.component').then((m) => m.TermsPageComponent),
  },
  {
    path: 'prywatnosc',
    loadComponent: () =>
      import('./features/legal/privacy-page.component').then((m) => m.PrivacyPageComponent),
  },
```
W `app.ts` w `showNav` dopisz `p.startsWith('/regulamin') ||` i `p.startsWith('/prywatnosc') ||`.

- [ ] **Step 5: Build i sprawdzenie** — `npx ng build`; w przeglądarce (izolowany kontekst, `gravemap-onboarded` niezaznaczone) wejście na `/regulamin` i `/prywatnosc` pokazuje dokument bez dolnej nawigacji i bez przekierowania na `/welcome`; „Wróć” w nowej karcie prowadzi do `/settings`.
Expected: build OK, oba dokumenty widoczne.

- [ ] **Step 6: Commit**
```bash
git add src
git commit -m "feat: ekrany Regulaminu i Polityki prywatności"
```

---

### Task 5: Aplikacja — stały dostęp: Ustawienia, powitanie, logowanie

**Files:**
- Modify: `src/app/features/settings/settings-page.component.html`, `.ts`, `.scss`; `src/app/features/welcome/welcome-page.component.ts`; `src/app/features/account/login-page.component.ts`

**Interfaces:**
- Consumes: `CONTACT_EMAIL`, `TERMS_VERSION`, `TERMS_DATE` (Task 3); trasy z Task 4.

- [ ] **Step 1: Ustawienia — „Informacje”** przed `@if (version()) {` w `settings-page.component.html`:
```html
  <section class="group">
    <h2>Informacje</h2>
    <div class="card">
      <a class="row" routerLink="/regulamin">
        <span class="row__icon"><app-icon name="edit" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Regulamin</span>
          <span class="row__sub">Wersja {{ termsVersion }} z {{ termsDate }}</span>
        </span>
        <app-icon class="row__chevron" name="chevron-right" [size]="18" />
      </a>
      <a class="row" routerLink="/prywatnosc">
        <span class="row__icon"><app-icon name="key" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Polityka prywatności</span>
          <span class="row__sub">Jakie dane zbieramy i dlaczego</span>
        </span>
        <app-icon class="row__chevron" name="chevron-right" [size]="18" />
      </a>
      <a class="row" [href]="'mailto:' + contact">
        <span class="row__icon"><app-icon name="share" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title">Kontakt</span>
          <span class="row__sub">{{ contact }}</span>
        </span>
      </a>
    </div>
  </section>
```
W `settings-page.component.ts`: `import { CONTACT_EMAIL, TERMS_DATE, TERMS_VERSION } from '../../shared/legal';` i pola `readonly contact = CONTACT_EMAIL; readonly termsVersion = TERMS_VERSION; readonly termsDate = TERMS_DATE;`. (Ikony `edit`, `key`, `share` istnieją w `icon.component.ts`.)

- [ ] **Step 2: Powitanie** — w `welcome-page.component.ts` pod przyciskiem „Mam już konto — zaloguj się”:
```html
        <p class="legal">
          <a routerLink="/regulamin">Regulamin</a> · <a routerLink="/prywatnosc">Polityka prywatności</a>
        </p>
```
`imports: [IconComponent, RouterLink]` (import `RouterLink` z `@angular/router`), styl:
```css
      .legal { margin: 4px 0 0; text-align: center; font-size: 13px; opacity: 0.8; }
      .legal a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
```

- [ ] **Step 3: Logowanie** — w `login-page.component.ts`, w `@case ('login')` po przycisku „Nie mam konta — załóż”:
```html
          <p class="legal">
            <a routerLink="/regulamin">Regulamin</a> · <a routerLink="/prywatnosc">Polityka prywatności</a>
          </p>
```
styl `.legal { margin: 12px 0 0; font-size: 13px; color: var(--ink-faint); } .legal a { color: var(--ink-muted); }`.

- [ ] **Step 4: Build, testy, podgląd** — `npx ng build`; `npx ng test --watch=false`; w przeglądarce: Ustawienia → „Regulamin” otwiera dokument, „Wróć” wraca do Ustawień; linki na powitaniu i przy logowaniu działają.
Expected: build OK, testy PASS, linki działają.

- [ ] **Step 5: Commit**
```bash
git add src
git commit -m "feat: dokumenty w Ustawieniach, na powitaniu i przy logowaniu"
```

---

### Task 6: Aplikacja — zgoda przy zakładaniu konta i przy mapach rodzinnych

**Files:**
- Modify: `src/app/core/services/family-api.ts`, `src/app/core/services/account.service.ts`, `src/app/features/account/login-page.component.ts`, `src/app/shared/components/profile-form.component.ts`, `src/app/features/family/create-space-page.component.ts`, `src/app/features/family/join-family-page.component.ts`

**Interfaces:**
- Consumes: `TERMS_VERSION`, `acceptedTermsVersion`, `needsTermsAcceptance`, `markTermsAccepted`, `TermsCheckboxComponent` (Task 3); `exists` i `acceptTerms` z API (Task 1).
- Produces: `AuthResult.user.termsVersion?: number | null`; `FamilyApi.authVerify(...)` → `{ setupToken, email, exists }`; `FamilyApi.authPassword(setupToken, password, acceptTerms?: number)`; `AccountService.verify(...)` → `{ setupToken, email, exists }`; `AccountService.setPassword(setupToken, password, acceptTerms?: number)`; `ProfileFormComponent.requireTerms` (input, domyślnie `false`).

- [ ] **Step 1: Klient API**
  - `authVerify` — typ wyniku `Promise<{ setupToken: string; email: string; exists: boolean }>`.
  - `authPassword(setupToken: string, password: string, acceptTerms?: number)` → ciało `{ setupToken, password, ...(acceptTerms ? { acceptTerms } : {}) }`.
  - `createSpace(name, member)` → ciało `{ name, member, ...termsField() }`; `join(invite, profile, session?)` → ciało `{ ...profile, ...termsField() }`, gdzie w pliku:
```ts
/** Wersja regulaminu zaakceptowana na tym urządzeniu — serwer zapisuje ją przy członku mapy. */
function termsField(): { acceptTerms?: number } {
  const v = acceptedTermsVersion();
  return v > 0 ? { acceptTerms: v } : {};
}
```
  (import `acceptedTermsVersion` z `../../shared/legal`).

- [ ] **Step 2: AccountService** — w `family-api.ts` typ `AuthResult.user` dostaje `termsVersion?: number | null`. Zgoda zapisana na koncie oznacza zgodę na każdym urządzeniu, na którym się zalogujesz — w `login()` i `setPassword()` po odpowiedzi serwera:
```ts
    if ((res.user.termsVersion ?? 0) >= TERMS_VERSION) markTermsAccepted();
```
(import `TERMS_VERSION`, `markTermsAccepted` z `../../shared/legal`). Sygnatury `verify(...)` → `Promise<{ setupToken: string; email: string; exists: boolean }>` i:
```ts
  async setPassword(setupToken: string, password: string, acceptTerms?: number): Promise<{ movedGraves: number }> {
    const res = await this.api.authPassword(setupToken, password, acceptTerms);
    if (acceptTerms) markTermsAccepted();
    this.save({ token: res.session, email: res.user.email });
    return this.link();
  }
```

- [ ] **Step 3: Ekran logowania**
  - import `TermsCheckboxComponent` (do `imports`), `TERMS_VERSION`.
  - sygnały `readonly accountExists = signal(false); readonly termsAccepted = signal(false);`
  - w `checkCode()` i `consumeLink()` po `this.setupToken = res.setupToken;` dopisz `this.accountExists.set(res.exists);`
  - w `@case ('password')` przed przyciskiem „Zapisz hasło”:
```html
            @if (!accountExists()) {
              <app-terms-checkbox [(accepted)]="termsAccepted" />
            }
```
  - przycisk: `[disabled]="busy() || (!accountExists() && !termsAccepted())"`
  - `savePassword()`: wywołanie `this.account.setPassword(this.setupToken, this.password(), this.accountExists() ? undefined : TERMS_VERSION)`; dodatkowo na początku: `if (!this.accountExists() && !this.termsAccepted()) { this.error.set('Zaakceptuj regulamin, żeby założyć konto'); return; }`.
  - nagłówek kroku: `{{ accountExists() ? 'Nowe hasło' : 'Ustaw hasło' }}`.

- [ ] **Step 4: Formularz profilu**
```ts
  /** Mapa rodzinna wysyła dane na serwer — checkbox zgody, jeśli ta wersja nie była zaakceptowana tutaj. */
  readonly requireTerms = input(false);
  readonly showTerms = computed(() => this.requireTerms() && needsTermsAcceptance());
  readonly termsAccepted = signal(false);
```
  `valid` → `return chars > 0 && chars <= 40 && (!this.showTerms() || this.termsAccepted());`
  `submit()` — przed `emit`: `if (this.showTerms()) markTermsAccepted();`
  szablon — przed `<button type="submit"`:
```html
      @if (showTerms()) {
      <app-terms-checkbox [(accepted)]="termsAccepted" />
      }
```
  (imports: `TermsCheckboxComponent`; `needsTermsAcceptance`, `markTermsAccepted` z `../legal`).

- [ ] **Step 5: Mapy** — w `create-space-page.component.ts` i `join-family-page.component.ts` dodaj `[requireTerms]="true"` do `<app-profile-form …>`.

- [ ] **Step 6: Build, testy** — `npx ng build`; `npx ng test --watch=false`.
Expected: PASS.

- [ ] **Step 7: E2E (lokalnie, izolowane konteksty)**
  1. `/logowanie` → „Nie mam konta — załóż” → kod z odpowiedzi `POST /auth/request` (`dev.code`) → krok hasła: checkbox widoczny, „Zapisz hasło” nieaktywny; zaznaczenie → aktywny → „Gotowe”; `localStorage['znajdzgroby-terms'] === '1'`.
  2. Ten sam e-mail w nowym kontekście: „Nie pamiętam hasła” → link z `dev.link` → krok „Nowe hasło” bez checkboxa → „Gotowe”.
  2b. Kolejny nowy kontekst: logowanie tym kontem (hasłem) → `localStorage['znajdzgroby-terms'] === '1'` → `/rodzina#<invite>` bez checkboxa.
  3. Nowy kontekst: `/mapy/nowa` → checkbox widoczny, „Utwórz mapę” nieaktywne do zaznaczenia; po utworzeniu `/rodzina#<invite>` w **tym samym** kontekście (drugie dołączenie) — checkbox ukryty.
  4. Kontekst bez zgody: `/rodzina#<invite>` → wpisane imię, klik w „Regulamin” z checkboxa otwiera nową kartę `/regulamin`; w pierwotnej karcie imię zostaje wpisane (Review Focus 5).
Expected: wszystkie kroki zgodne.

- [ ] **Step 8: Commit**
```bash
git add src
git commit -m "feat: zgoda na regulamin przy zakładaniu konta i przy mapach rodzinnych"
```

---

### Task 7: Aplikacja — „Usuń konto”

**Files:**
- Create: `src/app/features/settings/delete-account-dialog.component.ts`
- Modify: `src/app/core/services/family-api.ts`, `src/app/core/services/account.service.ts`, `src/app/features/settings/settings-page.component.html`, `.ts`

**Interfaces:**
- Consumes: `DeletionPreview`, `personalDeletionText`, `familyDeletionText` (Task 3); `GET /account/deletion`, `POST /account/delete` (Task 2).
- Produces: `FamilyApi.accountDeletionPreview(session: string): Promise<DeletionPreview>`, `FamilyApi.deleteAccount(session: string, password: string): Promise<unknown>`, `AccountService.deletionPreview(): Promise<DeletionPreview>`, `AccountService.deleteAccount(password: string): Promise<void>`, `<app-delete-account-dialog (deleted)>` z metodą `open()`.

- [ ] **Step 1: Klient API**
```ts
  accountDeletionPreview(session: string): Promise<DeletionPreview> {
    return this.request('GET', '/account/deletion', session);
  }

  deleteAccount(session: string, password: string): Promise<unknown> {
    return this.request('POST', '/account/delete', session, { password });
  }
```
(import `DeletionPreview` z `../../shared/utils/account-rules`).

- [ ] **Step 2: AccountService** — wydziel czyszczenie map z `logout()` i dodaj:
```ts
  async logout(): Promise<void> {
    const session = this.session();
    if (session) await this.api.authLogout(session.token).catch(() => {});
    await this.forgetAccountSpaces();
    this.dropSession();
  }

  /** Podgląd skutków usunięcia konta. 401 = sesja wygasła: czyścimy ją jak przy link(). */
  async deletionPreview(): Promise<DeletionPreview> {
    try {
      return await this.api.accountDeletionPreview(this.requireSession());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) this.dropSession();
      throw err;
    }
  }

  /** Usuwa konto na serwerze, potem z tej przeglądarki znikają mapy konta (jak przy wylogowaniu). */
  async deleteAccount(password: string): Promise<void> {
    await this.api.deleteAccount(this.requireSession(), password);
    await this.forgetAccountSpaces();
    this.dropSession();
  }

  private async forgetAccountSpaces(): Promise<void> {
    for (const id of spacesToForgetOnLogout(this.spaces.spaces())) await this.spaces.forget(id, false);
  }

  private requireSession(): string {
    const token = this.session()?.token;
    if (!token) throw new ApiError(401, 'Sesja wygasła — zaloguj się ponownie');
    return token;
  }
```

- [ ] **Step 3: Okno** — `delete-account-dialog.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';

import { AccountService } from '../../core/services/account.service';
import { ApiError } from '../../core/services/family-api';
import {
  DeletionPreview,
  familyDeletionText,
  personalDeletionText,
} from '../../shared/utils/account-rules';

/** „Usuń konto”: podsumowanie skutków z serwera, potwierdzenie hasłem. */
@Component({
  selector: 'app-delete-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #sheet class="sheet" aria-label="Usuń konto" (close)="reset()" (click)="onDialogClick($event)">
      <div class="sheet__inner">
        <h2>Usunąć konto?</h2>
        @if (preview(); as p) {
          <p class="lead">Tego nie da się cofnąć. Co się stanie:</p>
          <ul class="effects">
            <li>{{ personalText(p) }}</li>
            @for (f of p.families; track f.spaceId) {
              <li>{{ familyText(f) }}</li>
            }
          </ul>
          <form (submit)="$event.preventDefault(); confirm()">
            <label class="field">
              <span>Hasło</span>
              <input type="password" autocomplete="current-password" [value]="password()"
                (input)="password.set($any($event.target).value)" />
            </label>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button type="submit" class="danger" [disabled]="busy() || !password()">
              {{ busy() ? 'Usuwam…' : 'Usuń konto na zawsze' }}
            </button>
          </form>
        } @else if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        } @else {
          <p class="lead">Sprawdzam, co zostanie usunięte…</p>
        }
        <button type="button" class="pill-btn pill-btn--light" (click)="close()">Anuluj</button>
      </div>
    </dialog>
  `,
  styles: [
    `
      :host { display: contents; }
      .sheet { width: 100%; max-width: 560px; max-height: 90vh; margin: auto auto 0; padding: 0; border: none;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0; background: var(--stone); color: var(--ink);
        box-shadow: var(--shadow-float); }
      .sheet::backdrop { background: rgba(0, 0, 0, 0.35); }
      .sheet__inner { padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px)); display: flex;
        flex-direction: column; gap: 12px; }
      h2 { margin: 0; font-size: 22px; }
      .lead { margin: 0; color: var(--ink-muted); }
      .effects { margin: 0; padding: 6px 16px 6px 34px; border-radius: var(--radius-md); background: var(--card); }
      .effects li { padding: 8px 0; font-size: 14px; line-height: 1.45; }
      form { display: flex; flex-direction: column; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink-muted); }
      input { height: 48px; padding: 0 14px; border: 1px solid var(--hairline); border-radius: var(--radius-sm);
        background: var(--card); color: var(--ink); font: inherit; font-size: 16px; font-weight: 400; }
      .error { margin: 0; color: var(--danger); font-size: 14px; }
      .danger { height: 56px; border: none; border-radius: var(--radius-pill); background: var(--danger);
        color: #fff; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; }
      .danger:disabled { opacity: 0.5; cursor: default; }
    `,
  ],
})
export class DeleteAccountDialogComponent {
  private readonly account = inject(AccountService);
  private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
  readonly deleted = output<void>();

  readonly preview = signal<DeletionPreview | null>(null);
  readonly password = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly personalText = personalDeletionText;
  readonly familyText = familyDeletionText;

  async open(): Promise<void> {
    this.sheet().nativeElement.showModal();
    try {
      this.preview.set(await this.account.deletionPreview());
    } catch (err) {
      this.error.set(this.message(err));
    }
  }

  async confirm(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.deleteAccount(this.password());
      this.close();
      this.deleted.emit();
    } catch (err) {
      this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
    }
  }

  close(): void {
    this.sheet().nativeElement.close();
  }

  reset(): void {
    this.preview.set(null);
    this.password.set('');
    this.error.set(null);
  }

  onDialogClick(event: MouseEvent): void {
    if (event.target === this.sheet().nativeElement) this.close();
  }

  private message(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 401) return err.message === 'Hasło jest nieprawidłowe' ? err.message : 'Sesja wygasła — zaloguj się ponownie';
      return err.message;
    }
    return 'Bez internetu nie da się usunąć konta. Spróbuj, gdy wróci zasięg.';
  }
}
```

- [ ] **Step 4: Ustawienia** — w sekcji „Konto”, wewnątrz `@if (account.session(); as s) {` po przycisku „Wyloguj”:
```html
      <button type="button" class="row" (click)="deleteDialog.open()">
        <span class="row__icon row__icon--danger"><app-icon name="trash" [size]="20" /></span>
        <span class="row__text">
          <span class="row__title row__title--danger">Usuń konto</span>
          <span class="row__sub">Usuwa konto, „Moje” i Twoje miejsce w mapach rodzinnych</span>
        </span>
        <app-icon class="row__chevron" name="chevron-right" [size]="18" />
      </button>
```
Na końcu sekcji „Konto” (po `</div>` karty): 
```html
    <app-delete-account-dialog #deleteDialog (deleted)="accountNotice.set('Konto zostało usunięte')" />
    @if (accountNotice(); as note) {
    <p class="notice" role="status">{{ note }}</p>
    }
```
W `.ts`: import i `imports: [..., DeleteAccountDialogComponent]`, `readonly accountNotice = signal<string | null>(null);`. W `.scss`: `.row__icon--danger { background: var(--danger-tint); color: var(--danger); } .row__title--danger { color: var(--danger); } .notice { margin: 8px 4px 0; font-size: 14px; color: var(--ok); }`.

- [ ] **Step 5: Build, testy** — `npx ng build`; `npx ng test --watch=false`.
Expected: PASS.

- [ ] **Step 6: E2E (lokalnie)**
  1. Konto z grobem w „Moje” + mapa rodzinna z drugą osobą (założyciel = konto) → Ustawienia → „Usuń konto”: okno z „„Moje” — 1 grób i 0 zdjęć zostanie usuniętych” i linijką o przekazaniu roli.
  2. Złe hasło → „Hasło jest nieprawidłowe”, okno zostaje.
  3. Offline (`context.setOffline(true)`) → „Bez internetu nie da się usunąć konta…”, konto i dane w IndexedDB nietknięte (Review Focus 4).
  4. Online, dobre hasło → okno znika, „Konto zostało usunięte”, sekcja „Konto” pokazuje „Zaloguj się”, w IndexedDB tylko `local`.
  5. Wygasła sesja (usunięta przez `sqlRun` lokalnie) → otwarcie okna → „Sesja wygasła — zaloguj się ponownie” i Ustawienia pokazują „Zaloguj się”.
Expected: zgodnie z opisem.

- [ ] **Step 7: Commit**
```bash
git add src
git commit -m "feat: usuwanie konta w Ustawieniach z podsumowaniem i potwierdzeniem hasłem"
```

---

### Task 8: Czcionka Onest z własnego serwera

**Files:**
- Create: `public/fonts/onest-latin-wght-normal.woff2`, `public/fonts/onest-latin-ext-wght-normal.woff2`, `public/fonts/OFL.txt`
- Modify: `src/index.html`, `src/styles.scss`, `ngsw-config.json`

- [ ] **Step 1: Pliki** — w katalogu tymczasowym (scratchpad): `npm pack @fontsource-variable/onest`, rozpakuj `tar -xzf fontsource-variable-onest-*.tgz`, skopiuj `package/files/onest-latin-wght-normal.woff2`, `package/files/onest-latin-ext-wght-normal.woff2` do `public/fonts/`, a `package/LICENSE` jako `public/fonts/OFL.txt`.

- [ ] **Step 2: CSS** — na początku `src/styles.scss` (przed `:root`):
```scss
// Onest z własnego serwera (bez Google Fonts — adres IP odwiedzających nie trafia do Google). Licencja: fonts/OFL.txt
@font-face {
  font-family: 'Onest';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('/fonts/onest-latin-ext-wght-normal.woff2') format('woff2-variations');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329,
    U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Onest';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('/fonts/onest-latin-wght-normal.woff2') format('woff2-variations');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

- [ ] **Step 3: index.html i service worker** — usuń z `src/index.html` dwa `<link rel="preconnect">` i `<link … fonts.googleapis.com/css2…>`. W `ngsw-config.json`: w grupie `assets` dopisz `"/fonts/**"` do `files`; usuń cały `dataGroup` `google-fonts`.

- [ ] **Step 4: Sprawdzenie** — `npx ng build`; w przeglądarce (lokalnie) `read_network_requests` bez żadnego zapytania do `fonts.googleapis.com` / `fonts.gstatic.com`, `getComputedStyle(document.body).fontFamily` zaczyna się od `Onest`, a `document.fonts.check('600 16px Onest', 'ąęłńśźż')` → `true`; zrzut Startu wygląda jak przed zmianą.
Expected: zero zapytań do Google, polskie znaki w Onest.

- [ ] **Step 5: Commit**
```bash
git add public/fonts src/index.html src/styles.scss ngsw-config.json
git commit -m "feat: czcionka Onest z własnego serwera zamiast Google Fonts"
```

---

### Task 9: Weryfikacja całości, build produkcyjny, PR

- [ ] **Step 1: Data wersji** — ustaw `TERMS_DATE` w `src/app/shared/legal.ts` na dzień otwarcia PR (format `D.MM.RRRR`).
- [ ] **Step 2: Komplet testów** — `npm run smoke` (worker), `npx ng test --watch=false`, `npx ng build` (0 ostrzeżeń, `grep -l "localhost:8791" dist/grave-app-front/browser/*.js` → brak).
- [ ] **Step 3: Przegląd makiety vs aplikacja** — zrzuty lokalne: Ustawienia (Konto + Informacje), okno usuwania, krok hasła z checkboxem, dołączanie z checkboxem, Regulamin; porównanie z `docs/makiety/dokumenty-prawne.html` (bez przerywanych ramek — to tylko oznaczenia w makiecie).
- [ ] **Step 4: PR (bez merge'a)** — `git push -u origin feat/dokumenty-prawne`; `gh pr create --repo kacperk72/grave-app --base main --head feat/dokumenty-prawne`, opis: co dochodzi (dokumenty, zgoda, usuwanie konta, czcionka, sprzątanie, migracja 0007), że treść dokumentów to projekt do przeczytania (najlepiej z prawnikiem), przed wdrożeniem przekierowanie `kontakt@znajdzgroby.pl` w hPanelu, jak sprawdzone; zakończ `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
