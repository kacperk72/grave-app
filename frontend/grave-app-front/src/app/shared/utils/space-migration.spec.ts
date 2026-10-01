import { describe, expect, it } from 'vitest';
import { LEGACY_KEYS, planSpaceMigration, readLegacyFamily } from './space-migration';
import { LOCAL_SPACE_ID } from '../models/space.model';

describe('readLegacyFamily', () => {
  it('czyta klucz, rev i czas synchronizacji', () => {
    const data: Record<string, string> = {
      [LEGACY_KEYS.token]: 'abc',
      [LEGACY_KEYS.rev]: '42',
      [LEGACY_KEYS.syncedAt]: '1700000000000',
    };
    const legacy = readLegacyFamily({ getItem: (k: string) => data[k] ?? null });
    expect(legacy).toEqual({ token: 'abc', rev: 42, syncedAt: 1700000000000 });
  });
  it('śmieci w rev → 0, brak magazynu → brak mapy', () => {
    expect(readLegacyFamily({ getItem: (k: string) => (k === LEGACY_KEYS.rev ? 'x' : null) }).rev).toBe(0);
    expect(readLegacyFamily(null)).toEqual({ token: null, rev: 0, syncedAt: null });
  });
});

describe('planSpaceMigration', () => {
  it('bez rodzinnej mapy: tylko „Moje", kolejki porzucone', () => {
    const plan = planSpaceMigration({ token: null, rev: 0, syncedAt: null });
    expect(plan.spaces.map((s) => s.id)).toEqual([LOCAL_SPACE_ID]);
    expect(plan.targetSpaceId).toBe(LOCAL_SPACE_ID);
    expect(plan.keepQueues).toBe(false);
  });
  it('z rodzinną mapą: groby i kolejki trafiają do mapy czekającej na podpis', () => {
    const plan = planSpaceMigration({ token: 'abc', rev: 7, syncedAt: 123 }, () => 'fam');
    expect(plan.targetSpaceId).toBe('fam');
    expect(plan.keepQueues).toBe(true);
    const family = plan.spaces.find((s) => s.id === 'fam')!;
    expect(family).toMatchObject({
      inviteToken: 'abc',
      memberToken: null,
      rev: 7,
      syncedAt: 123,
      status: 'needs-profile',
      name: 'Rodzinna mapa',
    });
    expect(plan.spaces.some((s) => s.id === LOCAL_SPACE_ID)).toBe(true);
  });
});
