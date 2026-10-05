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
    if (usable(row) && (await sha256(body.code.trim())) !== row.code_hash) {
      await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
      throw new HttpError(401, BAD_CODE);
    }
  }
  if (!usable(row)) throw new HttpError(401, BAD_CODE);

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
  const code = await env.DB.prepare(
    'SELECT id, email FROM login_codes WHERE setup_hash = ? AND setup_expires_at > ?'
  )
    .bind(setupHash, now)
    .first<{ id: string; email: string }>();
  if (!code) throw new HttpError(401, 'Czas na ustawienie hasła minął — poproś o nowy kod');

  const salt = randomBase64(16);
  const hash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(code.email)
    .first<{ id: string }>();
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

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_algo: string;
  password_iterations: number;
  failed_logins: number;
  locked_until: number | null;
};

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
        .first<UserRow>()
    : null;

  if (!user) {
    await hashPassword(password, DUMMY_SALT, PASSWORD_ITERATIONS);
    throw new HttpError(401, BAD_LOGIN);
  }
  if (user.locked_until && user.locked_until > now) {
    throw new HttpError(429, 'Za dużo prób. Spróbuj za kilkanaście minut albo ustaw nowe hasło.');
  }
  if (!(await verifyPassword(password, user))) {
    // Po 5. błędzie blokada na 15 minut i licznik od zera — kolejne 5 prób po blokadzie znów blokuje
    const failures = user.failed_logins + 1;
    const lock = failures >= MAX_LOGIN_FAILURES;
    await env.DB.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')
      .bind(lock ? 0 : failures, lock ? now + LOCK_MS : null, user.id)
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
    await env.DB.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?')
      .bind(user.id)
      .run();
  }
  const session = await createSession(env, user.id);
  return json({ session, user: { id: user.id, email: user.email } });
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
