import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Grave } from '../../shared/models/grave.model';

export interface LocalGrave extends Grave {
  localId?: number; // Auto-increment dla IndexedDB
  syncStatus: 'synced' | 'pending' | 'conflict';
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService extends Dexie {
  graves!: Table<LocalGrave, string>;

  constructor() {
    super('GraveMapDB');

    // Schema dla IndexedDB
    this.version(1).stores({
      graves: 'id, cemeteryName, syncStatus, createdAt, [latitude+longitude]',
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
    await this.graves.add(localGrave);
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
    await this.graves.update(id, {
      ...changes,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });
  }

  /**
   * Usuwa grób z lokalnej bazy
   */
  async deleteGrave(id: string): Promise<void> {
    await this.graves.delete(id);
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
   * Czyści całą bazę (użycie ostrożnie!)
   */
  async clearAll(): Promise<void> {
    await this.graves.clear();
  }
}
