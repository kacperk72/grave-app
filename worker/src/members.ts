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
