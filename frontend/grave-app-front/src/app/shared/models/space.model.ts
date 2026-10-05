import { AvatarColor } from '../utils/member-display';

/** „Moje" — groby tylko w tym telefonie, bez synchronizacji. */
export const LOCAL_SPACE_ID = 'local';

export type SpaceRole = 'owner' | 'member';

/**
 * active — działa; removed — założyciel usunął ten telefon (groby tylko do odczytu);
 * needs-profile — mapa sprzed list członków: synchronizuje się kluczem z linku i czeka na podpis.
 */
export type SpaceStatus = 'active' | 'removed' | 'needs-profile';

/** Mapa zapamiętana w telefonie (tabela `spaces` w IndexedDB). */
export interface LocalSpace {
  /** Lokalne id: `local` dla „Moje", dla rodzinnych losowy UUID nadany w telefonie. */
  id: string;
  /** Id mapy na serwerze; null dla „Moje" i mapy sprzed migracji do czasu podpisu. */
  serverId: string | null;
  name: string;
  /** Klucz członka — tylko w tym telefonie. */
  memberToken: string | null;
  /** Klucz z linku zaproszenia — do udostępniania (i synchronizacji, dopóki `needs-profile`). */
  inviteToken: string | null;
  memberId: string | null;
  role: SpaceRole | null;
  /** Ostatni pobrany numer zmiany mapy (synchronizacja przyrostowa). */
  rev: number;
  syncedAt: number | null;
  status: SpaceStatus;
  createdAt: number;
  /** 'personal' = prywatna „Moje” konta na serwerze; brak = mapa rodzinna. */
  kind?: 'family' | 'personal';
}

/** Członek mapy, jak zwraca go `GET /members`. */
export interface Member {
  id: string;
  name: string;
  color: AvatarColor;
  role: SpaceRole;
  joinedAt: number;
  lastSeenAt: number | null;
}

/** Podpis tego telefonu: imię i kolor awatara. */
export interface Profile {
  name: string;
  color: AvatarColor;
}

export function localSpace(): LocalSpace {
  return {
    id: LOCAL_SPACE_ID,
    serverId: null,
    name: 'Moje',
    memberToken: null,
    inviteToken: null,
    memberId: null,
    role: null,
    rev: 0,
    syncedAt: null,
    status: 'active',
    createdAt: 0,
  };
}

export function newSharedSpace(fields: Partial<LocalSpace> & Pick<LocalSpace, 'name'>): LocalSpace {
  return {
    id: crypto.randomUUID(),
    serverId: null,
    memberToken: null,
    inviteToken: null,
    memberId: null,
    role: null,
    rev: 0,
    syncedAt: null,
    status: 'active',
    createdAt: Date.now(),
    ...fields,
  };
}

export function isShared(space: Pick<LocalSpace, 'id'>): boolean {
  return space.id !== LOCAL_SPACE_ID;
}

/** Klucz do API tej mapy; null dla „Moje" i mapy, z której usunięto ten telefon. */
export function credentialOf(space: LocalSpace): string | null {
  if (!isShared(space) || space.status === 'removed') return null;
  return space.memberToken ?? (space.status === 'needs-profile' ? space.inviteToken : null);
}
