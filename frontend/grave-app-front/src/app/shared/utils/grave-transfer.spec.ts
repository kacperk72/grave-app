import { describe, expect, it } from 'vitest';
import { copyGrave, moveQueueOps } from './grave-transfer';
import { Grave } from '../models/grave.model';

function grave(): Grave {
  return {
    id: 'g1',
    latitude: 50,
    longitude: 20,
    cemeteryName: 'Rakowicki',
    currency: 'PLN',
    deceasedPersons: [
      { id: 'p1', graveId: 'g1', firstName: 'Anna', lastName: 'Nowak', birthDate: null, deathDate: null },
    ],
    photos: [
      { id: 'f1', url: '', isPrimary: true, graveId: 'g1', uploadedAt: 'x' },
      { id: 'f2', url: '', isPrimary: false, graveId: 'g1', uploadedAt: 'x' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'm-ania',
  };
}

describe('moveQueueOps', () => {
  it('z „Moje" na rodzinną: tylko zapisy (grób + oba warianty zdjęć)', () => {
    const ops = moveQueueOps(grave(), 'local', 'A');
    expect(ops.every((o) => o.spaceId === 'A' && o.op === 'put')).toBe(true);
    expect(ops).toHaveLength(1 + 2 * 2);
  });
  it('z rodzinnej do „Moje": tylko usunięcia na starej mapie', () => {
    const ops = moveQueueOps(grave(), 'A', 'local');
    expect(ops.every((o) => o.spaceId === 'A' && o.op === 'delete')).toBe(true);
    expect(ops).toHaveLength(1 + 2);
  });
  it('między rodzinnymi: usunięcia na starej i zapisy na nowej', () => {
    const ops = moveQueueOps(grave(), 'A', 'B');
    expect(ops.filter((o) => o.spaceId === 'A').every((o) => o.op === 'delete')).toBe(true);
    expect(ops.filter((o) => o.spaceId === 'B').every((o) => o.op === 'put')).toBe(true);
  });
  it('w obrębie „Moje" nic', () => expect(moveQueueOps(grave(), 'local', 'local')).toEqual([]));
});

describe('copyGrave', () => {
  let n = 0;
  const newId = () => `n${++n}`;

  it('nowe id grobu, osób i zdjęć, powiązania ustawione', () => {
    n = 0;
    const copy = copyGrave(grave(), () => true, newId, 'NOW');
    expect(copy.grave.id).not.toBe('g1');
    expect(copy.grave.deceasedPersons[0].id).not.toBe('p1');
    expect(copy.grave.deceasedPersons[0].graveId).toBe(copy.grave.id);
    expect(copy.grave.photos.every((p) => p.graveId === copy.grave.id)).toBe(true);
    expect(copy.photoIds.map(([from]) => from)).toEqual(['f1', 'f2']);
    expect(copy.grave.updatedAt).toBe('NOW');
    expect(copy.grave.updatedBy).toBeUndefined();
    expect(copy.skippedPhotos).toBe(0);
  });
  it('zdjęcia bez bajtów w telefonie są pomijane i liczone', () => {
    const copy = copyGrave(grave(), (id) => id === 'f2', newId);
    expect(copy.grave.photos).toHaveLength(1);
    expect(copy.skippedPhotos).toBe(1);
  });
  it('pominięte główne zdjęcie → główne staje się pierwsze pozostałe', () => {
    const copy = copyGrave(grave(), (id) => id === 'f2', newId);
    expect(copy.grave.photos[0].isPrimary).toBe(true);
  });
  it('zdjęcie z adresem internetowym nie potrzebuje bajtów', () => {
    const g = grave();
    g.photos = [
      { id: 'f9', url: 'https://example.com/a.jpg', isPrimary: true, graveId: 'g1', uploadedAt: 'x' },
    ];
    const copy = copyGrave(g, () => false, newId);
    expect(copy.grave.photos).toHaveLength(1);
    expect(copy.photoIds).toEqual([]);
  });
  it('nie zmienia źródła', () => {
    const g = grave();
    copyGrave(g, () => true, newId);
    expect(g.id).toBe('g1');
    expect(g.photos[0].id).toBe('f1');
  });
});
