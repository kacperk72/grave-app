import { LOCAL_SPACE_ID, LocalSpace, SpaceRole, isShared } from '../models/space.model';

/** Mapa konta z odpowiedzi `POST /account/link`. */
export interface LinkedSpace {
  spaceId: string;
  kind: 'family' | 'personal';
  name: string;
  role: SpaceRole;
  memberId: string;
  memberToken: string;
}

export type LinkStep =
  | { localId: string; changes: Partial<LocalSpace> }
  | { localId: null; fields: Partial<LocalSpace> & Pick<LocalSpace, 'name'> };

/**
 * Jak połączyć mapy konta z mapami w telefonie: znane (po id serwera) dostają klucz tego
 * urządzenia, nowe są dodawane i pobierane od zera. Mapy telefonu spoza konta zostają.
 */
export function planAccountLink(local: LocalSpace[], linked: LinkedSpace[]): LinkStep[] {
  return linked.map((l): LinkStep => {
    const fields: Partial<LocalSpace> = {
      serverId: l.spaceId,
      name: l.name,
      kind: l.kind,
      role: l.role,
      memberId: l.memberId,
      memberToken: l.memberToken,
      status: 'active',
    };
    const known = local.find((s) => isShared(s) && s.serverId === l.spaceId);
    if (!known) return { localId: null, fields: { ...fields, name: l.name, rev: 0 } };
    return { localId: known.id, changes: known.status === 'removed' ? { ...fields, rev: 0 } : fields };
  });
}

/** Po zalogowaniu jedna „Moje”: prywatna mapa konta na początku, lokalna „Moje” ukryta. */
export function visibleSpaces<T extends Pick<LocalSpace, 'id' | 'kind'>>(all: T[]): T[] {
  if (!all.some((s) => s.kind === 'personal')) return all;
  return [
    ...all.filter((s) => s.kind === 'personal'),
    ...all.filter((s) => s.kind !== 'personal' && s.id !== LOCAL_SPACE_ID),
  ];
}

/**
 * Co wylogowanie zabiera z przeglądarki: tylko mapy konta (`kind` nadaje przypięcie do konta),
 * bo wrócą po zalogowaniu. Mapy spoza konta i kopie map, z których usunięto to urządzenie, zostają —
 * to jedyne kopie tych grobów.
 */
export function spacesToForgetOnLogout(spaces: Pick<LocalSpace, 'id' | 'kind' | 'status'>[]): string[] {
  return spaces
    .filter((s) => s.id !== LOCAL_SPACE_ID && s.kind && s.status !== 'removed')
    .map((s) => s.id);
}
