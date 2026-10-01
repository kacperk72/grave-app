import { describe, expect, it } from 'vitest';
import { decideRemoteChange } from './remote-change';

const put = { deleted: false, data: { id: 'g1' } };
const del = { deleted: true, data: null };

describe('decideRemoteChange', () => {
  it('nowy grób z serwera → put', () => expect(decideRemoteChange('A', put, undefined, false)).toBe('put'));
  it('grób tej mapy → put', () => expect(decideRemoteChange('A', put, { spaceId: 'A' }, false)).toBe('put'));
  it('niewysłana lokalna zmiana wygrywa → skip', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'A' }, true)).toBe('skip'));
  it('usunięcie grobu tej mapy → delete', () =>
    expect(decideRemoteChange('A', del, { spaceId: 'A' }, false)).toBe('delete'));
  it('usunięcie grobu, którego nie ma → skip', () =>
    expect(decideRemoteChange('A', del, undefined, false)).toBe('skip'));
  it('grób przeniesiony do innej mapy: usunięcie z A go nie rusza', () =>
    expect(decideRemoteChange('A', del, { spaceId: 'B' }, false)).toBe('skip'));
  it('grób przeniesiony do innej mapy: stary zapis z A go nie nadpisuje', () =>
    expect(decideRemoteChange('A', put, { spaceId: 'B' }, false)).toBe('skip'));
  it('zapis bez danych traktujemy jak usunięcie', () =>
    expect(decideRemoteChange('A', { deleted: false, data: null }, { spaceId: 'A' }, false)).toBe(
      'delete'
    ));
});
