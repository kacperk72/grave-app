/**
 * API rodzinnej mapy GraveMap (Cloudflare Worker + D1).
 *
 * Źródłem prawdy jest D1. Telefony trzymają kopię w IndexedDB, wysyłają swoje
 * zmiany (POST /changes) i pobierają cudze (GET /changes?since=N). Dostęp daje
 * klucz z rodzinnego linku, przesyłany w nagłówku `Authorization: Bearer <klucz>`.
 *
 *   POST /spaces          utworzenie mapy → { token }
 *   GET  /space           podgląd mapy (liczba grobów) — do ekranu dołączania
 *   GET  /changes?since=N zmiany po rev N (z usunięciami)
 *   POST /changes         zapis zmian z telefonu
 *   POST /space/rotate    nowy link; stary przestaje działać
 *   PUT  /photos/:id      zdjęcie grobu (?variant=full|thumb, treść = JPEG/WebP)
 *   GET  /photos/:id      pobranie zdjęcia (?variant=full|thumb)
 *   DELETE /photos/:id    usunięcie obu wariantów
 *
 * Zdjęcia leżą w Workers KV pod kluczem `<id mapy>/<id zdjęcia>/<wariant>`, więc
 * klucz jednej rodziny nie da dostępu do zdjęć innej. Opis zdjęcia (które, przy jakim
 * grobie) jedzie razem z grobem przez /changes — KV trzyma same bajty.
 *
 * KV zamiast R2 świadomie: na darmowym planie ma twarde limity bez podpinania karty,
 * więc żaden błąd ani atak nie wygeneruje rachunku — najwyżej zapis się nie uda.
 */

import { HttpError, corsHeaders, json, readJson } from './http';
import { currentDay } from './util';
import { Session, Space, authenticate, spaceFromInvite } from './auth';
import {
  createSpace,
  deleteSpace,
  invitePreview,
  joinSpace,
  leaveSpace,
  listMembers,
  removeMember,
  renameSpace,
  rotateInvite,
  spaceInfo,
  transferOwner,
  updateMe,
} from './members';
import { purgePhotos } from './purge';
import { getAccount, login, logout, requestCode, setPassword, verifyCode } from './accounts';

export interface Env {
  DB: D1Database;
  PHOTOS: KVNamespace;
  /** Adresy frontu, które mogą wołać API, rozdzielone przecinkami. */
  ALLOWED_ORIGINS: string;
  /** "false" wyłącza dostęp przejściowy kluczem zaproszenia. */
  ALLOW_INVITE_AS_MEMBER?: string;
  /** Adres aplikacji w linkach z maili. */
  APP_URL: string;
  /** "resend" albo "log" (tylko lokalnie). */
  MAIL_MODE?: string;
  /** Sekret: klucz API Resend. */
  RESEND_API_KEY?: string;
}

interface IncomingChange {
  id: string;
  deleted: boolean;
  data: unknown;
}

const MAX_CHANGES_PER_REQUEST = 100;
const MAX_GRAVE_BYTES = 256 * 1024;
const MAX_GRAVES_PER_SPACE = 5000;
const PULL_PAGE_SIZE = 500;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
// Telefon zmniejsza zdjęcie przed wysłaniem (ok. 300 KB); limit z zapasem
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/webp'];
const PHOTO_VARIANTS = ['full', 'thumb'] as const;

