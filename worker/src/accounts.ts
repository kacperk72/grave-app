import type { Env } from './index';
import { HttpError, json, readJson } from './http';
import { currentDay, newToken, sha256 } from './util';
import { sendLoginMail } from './mail';
import { TERMS_VERSION, parseTermsVersion } from './legal';
import { insertMember } from './members';
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
// Prośby o kod z jednego adresu IP (różne e-maile) i maile na dobę dla całej aplikacji —
// darmowy Resend wysyła 100 maili na dobę, zostawiamy zapas.
const MAX_CODE_REQUESTS_PER_IP_HOUR = 10;
const MAX_MAILS_PER_DAY = 90;
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

  const ip = request.headers.get('CF-Connecting-IP');
  const ipHash = ip ? await sha256(ip) : null;
  if (ipHash) {
    const fromIp = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_codes WHERE ip_hash = ? AND created_at > ?')
      .bind(ipHash, now - 60 * MINUTE)
      .first<{ n: number }>();
    if ((fromIp?.n ?? 0) >= MAX_CODE_REQUESTS_PER_IP_HOUR) {
      throw new HttpError(429, 'Za dużo próśb o kod. Spróbuj ponownie za godzinę.');
    }
  }
  // Licznik dnia podbijany atomowo — równoległe prośby nie przeskoczą limitu
  const slot = await env.DB.prepare(
    `INSERT INTO usage_daily (day, mails) VALUES (?1, 1)
     ON CONFLICT(day) DO UPDATE SET mails = mails + 1 WHERE mails < ?2
     RETURNING mails`
  )
    .bind(currentDay(), MAX_MAILS_PER_DAY)
    .first<{ mails: number }>();
  if (!slot) {
    throw new HttpError(503, 'Dziś wysłaliśmy już wszystkie maile z kodem. Spróbuj jutro albo zaloguj się hasłem.');
  }

  const id = crypto.randomUUID();
  const code = sixDigits();
  const link = newToken();
  await env.DB.prepare(
    `INSERT INTO login_codes (id, email, code_hash, link_hash, created_at, expires_at, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, email, await sha256(code), await sha256(link), now, now + CODE_TTL_MS, ipHash)
    .run();
  let dev;
  try {
    dev = await sendLoginMail(env, { email, code, link: `${env.APP_URL}/logowanie#${link}` });
  } catch (err) {
    // Mail nie wyszedł: kod nie liczy się do limitu adresu
    await env.DB.prepare('DELETE FROM login_codes WHERE id = ?').bind(id).run();
    throw err;
  }
  return json({ ok: true, ...(dev ? { dev } : {}) }, 202);
}

type CodeRow = {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: number;
  used_at: number | null;
};

export async function verifyCode(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as { email?: unknown; code?: unknown; link?: unknown } | null;
  const now = Date.now();
  const usable = (r: CodeRow | null): r is CodeRow =>
    !!r && r.used_at === null && r.expires_at > now && r.attempts < MAX_CODE_ATTEMPTS;

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
    if (!usable(row)) throw new HttpError(401, BAD_CODE);
    // Próba rezerwowana atomowo PRZED porównaniem — równoległe zgadywanie nie obejdzie limitu 5 prób
    const reserved = await env.DB.prepare(
      `UPDATE login_codes SET attempts = attempts + 1
        WHERE id = ? AND attempts < ? AND used_at IS NULL AND expires_at > ? RETURNING id`
    )
      .bind(row.id, MAX_CODE_ATTEMPTS, now)
      .first<{ id: string }>();
    if (!reserved || (await sha256(body.code.trim())) !== row.code_hash) throw new HttpError(401, BAD_CODE);
  }
  if (!usable(row)) throw new HttpError(401, BAD_CODE);

  const setupToken = newToken();
  // `used_at IS NULL` w warunku: ten sam kod (albo link) użyty dwa razy naraz daje tylko jeden setupToken
  const used = await env.DB.prepare(
    'UPDATE login_codes SET used_at = ?, setup_hash = ?, setup_expires_at = ? WHERE id = ? AND used_at IS NULL'
  )
    .bind(now, await sha256(setupToken), now + SETUP_TTL_MS, row.id)
    .run();
  if (!used.meta.changes) throw new HttpError(401, BAD_CODE);
  // Tylko właściciel skrzynki zna kod — może się dowiedzieć, czy konto już jest (nowe hasło vs zakładanie)
  const exists = await env.DB.prepare('SELECT 1 AS yes FROM users WHERE email = ?').bind(row.email).first();
  return json({ setupToken, email: row.email, exists: exists !== null });
}

