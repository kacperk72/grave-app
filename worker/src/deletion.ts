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
    // Wszyscy członkowie konta — także usunięci i scaleni z nimi (scalony wiersz nie ma user_id, prowadzi do
    // zachowanego przez merged_into, także łańcuchowo): bez imienia, bez kluczy, bez powiązania z kontem
    env.DB.prepare(
      `WITH RECURSIVE mine(id) AS (
         SELECT id FROM members WHERE user_id = ?1
         UNION SELECT m.id FROM members m JOIN mine ON m.merged_into = mine.id
       )
       DELETE FROM member_tokens WHERE member_id IN (SELECT id FROM mine)`
    ).bind(user.id),
    env.DB.prepare(
      `WITH RECURSIVE mine(id) AS (
         SELECT id FROM members WHERE user_id = ?1
         UNION SELECT m.id FROM members m JOIN mine ON m.merged_into = mine.id
       )
       UPDATE members SET name = 'Usunięte konto', removed_at = COALESCE(removed_at, ?2)
        WHERE id IN (SELECT id FROM mine)`
    ).bind(user.id, now),
    env.DB.prepare('UPDATE members SET user_id = NULL WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(user.email),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)
  );
  await env.DB.batch(statements);
  return json({ ok: true });
}
