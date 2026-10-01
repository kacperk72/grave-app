import { describe, expect, it } from 'vitest';
import { decideRemoteChange } from './remote-change';

const put = { deleted: false, data: { id: 'g1' } };
const del = { deleted: true, data: null };

describe('decideRemoteChange', () => {
  it('nowy grób z serwera → put', () =>
    expect(decideRemoteChange('A', put, undefined, false, false)).toBe('put'));
  it('grób tej mapy → put', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'A' }, false, false)).toBe('put'));
  it('niewysłana lokalna zmiana wygrywa → skip', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'A' }, true, false)).toBe('skip'));
  it('usunięcie grobu tej mapy → delete', () =>
    expect(decideRemoteChange('A', del, { spaceId: 'A' }, false, false)).toBe('delete'));
  it('usunięcie grobu, którego nie ma → skip', () =>
    expect(decideRemoteChange('A', del, undefined, false, false)).toBe('skip'));
  it('grób przeniesiony do innej mapy: usunięcie z A go nie rusza', () =>
    expect(decideRemoteChange('A', del, { spaceId: 'B' }, false, false)).toBe('skip'));
  it('ktoś przeniósł grób z B na A: zapis z A przenosi go i tutaj (bez niewysłanych zmian w B)', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'B' }, false, false)).toBe('put'));
  it('nasze niewysłane przeniesienie do B wygrywa ze zapisem z A', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'B' }, false, true)).toBe('skip'));
  it('zapis bez danych traktujemy jak usunięcie', () =>
    expect(
      decideRemoteChange('A', { deleted: false, data: null }, { spaceId: 'A' }, false, false)
    ).toBe('delete'));
});
