export type RemoteAction = 'put' | 'delete' | 'skip';

/**
 * Co zrobić ze zmianą pobraną z mapy `spaceId`. Niewysłana lokalna zmiana wygrywa: nasza
 * wersja pojedzie przy najbliższym wysłaniu.
 *
 * Grób może leżeć w telefonie na innej mapie. Usunięcie z dawnej mapy go wtedy nie dotyczy
 * (przenieśliśmy go). Zapis z mapy `spaceId` oznacza zaś, że ktoś przeniósł grób tutaj —
 * przyjmujemy go, chyba że sami mamy niewysłaną zmianę tego grobu na jego obecnej mapie.
 * Bez tego grób przeniesiony przez inny telefon na mapę synchronizowaną wcześniej znikałby
 * (zapis pominięty, potem usunięcie z mapy, na której jeszcze leżał).
 */
export function decideRemoteChange(
  spaceId: string,
  change: { deleted: boolean; data: unknown },
  local: { spaceId: string } | undefined,
  queued: boolean,
  queuedInLocalSpace: boolean
): RemoteAction {
  if (queued) return 'skip';
  const deleted = change.deleted || !change.data;
  if (local && local.spaceId !== spaceId) {
    return deleted || queuedInLocalSpace ? 'skip' : 'put';
  }
  if (deleted) return local ? 'delete' : 'skip';
  return 'put';
}