export async function setPassword(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as { setupToken?: unknown; password?: unknown; acceptTerms?: unknown } | null;
  const password = checkPassword(body?.password);
  const now = Date.now();
  const setupHash = typeof body?.setupToken === 'string' ? await sha256(body.setupToken) : '';
  const code = await env.DB.prepare(
    'SELECT id, email FROM login_codes WHERE setup_hash = ? AND setup_expires_at > ?'
  )
    .bind(setupHash, now)
    .first<{ id: string; email: string }>();
  if (!code) throw new HttpError(401, 'Czas na ustawienie hasła minął — poproś o nowy kod');

  const existing = await env.DB.prepare('SELECT id, terms_version FROM users WHERE email = ?')
    .bind(code.email)
    .first<{ id: string; terms_version: number | null }>();
  // Zakładanie konta wymaga zgody na bieżący regulamin; nowe hasło istniejącego konta — nie
  if (!existing && parseTermsVersion(body?.acceptTerms) !== TERMS_VERSION) {
    throw new HttpError(400, 'Zaakceptuj regulamin, żeby założyć konto');
  }
  const salt = randomBase64(16);
  const hash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
  const userId = existing?.id ?? crypto.randomUUID();
  await env.DB.batch([
    existing
      ? env.DB.prepare(
          `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?, password_iterations = ?,
             failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?`
        ).bind(hash, salt, PASSWORD_ALGO, PASSWORD_ITERATIONS, now, userId)
      : env.DB.prepare(
          `INSERT INTO users (id, email, password_hash, password_salt, password_algo, password_iterations,
             created_at, updated_at, terms_version, terms_accepted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(userId, code.email, hash, salt, PASSWORD_ALGO, PASSWORD_ITERATIONS, now, now, TERMS_VERSION, now),
    // Nowe hasło wylogowuje wszystkie urządzenia; setupToken jednorazowy
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    env.DB.prepare('UPDATE login_codes SET setup_hash = NULL WHERE id = ?').bind(code.id),
  ]);
  const session = await createSession(env, userId);
  const termsVersion = existing ? existing.terms_version : TERMS_VERSION;
  return json({ session, user: { id: userId, email: code.email, termsVersion } });
}

export const USER_COLUMNS =
  'id, email, password_hash, password_salt, password_algo, password_iterations, failed_logins, locked_until, terms_version';

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_algo: string;
  password_iterations: number;
  failed_logins: number;
  locked_until: number | null;
  terms_version: number | null;
};

/**
 * Sprawdza hasło konta z licznikiem prób: próba liczona atomowo PRZED PBKDF2 (równoległe zgadywanie też
 * blokuje), 5. próba zakłada blokadę na 15 minut, dobre hasło zeruje licznik. 429 przy blokadzie.
 */
export async function checkUserPassword(
  env: Env,
  user: UserRow,
  password: string,
  now = Date.now()
): Promise<boolean> {
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
  if (!attempt) {
    throw new HttpError(429, 'Za dużo prób. Spróbuj za kilkanaście minut albo ustaw nowe hasło.');
  }
  if (!(await verifyPassword(password, user))) return false;
  await env.DB.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').bind(user.id).run();
  return true;
}

export async function login(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  const now = Date.now();
  const user = email
    ? await env.DB.prepare(
        `SELECT ${USER_COLUMNS} FROM users WHERE email = ?`
      )
        .bind(email)
        .first<UserRow>()
    : null;

  if (!user) {
    await hashPassword(password, DUMMY_SALT, PASSWORD_ITERATIONS);
    throw new HttpError(401, BAD_LOGIN);
  }
  if (!(await checkUserPassword(env, user, password, now))) throw new HttpError(401, BAD_LOGIN);

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
  const session = await createSession(env, user.id);
  // Wersja zgody z konta: aplikacja na nowym urządzeniu nie pyta o regulamin drugi raz
  return json({ session, user: { id: user.id, email: user.email, termsVersion: user.terms_version } });
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const token = bearer(request);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  }
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

type MemberRow = {
  id: string;
  space_id: string;
  user_id: string | null;
  role: 'owner' | 'member';
  joined_at: number;
};

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
  statements.push(
    env.DB.prepare('UPDATE member_tokens SET member_id = ? WHERE member_id = ?').bind(keep.id, drop.id)
  );
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
      // Losowy, nigdzie nieujawniany klucz zaproszenia — mapa prywatna nie ma zaproszeń
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
         FROM member_tokens t JOIN members m ON m.id = t.member_id
        WHERE t.token_hash = ? AND m.removed_at IS NULL`
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
