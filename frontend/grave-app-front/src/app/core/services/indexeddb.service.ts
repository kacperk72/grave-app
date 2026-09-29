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

  private async queue(id: string, op: OutboxEntry['op']): Promise<void> {
    await this.outbox.put({ id, op, queuedAt: Date.now() + Math.random() });
  }

  private notifyChange(): void {
    this.localChanges.update((n) => n + 1);
  }
}
