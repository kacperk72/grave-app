import type { Env } from './index';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kody z maila (ze skrótem IP) żyją 24 h, wygasłe sesje znikają — okresy z polityki prywatności. */
export async function cleanupAuth(env: Env, now = Date.now()): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_codes WHERE created_at < ?').bind(now - DAY_MS),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
}
