import { Injectable, signal } from '@angular/core';
import Dexie, { Table } from 'dexie';

import { Grave } from '../../shared/models/grave.model';
import type { PhotoVariant } from '../../shared/models/grave.model';
import { LOCAL_SPACE_ID, LocalSpace, localSpace } from '../../shared/models/space.model';
import { planSpaceMigration, readLegacyFamily } from '../../shared/utils/space-migration';
import { decideRemoteChange } from '../../shared/utils/remote-change';
import { QueueOp, copyGrave, moveQueueOps } from '../../shared/utils/grave-transfer';

export type { PhotoVariant } from '../../shared/models/grave.model';

export interface LocalGrave extends Grave {
  localId?: number;
  /** Mapa, do której należy grób (`local` = „Moje"). */
  spaceId: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

/**
 * Kolejka zmian grobów do wysłania na rodzinną mapę. Jeden wpis na grób i mapę — liczy się
 * ostatnia operacja; treść grobu czytamy z tabeli `graves` dopiero przy wysyłce.
 */
export interface GraveQueueEntry {
  spaceId: string;
  id: string;
  op: 'put' | 'delete';
  queuedAt: number;
}

/** Bajty zdjęcia trzymane w telefonie — dzięki temu zdjęcia działają bez zasięgu. */
export interface PhotoBlobEntry {
  key: string; // `${photoId}:${variant}`
  blob: Blob;
  cachedAt: number;
}

/** Kolejka wysyłki/usunięcia bajtów zdjęć na rodzinną mapę. */
export interface PhotoQueueEntry {
  spaceId: string;
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
  updatedBy?: string | null;
}

/** Aktywna mapa — zapisuje ją migracja v4, czyta `SpaceService`. */
export const ACTIVE_SPACE_KEY = 'gravemap-active-space';

const synced = (spaceId: string) => spaceId !== LOCAL_SPACE_ID;
const stamp = () => Date.now() + Math.random();

function toGrave(row: LocalGrave): Grave {
  const { localId, syncStatus, spaceId, ...grave } = row;
  return grave;
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService extends Dexie {
  graves!: Table<LocalGrave, string>;
  spaces!: Table<LocalSpace, string>;
  graveQueue!: Table<GraveQueueEntry, [string, string]>;
  photoBlobs!: Table<PhotoBlobEntry, string>;
  photoQueue!: Table<PhotoQueueEntry, [string, string]>;

  /** Rośnie przy każdej lokalnej zmianie — sygnał dla synchronizacji. */
  readonly localChanges = signal(0);

  constructor() {
    super('GraveMapDB');

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
    // v4: wiele map w jednym telefonie. Kolejki mają klucz złożony [mapa+id] — przeniesiony
    // grób ma naraz „usuń" w starej mapie i „zapisz" w nowej. Dexie nie zmienia klucza
    // istniejącej tabeli, więc kolejki to nowe tabele; stare usuwa v5.
    this.version(4)
      .stores({
        graves: 'id, spaceId, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
        outbox: 'id, queuedAt',
        photoBlobs: 'key',
        photoOutbox: 'key, queuedAt',
        spaces: 'id, serverId',
        graveQueue: '[spaceId+id], spaceId, queuedAt',
        photoQueue: '[spaceId+key], spaceId, queuedAt',
      })
      .upgrade(async (tx) => {
        const plan = planSpaceMigration(readLegacyFamily(safeStorage()));
        await tx.table('spaces').bulkPut(plan.spaces);
        await tx
          .table('graves')
          .toCollection()
          .modify((g: LocalGrave) => {
            g.spaceId = plan.targetSpaceId;
          });
        if (plan.keepQueues) {
          const graves = await tx.table('outbox').toArray();
          await tx
            .table('graveQueue')
            .bulkPut(graves.map((e) => ({ ...e, spaceId: plan.targetSpaceId })));
          const photos = await tx.table('photoOutbox').toArray();
          await tx
            .table('photoQueue')
            .bulkPut(photos.map((e) => ({ ...e, spaceId: plan.targetSpaceId })));
        }
        try {
          safeStorage()?.setItem(ACTIVE_SPACE_KEY, plan.targetSpaceId);
        } catch {
          // bez localStorage aktywna będzie „Moje"
        }
      });
    // v5: kolejki przeniesione w v4
    this.version(5).stores({ outbox: null, photoOutbox: null });

    // Świeża instalacja: od razu „Moje"
    this.on('populate', (tx) => {
      tx.table('spaces').add(localSpace());
    });
  }

  // --- Mapy ----------------------------------------------------------------

  async ensureLocalSpace(): Promise<void> {
    if (!(await this.spaces.get(LOCAL_SPACE_ID))) await this.spaces.put(localSpace());
  }

  getSpaces(): Promise<LocalSpace[]> {
    return this.spaces.toArray();
  }

  async putSpace(space: LocalSpace): Promise<void> {
    await this.spaces.put(space);
  }

  async updateSpace(id: string, changes: Partial<LocalSpace>): Promise<void> {
    await this.spaces.update(id, changes);
  }

  // --- Groby ---------------------------------------------------------------

  async getGraves(spaceId: string): Promise<Grave[]> {
    return (await this.graves.where('spaceId').equals(spaceId).toArray()).map(toGrave);
  }

  async graveIds(spaceId: string): Promise<string[]> {
    return (await this.graves.where('spaceId').equals(spaceId).primaryKeys()) as string[];
  }

  /** Id wszystkich grobów w telefonie (klucz grobu jest wspólny dla wszystkich map). */
  async allGraveIds(): Promise<Set<string>> {
    return new Set((await this.graves.toCollection().primaryKeys()) as string[]);
  }

  async countBySpace(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    await this.graves.each((g) => {
      counts[g.spaceId] = (counts[g.spaceId] ?? 0) + 1;
    });
    return counts;
  }

  async getGrave(id: string): Promise<Grave | undefined> {
    const row = await this.graves.get(id);
    return row ? toGrave(row) : undefined;
  }

  async getGraveSpaceId(id: string): Promise<string | undefined> {
    return (await this.graves.get(id))?.spaceId;
  }

  /** Grób do wysłania na mapę `spaceId`; undefined, gdy grobu nie ma albo jest już na innej mapie. */
  async getGraveForSync(id: string, spaceId: string): Promise<Grave | undefined> {
    const row = await this.graves.get(id);
    if (!row || row.spaceId !== spaceId) return undefined;
    const { updatedBy, ...grave } = toGrave(row);
    return grave;
  }

  async addGrave(grave: Grave, spaceId: string): Promise<string> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      await this.graves.add({ ...grave, spaceId, syncStatus: 'pending' });
      await this.queueGrave(spaceId, grave.id, 'put');
    });
    this.notifyChange();
    return grave.id;
  }

  async updateGrave(id: string, changes: Partial<Grave>): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      const row = await this.graves.get(id);
      if (!row) return;
      await this.graves.update(id, {
        ...changes,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      });
      await this.queueGrave(row.spaceId, id, 'put');
    });
    this.notifyChange();
  }

  async deleteGrave(id: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      const row = await this.graves.get(id);
      if (!row) return;
      await this.graves.delete(id);
      await this.queueGrave(row.spaceId, id, 'delete');
    });
    this.notifyChange();
  }

  /**
   * Czyści groby jednej mapy. Na rodzinnej mapie usunięcia trafiają do kolejki —
   * „zastąp wszystko z pliku" działa wtedy dla całej rodziny.
   */
  async clearAll(spaceId: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      const ids = await this.graveIds(spaceId);
      await this.graves.bulkDelete(ids);
      for (const id of ids) await this.queueGrave(spaceId, id, 'delete');
    });
    this.notifyChange();
  }

  // --- Kolejki (rodzinne mapy) -------------------------------------------

  async getGraveQueue(spaceId: string, limit: number): Promise<GraveQueueEntry[]> {
    return (await this.graveQueue.where('spaceId').equals(spaceId).sortBy('queuedAt')).slice(
      0,
      limit
    );
  }

  /** Zdejmuje wysłane wpisy — tylko te, których nikt w międzyczasie nie zmienił. */
  async removeFromGraveQueue(sent: GraveQueueEntry[]): Promise<void> {
    await this.transaction('rw', this.graveQueue, async () => {
      for (const entry of sent) {
        const current = await this.graveQueue.get([entry.spaceId, entry.id]);
        if (current && current.queuedAt === entry.queuedAt) {
          await this.graveQueue.delete([entry.spaceId, entry.id]);
        }
      }
    });
  }

  async queueCount(spaceId: string): Promise<number> {
    const graves = await this.graveQueue.where('spaceId').equals(spaceId).count();
    const photos = await this.photoQueue.where('spaceId').equals(spaceId).count();
    return graves + photos;
  }

  /** Nakłada zmiany pobrane z mapy `spaceId` (zasady w `decideRemoteChange`). */
  async applyRemoteChanges(spaceId: string, changes: RemoteChange[]): Promise<boolean> {
    let touched = false;
    await this.transaction('rw', this.graves, this.graveQueue, async () => {
      for (const change of changes) {
        const local = await this.graves.get(change.id);
        const queued = !!(await this.graveQueue.get([spaceId, change.id]));
        const queuedInLocalSpace =
          !!local &&
          local.spaceId !== spaceId &&
          !!(await this.graveQueue.get([local.spaceId, change.id]));
        const action = decideRemoteChange(spaceId, change, local, queued, queuedInLocalSpace);
        if (action === 'delete') await this.graves.delete(change.id);
        if (action === 'put' && change.data) {
          await this.graves.put({
            ...change.data,
            updatedBy: change.updatedBy ?? null,
            spaceId,
            syncStatus: 'synced',
          });
        }
        if (action !== 'skip') touched = true;
      }
    });
    return touched;
  }

  // --- Zdjęcia -------------------------------------------------------------

  async getPhotoBlob(photoId: string, variant: PhotoVariant): Promise<Blob | undefined> {
    return (await this.photoBlobs.get(`${photoId}:${variant}`))?.blob;
  }

  async hasPhotoBlob(photoId: string, variant: PhotoVariant): Promise<boolean> {
    return (await this.photoBlobs.where('key').equals(`${photoId}:${variant}`).count()) > 0;
  }

  /** Zapisuje bajty zdjęcia; `uploadTo` = mapa, na którą je wysłać (null = tylko w telefonie). */
  async putPhotoBlob(
    photoId: string,
    variant: PhotoVariant,
    blob: Blob,
    uploadTo: string | null
  ): Promise<void> {
    await this.transaction('rw', this.photoBlobs, this.photoQueue, async () => {
      await this.photoBlobs.put({ key: `${photoId}:${variant}`, blob, cachedAt: Date.now() });
      if (uploadTo) await this.queuePhoto(uploadTo, photoId, variant, 'put');
    });
    if (uploadTo && synced(uploadTo)) this.notifyChange();
  }

  /** Usuwa bajty zdjęcia z telefonu i zleca usunięcie z mapy grobu. */
  async deletePhoto(photoId: string, spaceId: string): Promise<void> {
    await this.transaction('rw', this.photoBlobs, this.photoQueue, async () => {
      await this.photoBlobs.bulkDelete([`${photoId}:full`, `${photoId}:thumb`]);
      await this.queuePhoto(spaceId, photoId, null, 'delete');
    });
    this.notifyChange();
  }

  async getPhotoQueue(spaceId: string, limit: number): Promise<PhotoQueueEntry[]> {
    return (await this.photoQueue.where('spaceId').equals(spaceId).sortBy('queuedAt')).slice(
      0,
      limit
    );
  }

  async removeFromPhotoQueue(sent: PhotoQueueEntry[]): Promise<void> {
    await this.transaction('rw', this.photoQueue, async () => {
      for (const entry of sent) {
        const current = await this.photoQueue.get([entry.spaceId, entry.key]);
        if (current && current.queuedAt === entry.queuedAt) {
          await this.photoQueue.delete([entry.spaceId, entry.key]);
        }
      }
    });
  }

  // --- Przenoszenie, kopie, porzucanie map --------------------------------

  /** Przenosi groby (te same id) na mapę `to`, z wpisami do kolejek obu map. */
  async moveGraves(ids: string[], to: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, this.photoQueue, async () => {
      for (const id of ids) {
        const row = await this.graves.get(id);
        if (!row || row.spaceId === to) continue;
        await this.applyQueueOps(moveQueueOps(toGrave(row), row.spaceId, to));
        await this.graves.update(id, { spaceId: to, updatedBy: null, syncStatus: 'pending' });
      }
    });
    this.notifyChange();
  }

  /** Kopia grobu na mapę `to` z nowymi id; zdjęcia bez bajtów w telefonie są pomijane. */
  async copyGraveTo(id: string, to: string): Promise<{ id: string; skippedPhotos: number }> {
    const row = await this.graves.get(id);
    if (!row) throw new Error('Nie znaleziono grobu');
    const blobKeys = new Set((await this.photoBlobs.toCollection().primaryKeys()) as string[]);
    const copy = copyGrave(toGrave(row), (photoId) => blobKeys.has(`${photoId}:full`));

    await this.transaction(
      'rw',
      [this.graves, this.graveQueue, this.photoBlobs, this.photoQueue],
      async () => {
        await this.graves.add({ ...copy.grave, spaceId: to, syncStatus: 'pending' });
        await this.queueGrave(to, copy.grave.id, 'put');
        for (const [fromId, toId] of copy.photoIds) {
          for (const variant of ['full', 'thumb'] as const) {
            const blob = (await this.photoBlobs.get(`${fromId}:${variant}`))?.blob;
            if (!blob) continue;
            await this.photoBlobs.put({ key: `${toId}:${variant}`, blob, cachedAt: Date.now() });
            await this.queuePhoto(to, toId, variant, 'put');
          }
        }
      }
    );
    this.notifyChange();
    return { id: copy.grave.id, skippedPhotos: copy.skippedPhotos };
  }

  /** Przenosi wszystkie groby mapy `from` do `to` BEZ wysyłania (kopia po wyjściu z mapy). */
  async reassignSpace(from: string, to: string): Promise<void> {
    await this.transaction('rw', this.graves, this.graveQueue, this.photoQueue, async () => {
      await this.graves.where('spaceId').equals(from).modify({ spaceId: to, updatedBy: null });
      await this.clearQueues(from);
    });
    this.notifyChange();
  }

  /** Usuwa z telefonu mapę, jej groby, bajty ich zdjęć i kolejki. */
  async deleteSpaceData(spaceId: string): Promise<void> {
    await this.transaction(
      'rw',
      [this.graves, this.photoBlobs, this.graveQueue, this.photoQueue, this.spaces],
      async () => {
        const rows = await this.graves.where('spaceId').equals(spaceId).toArray();
        const photoKeys = rows.flatMap((g) =>
          g.photos.flatMap((p) => [`${p.id}:full`, `${p.id}:thumb`])
        );
        await this.photoBlobs.bulkDelete(photoKeys);
        await this.graves.bulkDelete(rows.map((g) => g.id));
        await this.clearQueues(spaceId);
        await this.spaces.delete(spaceId);
      }
    );
    this.notifyChange();
  }

  // --- Wewnętrzne ----------------------------------------------------------

  private async applyQueueOps(ops: QueueOp[]): Promise<void> {
    for (const op of ops) {
      if (op.table === 'grave') await this.queueGrave(op.spaceId, op.id, op.op);
      else await this.queuePhoto(op.spaceId, op.photoId, op.variant, op.op);
    }
  }

  private async clearQueues(spaceId: string): Promise<void> {
    await this.graveQueue.where('spaceId').equals(spaceId).delete();
    await this.photoQueue.where('spaceId').equals(spaceId).delete();
  }

  private async queueGrave(spaceId: string, id: string, op: GraveQueueEntry['op']): Promise<void> {
    if (!synced(spaceId)) return;
    await this.graveQueue.put({ spaceId, id, op, queuedAt: stamp() });
  }

  private async queuePhoto(
    spaceId: string,
    photoId: string,
    variant: PhotoVariant | null,
    op: PhotoQueueEntry['op']
  ): Promise<void> {
    if (!synced(spaceId)) return;
    if (op === 'delete') {
      // Niewysłane bajty usuwanego zdjęcia nie mają już sensu
      await this.photoQueue.bulkDelete([
        [spaceId, `${photoId}:full`],
        [spaceId, `${photoId}:thumb`],
      ]);
    }
    const key = variant ? `${photoId}:${variant}` : `${photoId}:delete`;
    await this.photoQueue.put({ spaceId, key, photoId, variant, op, queuedAt: stamp() });
  }

  private notifyChange(): void {
    this.localChanges.update((n) => n + 1);
  }
}
