import { describe, expect, it } from 'vitest';
import { syncStatusText } from './sync-status';

const NOW = Date.UTC(2026, 9, 1, 12);

describe('syncStatusText', () => {
  it('synchronizuję', () =>
    expect(syncStatusText({ state: 'syncing', error: null, pending: 0 }, null, NOW)).toBe(
      'Synchronizuję…'
    ));
  it('bez internetu z kolejką', () =>
    expect(syncStatusText({ state: 'offline', error: null, pending: 3 }, null, NOW)).toBe(
      'Bez internetu · 3 zmiany czekają'
    ));
  it('błąd pokazuje komunikat', () =>
    expect(syncStatusText({ state: 'error', error: 'Limit', pending: 0 }, null, NOW)).toBe('Limit'));
  it('usunięty z mapy', () =>
    expect(syncStatusText({ state: 'removed', error: null, pending: 0 }, null, NOW)).toBe(
      'Nie masz już dostępu — tylko do odczytu'
    ));
  it('zsynchronizowano', () =>
    expect(syncStatusText({ state: 'idle', error: null, pending: 0 }, NOW - 5 * 60_000, NOW)).toBe(
      'Zsynchronizowano 5 min temu'
    ));
  it('jeszcze nie synchronizowano', () =>
    expect(syncStatusText({ state: 'off', error: null, pending: 1 }, null, NOW)).toBe(
      'Czeka na synchronizację · 1 zmiana czeka'
    ));
});
