import { Injectable, signal } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Grave } from '../../shared/models/grave.model';

export interface LocalGrave extends Grave {
  localId?: number; // Auto-increment dla IndexedDB
  syncStatus: 'synced' | 'pending' | 'conflict';
}

/**
 * Kolejka zmian do wysłania na rodzinną mapę. Jeden wpis na grób — liczy się
 * ostatnia operacja; treść grobu czytamy z tabeli `graves` dopiero przy wysyłce.
 */
export interface OutboxEntry {
  id: string;
  op: 'put' | 'delete';
  queuedAt: number;
}

export type PhotoVariant = 'full' | 'thumb';

/** Bajty zdjęcia trzymane w telefonie — dzięki temu zdjęcia działają bez zasięgu. */
export interface PhotoBlobEntry {
  key: string; // `${photoId}:${variant}`
  blob: Blob;
  cachedAt: number;
}

/** Kolejka wysyłki/usunięcia bajtów zdjęć na rodzinną mapę. */
export interface PhotoOutboxEntry {
  key: string; // `${photoId}:${variant}` albo `${photoId}:delete`
  photoId: string;
  variant: PhotoVariant | null;
  op: 'put' | 'delete';
  queuedAt: number;
}

/** Zmiana pobrana z serwera (rodzinnej mapy). */
export interface RemoteChange {
  id: string;
  deleted: boolean;
  data: Grave | null;
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService extends Dexie {
  graves!: Table<LocalGrave, string>;
  outbox!: Table<OutboxEntry, string>;
  photoBlobs!: Table<PhotoBlobEntry, string>;
  photoOutbox!: Table<PhotoOutboxEntry, string>;

  /** Rośnie przy każdej lokalnej zmianie — sygnał dla synchronizacji. */
  readonly localChanges = signal(0);

  constructor() {
    super('GraveMapDB');

    // Schema dla IndexedDB
    this.version(1).stores({
      graves: 'id, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
    });
    // v2: kolejka zmian dla rodzinnej mapy
    this.version(2).stores({
      graves: 'id, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
      outbox: 'id, queuedAt',
    });
    // v3: zdjęcia (bajty w telefonie) i ich kolejka wysyłki
    this.version(3).stores({
      graves: 'id, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
      outbox: 'id, queuedAt',
      photoBlobs: 'key',
      photoOutbox: 'key, queuedAt',
    });
  }

  /**
   * Dodaje nowy grób do lokalnej bazy
   */
  async addGrave(grave: Grave): Promise<string> {
    const localGrave: LocalGrave = {
      ...grave,
      syncStatus: 'pending',
    };
    await this.transaction('rw', this.graves, this.outbox, async () => {
      await this.graves.add(localGrave);
      await this.queue(grave.id, 'put');
    });
    this.notifyChange();
    return grave.id;
  }

  /**
   * Pobiera wszystkie groby z lokalnej bazy
   */
  async getGraves(): Promise<Grave[]> {
    const localGraves = await this.graves.toArray();
    // Usuwamy pola specyficzne dla IndexedDB
    return localGraves.map(({ localId, syncStatus, ...grave }) => grave);
  }

  /**
   * Pobiera pojedynczy grób po ID
   */
  async getGrave(id: string): Promise<Grave | undefined> {
    const localGrave = await this.graves.get(id);
    if (!localGrave) return undefined;

    const { localId, syncStatus, ...grave } = localGrave;
    return grave;
  }

  /**
   * Aktualizuje grób w lokalnej bazie
   */
  async updateGrave(id: string, changes: Partial<Grave>): Promise<void> {
    await this.transaction('rw', this.graves, this.outbox, async () => {
      await this.graves.update(id, {
        ...changes,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      });
      await this.queue(id, 'put');
    });
    this.notifyChange();
  }

  /**
   * Usuwa grób z lokalnej bazy
   */
  async deleteGrave(id: string): Promise<void> {
    await this.transaction('rw', this.graves, this.outbox, async () => {
      await this.graves.delete(id);
      await this.queue(id, 'delete');
    });
    this.notifyChange();
  }

  /**
   * Wyszukuje groby w określonym promieniu od współrzędnych
   */
  async getGravesNearby(lat: number, lng: number, radiusMeters: number = 1000): Promise<Grave[]> {
    const allGraves = await this.getGraves();

    // Proste filtrowanie - można ulepszyć używając geohash
    return allGraves.filter((grave) => {
      const latDiff = Math.abs(grave.latitude - lat);
      const lngDiff = Math.abs(grave.longitude - lng);
      const approxDistance = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111320; // Approx meters
      return approxDistance <= radiusMeters;
    });
  }

  /**
   * Pobiera groby oczekujące na synchronizację
   */
  async getPendingGraves(): Promise<LocalGrave[]> {
    return await this.graves.where('syncStatus').equals('pending').toArray();
  }

  /**
   * Oznacza grób jako zsynchronizowany
   */
  async markAsSynced(id: string): Promise<void> {
    await this.graves.update(id, { syncStatus: 'synced' });
  }

  /**
   * Czyści całą bazę (użycie ostrożnie!). Na rodzinnej mapie usunięcie trafia
   * też do kolejki — „zastąp wszystko z pliku" działa wtedy dla całej rodziny.
   */
  async clearAll(): Promise<void> {
    await this.transaction('rw', this.graves, this.outbox, async () => {
      const ids = (await this.graves.toCollection().primaryKeys()) as string[];
      await this.graves.clear();
      for (const id of ids) await this.queue(id, 'delete');
    });
    this.notifyChange();
  }

  // --- Kolejka zmian (rodzinna mapa) -------------------------------------

  /** Wstawia do kolejki wszystkie lokalne groby — przy tworzeniu mapy i dołączaniu. */
  async queueAllGraves(): Promise<void> {
    await this.transaction('rw', this.graves, this.outbox, async () => {
      const ids = (await this.graves.toCollection().primaryKeys()) as string[];
      for (const id of ids) await this.queue(id, 'put');
    });
    this.notifyChange();
  }

  async getOutbox(limit: number): Promise<OutboxEntry[]> {
    return this.outbox.orderBy('queuedAt').limit(limit).toArray();
  }

  async outboxCount(): Promise<number> {
    return this.outbox.count();
  }

  /**
   * Zdejmuje z kolejki wysłane wpisy — ale tylko te, których nikt w międzyczasie
   * nie zmienił (nowsza zmiana tego samego grobu musi jeszcze pojechać).
   */
  async removeFromOutbox(sent: OutboxEntry[]): Promise<void> {
    await this.transaction('rw', this.outbox, async () => {
      for (const entry of sent) {
        const current = await this.outbox.get(entry.id);
        if (current && current.queuedAt === entry.queuedAt) await this.outbox.delete(entry.id);
      }
    });
  }

  async clearOutbox(): Promise<void> {
    await this.outbox.clear();
  }

  /**
   * Nakłada zmiany z serwera. Grób z niewysłaną lokalną zmianą pomijamy —
   * nasza wersja pojedzie przy najbliższym wysłaniu i to ona wygra.
   */
  async applyRemoteChanges(changes: RemoteChange[]): Promise<boolean> {
    let touched = false;
    await this.transaction('rw', this.graves, this.outbox, async () => {
      for (const change of changes) {
        if (await this.outbox.get(change.id)) continue;
        if (change.deleted || !change.data) {
          await this.graves.delete(change.id);
        } else {
          await this.graves.put({ ...change.data, syncStatus: 'synced' });
        }
        touched = true;
      }
    });
    return touched;
  }

  // --- Zdjęcia ------------------------------------------------------------

  async getPhotoBlob(photoId: string, variant: PhotoVariant): Promise<Blob | undefined> {
    return (await this.photoBlobs.get(`${photoId}:${variant}`))?.blob;
  }

  /** Zapisuje bajty zdjęcia; `upload` = także wstaw do kolejki wysyłki na rodzinną mapę. */
  async putPhotoBlob(photoId: string, variant: PhotoVariant, blob: Blob, upload: boolean): Promise<void> {
    const key = `${photoId}:${variant}`;
    await this.transaction('rw', this.photoBlobs, this.photoOutbox, async () => {
      await this.photoBlobs.put({ key, blob, cachedAt: Date.now() });
      if (upload) {
        await this.photoOutbox.put({ key, photoId, variant, op: 'put', queuedAt: Date.now() + Math.random() });
      }
    });
    if (upload) this.notifyChange();
  }

  /** Usuwa bajty zdjęcia z telefonu i zleca usunięcie z rodzinnej mapy. */
  async deletePhoto(photoId: string): Promise<void> {
    await this.transaction('rw', this.photoBlobs, this.photoOutbox, async () => {
      await this.photoBlobs.bulkDelete([`${photoId}:full`, `${photoId}:thumb`]);
      await this.photoOutbox.bulkDelete([`${photoId}:full`, `${photoId}:thumb`]);
      await this.photoOutbox.put({
        key: `${photoId}:delete`,
        photoId,
        variant: null,
        op: 'delete',
        queuedAt: Date.now() + Math.random(),
      });
    });
    this.notifyChange();
  }

  async getPhotoOutbox(limit: number): Promise<PhotoOutboxEntry[]> {
    return this.photoOutbox.orderBy('queuedAt').limit(limit).toArray();
  }

  async photoOutboxCount(): Promise<number> {
    return this.photoOutbox.count();
  }

  async removeFromPhotoOutbox(sent: PhotoOutboxEntry[]): Promise<void> {
    await this.transaction('rw', this.photoOutbox, async () => {
      for (const entry of sent) {
        const current = await this.photoOutbox.get(entry.key);
        if (current && current.queuedAt === entry.queuedAt) await this.photoOutbox.delete(entry.key);
      }
    });
  }

  /** Wszystkie zdjęcia z telefonu do wysłania — przy tworzeniu mapy i dołączaniu. */
  async queueAllPhotoUploads(): Promise<void> {
    await this.transaction('rw', this.photoBlobs, this.photoOutbox, async () => {
      const keys = (await this.photoBlobs.toCollection().primaryKeys()) as string[];
      for (const key of keys) {
        const [photoId, variant] = key.split(':') as [string, PhotoVariant];
        await this.photoOutbox.put({ key, photoId, variant, op: 'put', queuedAt: Date.now() + Math.random() });
      }
    });
    this.notifyChange();
  }

  async clearPhotoOutbox(): Promise<void> {
    await this.photoOutbox.clear();
  }

  private async queue(id: string, op: OutboxEntry['op']): Promise<void> {
    await this.outbox.put({ id, op, queuedAt: Date.now() + Math.random() });
  }

  private notifyChange(): void {
    this.localChanges.update((n) => n + 1);
  }
}
