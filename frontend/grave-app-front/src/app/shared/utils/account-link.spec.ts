import { describe, expect, it } from 'vitest';
import { LinkedSpace, planAccountLink } from './account-link';
import { LocalSpace, localSpace, newSharedSpace } from '../models/space.model';

const linked = (over: Partial<LinkedSpace>): LinkedSpace => ({
  spaceId: 's1',
  kind: 'family',
  name: 'Rodzina',
  role: 'member',
  memberId: 'm1',
  memberToken: 't1',
  ...over,
});

describe('planAccountLink', () => {
  it('mapa znana po serverId → aktualizacja klucza, roli i nazwy', () => {
    const fam = newSharedSpace({ id: 'L1', serverId: 's1', name: 'Stara', memberToken: 'old', rev: 7 });
    const steps = planAccountLink([localSpace(), fam], [linked({ memberToken: 'new', role: 'owner' })]);
    expect(steps).toEqual([
      {
        localId: 'L1',
        changes: {
          serverId: 's1',
          name: 'Rodzina',
          kind: 'family',
          role: 'owner',
          memberId: 'm1',
          memberToken: 'new',
          status: 'active',
        },
      },
    ]);
  });
  it('nowa mapa → dodanie od rev 0', () => {
    const steps = planAccountLink([localSpace()], [linked({ spaceId: 's9' })]);
    expect(steps[0]).toMatchObject({
      localId: null,
      fields: { serverId: 's9', rev: 0, status: 'active', kind: 'family' },
    });
  });
  it('mapa prywatna dostaje kind personal i nazwę Moje', () => {
    const steps = planAccountLink(
      [localSpace()],
      [linked({ spaceId: 'p1', kind: 'personal', name: 'Moje', role: 'owner' })]
    );
    expect(steps[0]).toMatchObject({ localId: null, fields: { kind: 'personal', name: 'Moje' } });
  });
  it('mapa wcześniej usunięta z telefonu (removed) → pobierz od zera', () => {
    const fam = newSharedSpace({ id: 'L1', serverId: 's1', name: 'R', status: 'removed', rev: 5 });
    const steps = planAccountLink([fam], [linked({})]);
    expect(steps[0]).toMatchObject({ localId: 'L1', changes: { status: 'active', rev: 0 } });
  });
  it('mapy telefonu spoza konta zostają bez zmian', () => {
    const other: LocalSpace = newSharedSpace({ id: 'L2', serverId: 'sX', name: 'Inna' });
    expect(planAccountLink([localSpace(), other], [])).toEqual([]);
  });
});
