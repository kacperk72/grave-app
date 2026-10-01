import { LOCAL_SPACE_ID, LocalSpace, localSpace, newSharedSpace } from '../models/space.model';

/** Klucze `localStorage` rodzinnej mapy sprzed wielu map (do migracji Dexie v4). */
export const LEGACY_KEYS = {
  token: 'gravemap-family-token',
  rev: 'gravemap-family-rev',
  syncedAt: 'gravemap-family-synced-at',
} as const;

export interface LegacyFamily {
  token: string | null;
  rev: number;
  syncedAt: number | null;
}

export interface SpaceMigrationPlan {
  spaces: LocalSpace[];
  /** Mapa, do której trafiają wszystkie dotychczasowe groby. */
  targetSpaceId: string;
  /** Przenieść kolejki zmian? Tylko gdy groby trafiają na mapę rodzinną. */
  keepQueues: boolean;
}

export function readLegacyFamily(storage: Pick<Storage, 'getItem'> | null): LegacyFamily {
  if (!storage) return { token: null, rev: 0, syncedAt: null };
  return {
    token: storage.getItem(LEGACY_KEYS.token),
    rev: Number(storage.getItem(LEGACY_KEYS.rev)) || 0,
    syncedAt: Number(storage.getItem(LEGACY_KEYS.syncedAt)) || null,
  };
}

/**
 * Plan przejścia na wiele map. Telefon z rodzinną mapą: wszystko trafia do niej, a mapa
 * czeka na podpis (do tego czasu synchronizuje się dawnym kluczem). Bez mapy: „Moje".
 */
export function planSpaceMigration(
  legacy: LegacyFamily,
  newId: () => string = () => crypto.randomUUID()
): SpaceMigrationPlan {
  const local = localSpace();
  if (!legacy.token) return { spaces: [local], targetSpaceId: LOCAL_SPACE_ID, keepQueues: false };
  const family = newSharedSpace({
    id: newId(),
    name: 'Rodzinna mapa',
    inviteToken: legacy.token,
    rev: legacy.rev,
    syncedAt: legacy.syncedAt,
    status: 'needs-profile',
  });
  return { spaces: [local, family], targetSpaceId: family.id, keepQueues: true };
}
