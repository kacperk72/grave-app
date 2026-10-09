import type { Env } from './index';
import { parseTermsVersion } from './legal';
import { Session, Space, requireMember, requireOwner } from './auth';
import { HttpError, json, readJson, readOptionalJson } from './http';
import { userFromSession } from './accounts';
import { newToken, sha256 } from './util';

/** Paleta awatarów — ta sama lista co w aplikacji (`shared/utils/member-display.ts`). */
export const AVATAR_COLORS = ['sage', 'clay', 'sky', 'plum', 'sand', 'slate', 'rose', 'moss'];
const MAX_NAME_CHARS = 40;
const MAX_MEMBERS_PER_SPACE = 50;
const DEFAULT_SPACE_NAME = 'Rodzinna mapa';
/** Ile czasu po ostatnim użyciu klucza z linku mapa uchodzi za używaną przez niepodpisane telefony. */
const LEGACY_ACTIVITY_MS = 30 * 24 * 60 * 60 * 1000;

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
  userId?: string | null;
  /** Wersja zaakceptowanego regulaminu (z ciała zapytania); data zgody = chwila zapisu. */
  termsVersion?: number | null;
}

/** Członek i jego pierwszy klucz urządzenia. `members.token_hash` zostaje wypełnione (powrót do starszej wersji). */
export function insertMember(env: Env, m: NewMember): D1PreparedStatement[] {
  const now = Date.now();
  return [
    env.DB.prepare(
      `INSERT INTO members (id, space_id, token_hash, name, color, role, joined_at, last_seen_at, user_id,
         terms_version, terms_accepted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      m.id,
      m.spaceId,
      m.tokenHash,
      m.name,
      m.color,
      m.role,
      now,
      now,
      m.userId ?? null,
      m.termsVersion ?? null,
      m.termsVersion ? now : null
    ),
    env.DB.prepare('INSERT INTO member_tokens (token_hash, member_id, created_at) VALUES (?, ?, ?)').bind(
      m.tokenHash,
      m.id,
      now
    ),
  ];
}

export async function createSpace(request: Request, env: Env): Promise<Response> {
  const body = (await readOptionalJson(request)) as {
    name?: unknown;
    member?: { name?: unknown; color?: unknown };
    acceptTerms?: unknown;
  } | null;
  const invite = newToken();
  const inviteHash = await sha256(invite);
  const spaceId = crypto.randomUUID();
  const now = Date.now();
  const insertSpace = (name: string) =>
    env.DB.prepare(
      'INSERT INTO spaces (id, token_hash, rev, created_at, last_seen_at, name) VALUES (?, ?, 0, ?, ?, ?)'
    ).bind(spaceId, inviteHash, now, now, name);

  if (body === null) {
    // Stara wersja aplikacji: mapa bez założyciela — zostanie nim pierwszy, kto się podpisze
    await insertSpace(DEFAULT_SPACE_NAME).run();
    return json({ token: invite, rev: 0 }, 201);
  }

  const name = parseName(body.name ?? DEFAULT_SPACE_NAME, 'Nazwa mapy');
  const memberName = parseName(body.member?.name, 'Imię');
  const color = parseColor(body.member?.color);
  const memberToken = newToken();
  const memberId = crypto.randomUUID();
  await env.DB.batch([
    insertSpace(name),
    ...insertMember(env, {
      id: memberId,
      spaceId,
      tokenHash: await sha256(memberToken),
      name: memberName,
      color,
      role: 'owner',
      termsVersion: parseTermsVersion(body.acceptTerms),
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
  const body = (await readJson(request)) as { name?: unknown; color?: unknown; acceptTerms?: unknown } | null;
  const name = parseName(body?.name, 'Imię');
  const color = parseColor(body?.color);

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
      return json(
        { spaceId: space.id, name: space.name, memberToken, memberId: existing.id, role: existing.role },
        201
      );
    }
  }

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
    userId: user?.id ?? null,
    termsVersion: parseTermsVersion(body?.acceptTerms),
  };
  try {
    await env.DB.batch(insertMember(env, member));
  } catch (err) {
    // Dwa pierwsze dołączenia naraz: indeks members_one_owner wpuści tylko jednego założyciela
    if (member.role !== 'owner' || !String(err).includes('UNIQUE')) throw err;
    member.role = 'member';
    await env.DB.batch(insertMember(env, member));
  }
  return json(
    { spaceId: space.id, name: space.name, memberToken, memberId: member.id, role: member.role },
    201
  );
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
  rejectPersonal(session);
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
  rejectPersonal(session);
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
  rejectPersonal(session);
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
  rejectPersonal(session);
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

/** Usuwa mapę. Bajty zdjęć trafiają do kolejki sprzątania (Cron, src/purge.ts). */
export async function deleteSpace(env: Env, session: Session): Promise<Response> {
  rejectPersonal(session);
  requireOwner(session);
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS active FROM members WHERE space_id = ? AND removed_at IS NULL'
  )
    .bind(session.space.id)
    .first<{ active: number }>();
  if ((row?.active ?? 0) > 1) {
    throw new HttpError(409, 'Na mapie są jeszcze inne osoby — najpierw je usuń albo przekaż rolę');
  }
  // Telefony bez podpisu (stara aplikacja) nie są na liście członków, a nadal korzystają z mapy
  if (env.ALLOW_INVITE_AS_MEMBER !== 'false') {
    const seen = await env.DB.prepare('SELECT invite_seen_at FROM spaces WHERE id = ?')
      .bind(session.space.id)
      .first<{ invite_seen_at: number | null }>();
    if (seen?.invite_seen_at && seen.invite_seen_at > Date.now() - LEGACY_ACTIVITY_MS) {
      throw new HttpError(
        409,
        'Z tej mapy korzystają jeszcze telefony bez podpisu (starsza wersja aplikacji). Poczekaj, aż wszyscy zaktualizują aplikację.'
      );
    }
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

/** Mapa prywatna konta: bez zaproszeń, wychodzenia, usuwania osób i całej mapy. */
function rejectPersonal(session: Session): void {
  if (session.space.kind === 'personal') throw new HttpError(403, 'To prywatna mapa');
}
