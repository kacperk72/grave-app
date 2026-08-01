import { describe, it, expect } from 'vitest';
import {
  serializeBackup,
  parseBackup,
  partitionByExisting,
  BACKUP_APP,
  BACKUP_VERSION,
} from './grave-backup';
import { Grave } from '../models/grave.model';

function makeGrave(overrides: Partial<Grave> = {}): Grave {
  return {
    id: 'g1',
    latitude: 49.6126,
    longitude: 21.6488,
    cemeteryName: 'Cmentarz Rakowicki',
    currency: 'PLN',
    deceasedPersons: [
      { id: 'p1', graveId: 'g1', firstName: 'Anna', lastName: 'Kowalska', birthDate: null, deathDate: null },
    ],
    photos: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('serializeBackup', () => {
  it('buduje wrapper z nagłówkiem i grobami', () => {
    const json = serializeBackup([makeGrave()], new Date('2026-08-01T10:00:00.000Z'));
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe(BACKUP_APP);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.exportedAt).toBe('2026-08-01T10:00:00.000Z');
    expect(parsed.graves).toHaveLength(1);
    expect(parsed.graves[0].cemeteryName).toBe('Cmentarz Rakowicki');
  });
});

describe('parseBackup', () => {
  it('round-trip: serialize → parse zachowuje groby', () => {
    const graves = [makeGrave(), makeGrave({ id: 'g2', cemeteryName: 'Cmentarz Podgórski' })];
    const res = parseBackup(serializeBackup(graves));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.graves).toHaveLength(2);
      expect(res.graves.map((g) => g.id)).toEqual(['g1', 'g2']);
      expect(res.skippedInvalid).toBe(0);
    }
  });

  it('akceptuje gołą tablicę grobów', () => {
    const res = parseBackup(JSON.stringify([makeGrave()]));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.graves).toHaveLength(1);
  });

  it('odrzuca nieprawidłowy JSON', () => {
    const res = parseBackup('{ to nie json');
    expect(res.ok).toBe(false);
  });

  it('odrzuca plik bez listy grobów', () => {
    const res = parseBackup(JSON.stringify({ app: 'GraveMap', version: 1 }));
    expect(res.ok).toBe(false);
  });

  it('pomija grób bez współrzędnych, liczy skippedInvalid', () => {
    const bad = { id: 'x', cemeteryName: 'Test' }; // brak lat/lng
    const res = parseBackup(JSON.stringify({ graves: [makeGrave(), bad] }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.graves).toHaveLength(1);
      expect(res.skippedInvalid).toBe(1);
    }
  });

  it('odrzuca plik, gdy żaden grób nie jest prawidłowy', () => {
    const res = parseBackup(JSON.stringify({ graves: [{ foo: 'bar' }] }));
    expect(res.ok).toBe(false);
  });

  it('uzupełnia brakujące pola opcjonalne (currency, photos, deceasedPersons)', () => {
    const minimal = { id: 'm1', latitude: 50, longitude: 20, cemeteryName: 'C' };
    const res = parseBackup(JSON.stringify({ graves: [minimal] }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      const g = res.graves[0];
      expect(g.currency).toBe('PLN');
      expect(g.photos).toEqual([]);
      expect(g.deceasedPersons).toEqual([]);
      expect(typeof g.createdAt).toBe('string');
    }
  });
});

describe('partitionByExisting', () => {
  it('dodaje nowe, pomija istniejące po id', () => {
    const incoming = [makeGrave({ id: 'g1' }), makeGrave({ id: 'g2' }), makeGrave({ id: 'g3' })];
    const { toAdd, skippedExisting } = partitionByExisting(incoming, new Set(['g2']));
    expect(toAdd.map((g) => g.id)).toEqual(['g1', 'g3']);
    expect(skippedExisting).toBe(1);
  });
});
