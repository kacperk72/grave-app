import { Grave, PhotoVariant } from '../models/grave.model';
import { LOCAL_SPACE_ID } from '../models/space.model';

/** Wpis do kolejki synchronizacji wynikający z przeniesienia grobu. */
export type QueueOp =
  | { table: 'grave'; spaceId: string; id: string; op: 'put' | 'delete' }
  | {
      table: 'photo';
      spaceId: string;
      photoId: string;
      variant: PhotoVariant | null;
      op: 'put' | 'delete';
    };

const isRemoteUrl = (url: string) => /^(https?:|data:)/.test(url);

/**
 * Przeniesienie grobu (ten sam id) z mapy `from` na `to`: na starej mapie usunięcie,
 * na nowej zapis. „Moje" nie ma kolejek — tam nic nie wysyłamy.
 */
export function moveQueueOps(grave: Grave, from: string, to: string): QueueOp[] {
  const ops: QueueOp[] = [];
  if (from === to) return ops;
  if (from !== LOCAL_SPACE_ID) {
    ops.push({ table: 'grave', spaceId: from, id: grave.id, op: 'delete' });
    for (const photo of grave.photos) {
      ops.push({ table: 'photo', spaceId: from, photoId: photo.id, variant: null, op: 'delete' });
    }
  }
  if (to !== LOCAL_SPACE_ID) {
    ops.push({ table: 'grave', spaceId: to, id: grave.id, op: 'put' });
    for (const photo of grave.photos) {
      for (const variant of ['full', 'thumb'] as const) {
        ops.push({ table: 'photo', spaceId: to, photoId: photo.id, variant, op: 'put' });
      }
    }
  }
  return ops;
}

export interface GraveCopy {
  grave: Grave;
  /** Pary [stare id zdjęcia, nowe id] — bajty do skopiowania w telefonie. */
  photoIds: [string, string][];
  /** Zdjęcia pominięte, bo telefon nie ma ich bajtów. */
  skippedPhotos: number;
}

/**
 * Kopia grobu na inną mapę: nowe id grobu, osób i zdjęć, żeby usunięcie w jednej mapie
 * nie skasowało niczego w drugiej. Zdjęcia bez bajtów w telefonie pomijamy.
 */
export function copyGrave(
  grave: Grave,
  hasBytes: (photoId: string) => boolean,
  newId: () => string = () => crypto.randomUUID(),
  now: string = new Date().toISOString()
): GraveCopy {
  const id = newId();
  const kept = grave.photos.filter((p) => isRemoteUrl(p.url) || hasBytes(p.id));
  const photoIds: [string, string][] = [];
  let photos = kept.map((p) => {
    const photoId = newId();
    if (!isRemoteUrl(p.url)) photoIds.push([p.id, photoId]);
    return { ...p, id: photoId, graveId: id };
  });
  if (photos.length > 0 && !photos.some((p) => p.isPrimary)) {
    photos = photos.map((p, i) => ({ ...p, isPrimary: i === 0 }));
  }
  const { updatedBy: _updatedBy, ...rest } = grave;
  return {
    grave: {
      ...rest,
      id,
      deceasedPersons: grave.deceasedPersons.map((p) => ({ ...p, id: newId(), graveId: id })),
      photos,
      updatedAt: now,
    },
    photoIds,
    skippedPhotos: grave.photos.length - kept.length,
  };
}
