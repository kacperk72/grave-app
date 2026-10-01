import { pluralPl } from './grave-display';
import { relativeTime } from './member-display';
import type { SpaceSync } from '../../core/services/family-sync.service';

/** Jedna linijka stanu mapy pod jej nazwą (Ustawienia, panel mapy, przełącznik). */
export function syncStatusText(sync: SpaceSync, syncedAt: number | null, now = Date.now()): string {
  const pending =
    sync.pending > 0
      ? `${sync.pending} ${pluralPl(sync.pending, 'zmiana czeka', 'zmiany czekają', 'zmian czeka')}`
      : '';
  const withPending = (text: string) => (pending ? `${text} · ${pending}` : text);
  switch (sync.state) {
    case 'syncing':
      return 'Synchronizuję…';
    case 'offline':
      return withPending('Bez internetu');
    case 'removed':
      return 'Nie masz już dostępu — tylko do odczytu';
    case 'error':
    case 'revoked':
      return sync.error ?? 'Błąd synchronizacji';
    default:
      return withPending(
        syncedAt ? `Zsynchronizowano ${relativeTime(syncedAt, now)}` : 'Czeka na synchronizację'
      );
  }
}
