import type { Env } from './index';
import { HttpError } from './http';
import { sha256 } from './util';

export interface Space {
  id: string;
  rev: number;
  name: string;
}

export interface Member {
  id: string;
  spaceId: string;
  name: string;
  color: string;
  role: 'owner' | 'member';
}

/** Kto pyta: członek mapy albo — przejściowo — posiadacz linku zaproszenia (stara aplikacja). */
export interface Session {
  space: Space;
  member: Member | null;
}

/** `last_seen_at` zapisujemy najwyżej raz na minutę, żeby nie pisać do D1 przy każdym zapytaniu. */
const SEEN_THROTTLE_MS = 60_000;

function bearer(request: Request): string {
  const header = request.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function authenticate(request: Request, env: Env): Promise<Session> {
  const token = bearer(request);
  if (!token) throw new HttpError(401, 'Brak klucza rodzinnej mapy');
  const hash = await sha256(token);

  const row = await env.DB.prepare(
    `SELECT m.id, m.space_id, m.name, m.color, m.role, m.removed_at, s.rev, s.name AS space_name
       FROM members m JOIN spaces s ON s.id = m.space_id
      WHERE m.token_hash = ?`
  )
    .bind(hash)
    .first<{
      id: string;
      space_id: string;
      name: string;
      color: string;
      role: 'owner' | 'member';
      removed_at: number | null;
      rev: number;
      space_name: string;
    }>();

  if (row) {
    // Kto miał ważny klucz, może się dowiedzieć, że go usunięto — telefon pokaże to wprost
    if (row.removed_at !== null) {
      throw new HttpError(401, 'Nie masz już dostępu do tej mapy', 'member_removed');
    }
    await touch(env, row.space_id, row.id);
    return {
      space: { id: row.space_id, rev: row.rev, name: row.space_name },
      member: { id: row.id, spaceId: row.space_id, name: row.name, color: row.color, role: row.role },
    };
  }

  if (env.ALLOW_INVITE_AS_MEMBER !== 'false') {
    const space = await findSpaceByInvite(env, hash);
    if (space) {
      await touch(env, space.id, null);
      return { space, member: null };
    }
  }
  // Ten sam komunikat dla złego i unieważnionego klucza — nie zdradzamy, które to
  throw new HttpError(401, 'Link do rodzinnej mapy jest nieaktualny');
}

/** Mapa z klucza w linku zaproszenia — do podglądu i dołączenia. */
export async function spaceFromInvite(request: Request, env: Env): Promise<Space> {
  const token = bearer(request);
  const space = token ? await findSpaceByInvite(env, await sha256(token)) : null;
  if (!space) throw new HttpError(401, 'Link do rodzinnej mapy jest nieaktualny');
  return space;
}

export function requireMember(session: Session): Member {
  if (!session.member) {
    throw new HttpError(403, 'Najpierw podpisz się na tej mapie — zaktualizuj aplikację');
  }
  return session.member;
}

export function requireOwner(session: Session): Member {
  const member = requireMember(session);
  if (member.role !== 'owner') throw new HttpError(403, 'Tylko założyciel mapy może to zrobić');
  return member;
}

function findSpaceByInvite(env: Env, hash: string): Promise<Space | null> {
  return env.DB.prepare('SELECT id, rev, name FROM spaces WHERE token_hash = ?').bind(hash).first<Space>();
}

async function touch(env: Env, spaceId: string, memberId: string | null): Promise<void> {
  const now = Date.now();
  const before = now - SEEN_THROTTLE_MS;
  const statements = [
    env.DB.prepare(
      'UPDATE spaces SET last_seen_at = ?1 WHERE id = ?2 AND (last_seen_at IS NULL OR last_seen_at < ?3)'
    ).bind(now, spaceId, before),
  ];
  if (memberId) {
    statements.push(
      env.DB.prepare(
        'UPDATE members SET last_seen_at = ?1 WHERE id = ?2 AND (last_seen_at IS NULL OR last_seen_at < ?3)'
      ).bind(now, memberId, before)
    );
  }
  await env.DB.batch(statements);
}