// Darmowe KV: 1 GB miejsca, 1000 zapisów i 1000 usunięć dziennie, 100 tys. odczytów.
// Po przekroczeniu Cloudflare po prostu odrzuca operację (nic nie nalicza), ale wtedy
// zapis kończy się błędem bez wyjaśnienia — dlatego pilnujemy limitów sami, z zapasem,
// i zwracamy zrozumiały komunikat.
const PHOTO_TOTAL_LIMIT_BYTES = 900_000_000; // 900 MB dla wszystkich rodzin razem
const PHOTO_SPACE_LIMIT_BYTES = 500_000_000; // 500 MB (ok. 800 zdjęć) na jedną rodzinną mapę
const PHOTO_DAILY_WRITE_LIMIT = 900; // zapisy do KV w ciągu doby (UTC)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env.ALLOWED_ORIGINS);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const response = await route(request, env);
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
      return response;
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, err.status, cors);
      }
      console.error(err);
      return json({ error: 'Błąd serwera' }, 500, cors);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await purgePhotos(env);
  },
} satisfies ExportedHandler<Env>;

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

  // Konta (sesja w Authorization tylko tam, gdzie potrzebna)
  if (request.method === 'POST' && path === '/auth/request') return requestCode(request, env);
  if (request.method === 'POST' && path === '/auth/verify') return verifyCode(request, env);
  if (request.method === 'POST' && path === '/auth/password') return setPassword(request, env);
  if (request.method === 'POST' && path === '/auth/login') return login(request, env);
  if (request.method === 'POST' && path === '/auth/logout') return logout(request, env);
  if (request.method === 'GET' && path === '/account') return getAccount(request, env);

  const session = await authenticate(request, env);
  const space = session.space;

  if (request.method === 'GET' && path === '/space') {
    return spaceInfo(env, session);
  }
  if (request.method === 'GET' && path === '/changes') {
    return pullChanges(env, space, Number(url.searchParams.get('since') ?? 0));
  }
  if (request.method === 'POST' && path === '/changes') {
    return pushChanges(request, env, session);
  }
  const photo = path.match(/^\/photos\/([^/]+)$/);
  if (photo) {
    return handlePhoto(request, env, space, photo[1], url.searchParams.get('variant'));
  }
  if (request.method === 'GET' && path === '/members') return listMembers(env, session);
  if (request.method === 'PATCH' && path === '/me') return updateMe(request, env, session);
  if (request.method === 'POST' && path === '/space/leave') return leaveSpace(env, session);
  if (request.method === 'PATCH' && path === '/space') return renameSpace(request, env, session);
  if (request.method === 'DELETE' && path === '/space') return deleteSpace(env, session);
  if (request.method === 'POST' && path === '/space/rotate') return rotateInvite(env, session);
  const member = path.match(/^\/members\/([^/]+)(\/owner)?$/);
  if (member && request.method === 'DELETE' && !member[2]) return removeMember(env, session, member[1]);
  if (member && request.method === 'POST' && member[2]) return transferOwner(env, session, member[1]);

  throw new HttpError(404, 'Nie ma takiego adresu');
}

async function pullChanges(env: Env, space: Space, since: number): Promise<Response> {
  const after = Number.isFinite(since) && since > 0 ? Math.floor(since) : 0;
  const { results } = await env.DB.prepare(
    `SELECT id, data, deleted, rev, updated_by FROM graves
      WHERE space_id = ? AND rev > ?
      ORDER BY rev
      LIMIT ?`
  )
    .bind(space.id, after, PULL_PAGE_SIZE + 1)
    .all<{ id: string; data: string | null; deleted: number; rev: number; updated_by: string | null }>();

  const more = results.length > PULL_PAGE_SIZE;
  const page = more ? results.slice(0, PULL_PAGE_SIZE) : results;
  return json({
    // Przy kolejnej stronie telefon pyta od ostatniego rev z tej strony
    rev: more ? page[page.length - 1].rev : space.rev,
    more,
    changes: page.map((r) => ({
      id: r.id,
      rev: r.rev,
      deleted: r.deleted === 1,
      data: r.data ? JSON.parse(r.data) : null,
      updatedBy: r.updated_by,
    })),
  });
}

async function pushChanges(request: Request, env: Env, session: Session): Promise<Response> {
  const space = session.space;
  const changes = parseChanges(await readJson(request));
  if (changes.length === 0) return json({ rev: space.rev });

  const newIds = changes.filter((c) => !c.deleted).map((c) => c.id);
  if (newIds.length > 0) {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM graves WHERE space_id = ? AND deleted = 0'
    )
      .bind(space.id)
      .first<{ count: number }>();
    if ((row?.count ?? 0) >= MAX_GRAVES_PER_SPACE) {
      throw new HttpError(413, 'Rodzinna mapa osiągnęła limit grobów');
    }
  }

  // Każda zmiana: najpierw podbij licznik mapy, potem zapisz grób z nowym rev.
  // db.batch wykonuje wszystko w jednej transakcji — albo cała paczka, albo nic.
  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  for (const change of changes) {
    statements.push(env.DB.prepare('UPDATE spaces SET rev = rev + 1 WHERE id = ?').bind(space.id));
    statements.push(
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
    );
  }
  statements.push(env.DB.prepare('SELECT rev FROM spaces WHERE id = ?').bind(space.id));

  const results = await env.DB.batch<{ rev: number }>(statements);
  const rev = results[results.length - 1].results[0]?.rev ?? space.rev;
  return json({ rev });
}

