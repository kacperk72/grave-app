export type RemoteAction = 'put' | 'delete' | 'skip';

/**
 * Co zrobić ze zmianą pobraną z mapy `spaceId`. Grób może już leżeć w telefonie na innej
 * mapie (przeniesiony) — wtedy spóźniona zmiana z dawnej mapy go nie dotyczy.
 * Niewysłana lokalna zmiana wygrywa: nasza wersja pojedzie przy najbliższym wysłaniu.
 */
export function decideRemoteChange(
  spaceId: string,
  change: { deleted: boolean; data: unknown },
  local: { spaceId: string } | undefined,
  queued: boolean
): RemoteAction {
  if (queued) return 'skip';
  if (local && local.spaceId !== spaceId) return 'skip';
  if (change.deleted || !change.data) return local ? 'delete' : 'skip';
  return 'put';
}
