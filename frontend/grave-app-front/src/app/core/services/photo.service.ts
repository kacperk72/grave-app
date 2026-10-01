import { Injectable, inject } from '@angular/core';

import { IndexedDbService, PhotoVariant } from './indexeddb.service';
import { FamilySyncService } from './family-sync.service';
import { SpaceService } from './space.service';
import { LOCAL_SPACE_ID } from '../../shared/models/space.model';
import { GraveService } from '../../features/graves/services/grave.service';
import { GravePhoto } from '../../shared/models/grave.model';

/** Dłuższy bok zdjęcia po zmniejszeniu — wystarcza do obejrzenia napisu na nagrobku. */
const FULL_MAX_PX = 1600;
const THUMB_MAX_PX = 480;
const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;

/**
 * Zdjęcia grobów. Bajty trzymamy w telefonie (IndexedDB), więc zdjęcia są widoczne
 * bez zasięgu; na rodzinnej mapie dodatkowo leżą w Workers KV i synchronizują się z grobem.
 * W danych grobu (`grave.photos`) jest tylko opis zdjęcia — id, kolejność, główne.
 */
@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly db = inject(IndexedDbService);
  private readonly family = inject(FamilySyncService);
  private readonly graveService = inject(GraveService);
  private readonly spaces = inject(SpaceService);

  /** Adresy `blob:` już wczytanych zdjęć — żeby nie czytać ich z bazy przy każdym widoku. */
  private readonly urls = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string | undefined>>();

  /** Adres do `<img src>`; najpierw z telefonu, potem z rodzinnej mapy. */
  url(photo: GravePhoto, variant: PhotoVariant): Promise<string | undefined> {
    // Starsze wpisy mogą mieć zwykły adres internetowy
    if (/^(https?:|data:)/.test(photo.url)) {
      return Promise.resolve(variant === 'thumb' ? photo.thumbnailUrl || photo.url : photo.url);
    }
    const key = `${photo.id}:${variant}`;
    const cached = this.urls.get(key);
    if (cached) return Promise.resolve(cached);
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const load = (async () => {
      let blob = await this.db.getPhotoBlob(photo.id, variant);
      if (!blob) {
        blob =
          (await this.family
            .fetchPhoto(this.spaces.activeSpaceId(), photo.id, variant)
            .catch(() => null)) ?? undefined;
        if (blob) await this.db.putPhotoBlob(photo.id, variant, blob, null);
      }
      // Miniatury jeszcze nie ma (np. tuż po dodaniu na innym telefonie) — pokaż pełne
      if (!blob && variant === 'thumb') return this.url(photo, 'full');
      if (!blob) return undefined;
      const url = URL.createObjectURL(blob);
      this.urls.set(key, url);
      return url;
    })().finally(() => this.pending.delete(key));

    this.pending.set(key, load);
    return load;
  }

  /** Dodaje zdjęcie do grobu. Pierwsze zdjęcie grobu staje się główne. */
  async addPhoto(graveId: string, file: File): Promise<void> {
    const grave = await this.db.getGrave(graveId);
    if (!grave) throw new Error('Nie znaleziono grobu');

    const [full, thumb] = await Promise.all([
      resize(file, FULL_MAX_PX, FULL_QUALITY),
      resize(file, THUMB_MAX_PX, THUMB_QUALITY),
    ]);
    const photoId = crypto.randomUUID();
    const spaceId = (await this.db.getGraveSpaceId(graveId)) ?? LOCAL_SPACE_ID;
    // Najpierw bajty, potem wpis w grobie — synchronizacja wyśle je w tej kolejności
    await this.db.putPhotoBlob(photoId, 'full', full, spaceId);
    await this.db.putPhotoBlob(photoId, 'thumb', thumb, spaceId);

    const photo: GravePhoto = {
      id: photoId,
      url: '',
      isPrimary: grave.photos.length === 0,
      graveId,
      uploadedAt: new Date().toISOString(),
    };
    await this.db.updateGrave(graveId, { photos: [...grave.photos, photo] });
    await this.graveService.loadGraves();
  }

  /** Usuwa zdjęcie; gdy było główne, główne staje się następne. */
  async removePhoto(graveId: string, photoId: string): Promise<void> {
    const grave = await this.db.getGrave(graveId);
    if (!grave) return;
    const removed = grave.photos.find((p) => p.id === photoId);
    let photos = grave.photos.filter((p) => p.id !== photoId);
    if (removed?.isPrimary && photos.length > 0) {
      photos = photos.map((p, i) => ({ ...p, isPrimary: i === 0 }));
    }
    await this.db.updateGrave(graveId, { photos });
    await this.db.deletePhoto(photoId, (await this.db.getGraveSpaceId(graveId)) ?? LOCAL_SPACE_ID);
    for (const variant of ['full', 'thumb']) {
      const url = this.urls.get(`${photoId}:${variant}`);
      if (url) URL.revokeObjectURL(url);
      this.urls.delete(`${photoId}:${variant}`);
    }
    await this.graveService.loadGraves();
  }
}

/**
 * Zmniejsza zdjęcie z aparatu (zwykle 8–12 MB) do JPEG o dłuższym boku `maxPx`.
 * `imageOrientation: 'from-image'` obraca je zgodnie z EXIF, więc pionowe
 * zdjęcia z telefonu nie kładą się na bok.
 */
async function resize(file: Blob, maxPx: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Przeglądarka nie obsługuje zmniejszania zdjęć');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Nie udało się przetworzyć zdjęcia'))),
      'image/jpeg',
      quality
    )
  );
}
