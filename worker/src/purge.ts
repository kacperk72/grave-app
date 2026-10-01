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
