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
 * Zdjęcia leżą w R2 pod kluczem `<id mapy>/<id zdjęcia>/<wariant>`, więc klucz
 * jednej rodziny nie da dostępu do zdjęć innej. Opis zdjęcia (które, przy jakim
 * grobie) jedzie razem z grobem przez /changes — R2 trzyma same bajty.
 */

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  /** Adresy frontu, które mogą wołać API, rozdzielone przecinkami. */
  ALLOWED_ORIGINS: string;
}

interface Space {
  id: string;
  rev: number;
}

interface IncomingChange {
  id: string;
  deleted: boolean;
  data: unknown;
}

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_CHANGES_PER_REQUEST = 100;
const MAX_GRAVE_BYTES = 256 * 1024;
const MAX_GRAVES_PER_SPACE = 5000;
const PULL_PAGE_SIZE = 500;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
// Telefon zmniejsza zdjęcie przed wysłaniem (ok. 300 KB); limit z zapasem
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/webp'];
const PHOTO_VARIANTS = ['full', 'thumb'] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const response = await route(request, env);
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
      return response;
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message }, err.status, cors);
      }
      console.error(err);
      return json({ error: 'Błąd serwera' }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' && path === '/') {
    return json({ ok: true, service: 'grave-app-api' });
  }
  if (request.method === 'POST' && path === '/spaces') {
    return createSpace(env);
  }

  const space = await authenticate(request, env);

  if (request.method === 'GET' && path === '/space') {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM graves WHERE space_id = ? AND deleted = 0'
    )
      .bind(space.id)
      .first<{ count: number }>();
    return json({ graves: row?.count ?? 0, rev: space.rev });
  }
  if (request.method === 'GET' && path === '/changes') {
    return pullChanges(env, space, Number(url.searchParams.get('since') ?? 0));
  }
  if (request.method === 'POST' && path === '/changes') {
    return pushChanges(request, env, space);
  }
  const photo = path.match(/^\/photos\/([^/]+)$/);
  if (photo) {
    return handlePhoto(request, env, space, photo[1], url.searchParams.get('variant'));
  }
  if (request.method === 'POST' && path === '/space/rotate') {
    const token = newToken();
    await env.DB.prepare('UPDATE spaces SET token_hash = ? WHERE id = ?')
      .bind(await sha256(token), space.id)
      .run();
    return json({ token });
  }

  throw new HttpError(404, 'Nie ma takiego adresu');
}

async function createSpace(env: Env): Promise<Response> {
  const token = newToken();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO spaces (id, token_hash, rev, created_at, last_seen_at) VALUES (?, ?, 0, ?, ?)'
  )
    .bind(crypto.randomUUID(), await sha256(token), now, now)
    .run();
  return json({ token, rev: 0 }, 201);
}

async function authenticate(request: Request, env: Env): Promise<Space> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Brak klucza rodzinnej mapy');

  const space = await env.DB.prepare('SELECT id, rev FROM spaces WHERE token_hash = ?')
    .bind(await sha256(token))
    .first<Space>();
  // Ten sam komunikat dla złego i unieważnionego klucza — nie zdradzamy, które to
  if (!space) throw new HttpError(401, 'Link do rodzinnej mapy jest nieaktualny');

  // Ślad aktywności, żeby kiedyś dało się sprzątnąć porzucone mapy
  await env.DB.prepare('UPDATE spaces SET last_seen_at = ? WHERE id = ?')
    .bind(Date.now(), space.id)
    .run();
  return space;
}

async function pullChanges(env: Env, space: Space, since: number): Promise<Response> {
  const after = Number.isFinite(since) && since > 0 ? Math.floor(since) : 0;
  const { results } = await env.DB.prepare(
    `SELECT id, data, deleted, rev FROM graves
      WHERE space_id = ? AND rev > ?
      ORDER BY rev
      LIMIT ?`
  )
    .bind(space.id, after, PULL_PAGE_SIZE + 1)
    .all<{ id: string; data: string | null; deleted: number; rev: number }>();

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
    })),
  });
}

async function pushChanges(request: Request, env: Env, space: Space): Promise<Response> {
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
        `INSERT INTO graves (space_id, id, data, deleted, rev, updated_at)
         VALUES (?1, ?2, ?3, ?4, (SELECT rev FROM spaces WHERE id = ?1), ?5)
         ON CONFLICT (space_id, id) DO UPDATE SET
           data = excluded.data,
           deleted = excluded.deleted,
           rev = excluded.rev,
           updated_at = excluded.updated_at`
      ).bind(
        space.id,
        change.id,
        change.deleted ? null : JSON.stringify(change.data),
        change.deleted ? 1 : 0,
        now
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
    await env.PHOTOS.put(key(variant), body, { httpMetadata: { contentType: type } });
    return json({ ok: true }, 201);
  }

  if (request.method === 'GET') {
    const object = await env.PHOTOS.get(key(variant));
    if (!object) throw new HttpError(404, 'Nie ma takiego zdjęcia');
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
        // Zdjęcie o danym id nigdy się nie zmienia; „private", bo wymaga klucza rodziny
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  }

  if (request.method === 'DELETE') {
    await env.PHOTOS.delete(PHOTO_VARIANTS.map((v) => key(v)));
    return json({ ok: true });
  }

  throw new HttpError(405, 'Niedozwolona metoda');
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

async function readJson(request: Request): Promise<unknown> {
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

/** 32 losowe bajty jako base64url — nie do zgadnięcia, krótkie w linku. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