async function handlePhoto(
  request: Request,
  env: Env,
  space: Space,
  photoId: string,
  variantParam: string | null
): Promise<Response> {
  if (!ID_PATTERN.test(photoId)) throw new HttpError(400, 'Nieprawidłowy identyfikator zdjęcia');
  const variant = variantParam ?? 'full';
  if (!(PHOTO_VARIANTS as readonly string[]).includes(variant)) {
    throw new HttpError(400, 'Nieznany wariant zdjęcia');
  }
  const key = (v: string) => `${space.id}/${photoId}/${v}`;

  if (request.method === 'PUT') {
    const type = (request.headers.get('Content-Type') ?? '').split(';')[0].trim();
    if (!PHOTO_TYPES.includes(type)) throw new HttpError(415, 'Zdjęcie musi być w formacie JPEG lub WebP');
    const length = Number(request.headers.get('Content-Length') ?? 0);
    if (length > MAX_PHOTO_BYTES) throw new HttpError(413, 'Zdjęcie jest za duże');
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) throw new HttpError(400, 'Puste zdjęcie');
    if (body.byteLength > MAX_PHOTO_BYTES) throw new HttpError(413, 'Zdjęcie jest za duże');

    await checkPhotoQuota(env, space, key(variant), body.byteLength);
    await env.PHOTOS.put(key(variant), body, { metadata: { contentType: type } });
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO photo_objects (key, space_id, bytes, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET bytes = excluded.bytes`
      ).bind(key(variant), space.id, body.byteLength, Date.now()),
      env.DB.prepare(
        `INSERT INTO usage_daily (day, photo_writes) VALUES (?, 1)
         ON CONFLICT (day) DO UPDATE SET photo_writes = photo_writes + 1`
      ).bind(currentDay()),
    ]);
    return json({ ok: true }, 201);
  }

  if (request.method === 'GET') {
    const { value, metadata } = await env.PHOTOS.getWithMetadata<{ contentType?: string }>(
      key(variant),
      'stream'
    );
    if (!value) throw new HttpError(404, 'Nie ma takiego zdjęcia');
    return new Response(value, {
      headers: {
        'Content-Type': metadata?.contentType ?? 'image/jpeg',
        // Zdjęcie o danym id nigdy się nie zmienia; „private", bo wymaga klucza rodziny
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  }

  if (request.method === 'DELETE') {
    const keys = PHOTO_VARIANTS.map((v) => key(v));
    await Promise.all(keys.map((k) => env.PHOTOS.delete(k)));
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM photo_objects WHERE key IN (?, ?)`).bind(...keys),
      env.DB.prepare(
        `INSERT INTO usage_daily (day, photo_deletes) VALUES (?1, ?2)
         ON CONFLICT (day) DO UPDATE SET photo_deletes = photo_deletes + ?2`
      ).bind(currentDay(), keys.length),
    ]);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Niedozwolona metoda');
}

/**
 * Odmawia zapisu, który przekroczyłby bezpiecznik darmowego planu. Nadpisanie
 * istniejącego obiektu liczy się jako różnica rozmiarów, nie nowe miejsce.
 */
async function checkPhotoQuota(env: Env, space: Space, objectKey: string, bytes: number): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COALESCE(SUM(bytes), 0) FROM photo_objects) AS total,
       (SELECT COALESCE(SUM(bytes), 0) FROM photo_objects WHERE space_id = ?1) AS space,
       (SELECT COALESCE(bytes, 0) FROM photo_objects WHERE key = ?2) AS existing,
       (SELECT COALESCE(photo_writes, 0) FROM usage_daily WHERE day = ?3) AS writes`
  )
    .bind(space.id, objectKey, currentDay())
    .first<{ total: number; space: number; existing: number | null; writes: number | null }>();

  const growth = bytes - (row?.existing ?? 0);
  if ((row?.writes ?? 0) >= PHOTO_DAILY_WRITE_LIMIT) {
    throw new HttpError(429, 'Na dziś wyczerpano limit wysyłania zdjęć. Zdjęcie wyśle się jutro.');
  }
  if ((row?.space ?? 0) + growth > PHOTO_SPACE_LIMIT_BYTES) {
    throw new HttpError(507, 'Rodzinna mapa ma już komplet zdjęć (limit 500 MB). Usuń niepotrzebne, aby dodać nowe.');
  }
  if ((row?.total ?? 0) + growth > PHOTO_TOTAL_LIMIT_BYTES) {
    throw new HttpError(507, 'Brak miejsca na nowe zdjęcia w aplikacji. Spróbuj później.');
  }
}

function parseChanges(body: unknown): IncomingChange[] {
  const list = (body as { changes?: unknown })?.changes;
  if (!Array.isArray(list)) throw new HttpError(400, 'Brak listy zmian');
  if (list.length > MAX_CHANGES_PER_REQUEST) {
    throw new HttpError(413, `Najwyżej ${MAX_CHANGES_PER_REQUEST} zmian naraz`);
  }

  return list.map((raw): IncomingChange => {
    const c = raw as { id?: unknown; deleted?: unknown; data?: unknown };
    if (typeof c.id !== 'string' || !ID_PATTERN.test(c.id)) {
      throw new HttpError(400, 'Nieprawidłowy identyfikator grobu');
    }
    const deleted = c.deleted === true;
    if (!deleted) {
      if (!c.data || typeof c.data !== 'object' || (c.data as { id?: unknown }).id !== c.id) {
        throw new HttpError(400, 'Nieprawidłowe dane grobu');
      }
      if (JSON.stringify(c.data).length > MAX_GRAVE_BYTES) {
        throw new HttpError(413, 'Grób ma za dużo danych');
      }
    }
    return { id: c.id, deleted, data: deleted ? null : c.data };
  });
}

