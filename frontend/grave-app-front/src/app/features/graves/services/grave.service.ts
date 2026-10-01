import { Injectable, signal, computed, effect, inject, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { getDistance, getRhumbLineBearing } from 'geolib';

import { IndexedDbService } from '../../../core/services/indexeddb.service';
import { SpaceService } from '../../../core/services/space.service';
import {
  Grave,
  GraveWithDistance,
  CreateGraveDto,
  UpdateGraveDto,
  SortOption,
} from '../../../shared/models/grave.model';

@Injectable({
  providedIn: 'root',
})
export class GraveService {
  private readonly spaces = inject(SpaceService);

  // Signals dla reactive state
  graves = signal<Grave[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = signal<string>('');
  sortBy = signal<SortOption>('name');

  // Computed values
  gravesCount = computed(() => this.graves().length);
  /** Aktywna mapa jest tylko do odczytu (usunięto z niej ten telefon). */
  readonly readOnly = computed(() => this.spaces.readOnly());

  filteredGraves = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allGraves = this.graves();

    if (!query) return allGraves;

    return allGraves.filter((grave) => {
      const searchableText = [
        grave.cemeteryName,
        grave.graveNumber,
        grave.sector,
        ...grave.deceasedPersons.map((p) => `${p.firstName} ${p.lastName}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  });

  constructor(private readonly db: IndexedDbService, private readonly http: HttpClient) {
    // Zmiana aktywnej mapy (także po migracji przy starcie) → wczytaj jej groby
    effect(() => {
      this.spaces.activeSpaceId();
      untracked(() => this.loadGraves());
    });
  }

  /**
   * Ładuje wszystkie groby z IndexedDB
   */
  async loadGraves(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const graves = await this.db.getGraves(this.spaces.activeSpaceId());
      this.graves.set(graves);
    } catch (error) {
      console.error('Error loading graves from DB', error);
      this.error.set('Nie udało się załadować grobów');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Pobiera pojedynczy grób po ID
   */
  async getGrave(id: string): Promise<Grave | undefined> {
    return this.db.getGrave(id);
  }

  /**
   * Dodaje nowy grób
   */
  async addGrave(dto: CreateGraveDto): Promise<Grave> {
    this.assertWritable();
    const newGrave: Grave = {
      id: crypto.randomUUID(),
      ...dto,
      currency: dto.currency || 'PLN',
      deceasedPersons: dto.deceasedPersons.map((person) => ({
        ...person,
        id: crypto.randomUUID(),
        graveId: '', // Will be set after grave creation
      })),
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Set graveId for deceased persons
    newGrave.deceasedPersons.forEach((person) => {
      person.graveId = newGrave.id;
    });

    await this.db.addGrave(newGrave, this.spaces.activeSpaceId());
    await this.loadGraves();

    // TODO: Sync with backend
    return newGrave;
  }

  /**
   * Aktualizuje istniejący grób
   */
  async updateGrave(id: string, dto: UpdateGraveDto): Promise<void> {
    this.assertWritable();
    const existingGrave = await this.getGrave(id);
    if (!existingGrave) {
      throw new Error('Grób nie znaleziony');
    }

    const updatedGrave: Grave = {
      ...existingGrave,
      latitude: dto.latitude ?? existingGrave.latitude,
      longitude: dto.longitude ?? existingGrave.longitude,
      accuracy: dto.accuracy ?? existingGrave.accuracy,
      cemeteryName: dto.cemeteryName ?? existingGrave.cemeteryName,
      graveNumber: dto.graveNumber ?? existingGrave.graveNumber,
      sector: dto.sector ?? existingGrave.sector,
      notes: dto.notes ?? existingGrave.notes,
      paymentDueDate: dto.paymentDueDate ?? existingGrave.paymentDueDate,
      lastPaymentAmount: dto.lastPaymentAmount ?? existingGrave.lastPaymentAmount,
      paymentPeriodMonths: dto.paymentPeriodMonths ?? existingGrave.paymentPeriodMonths,
      currency: dto.currency ?? existingGrave.currency,
      lastVisited: dto.lastVisited ?? existingGrave.lastVisited,
      updatedAt: new Date().toISOString(),
    };

    if (dto.deceasedPersons) {
      updatedGrave.deceasedPersons = dto.deceasedPersons.map((person) => ({
        ...person,
        id: crypto.randomUUID(),
        graveId: id,
      }));
    }

    await this.db.updateGrave(id, updatedGrave);
    await this.loadGraves();

    // TODO: Sync with backend
  }

  /**
   * Usuwa grób
   */
  async deleteGrave(id: string): Promise<void> {
    this.assertWritable();
    await this.db.deleteGrave(id);
    await this.loadGraves();

    // TODO: Sync with backend
  }

  /**
   * Wyszukuje groby po nazwisku osoby zmarłej
   */
  searchByName(query: string): void {
    this.searchQuery.set(query);
  }

  /**
   * Oblicza odległość do grobów od aktualnej pozycji
   */
  getGravesWithDistance(
    userLat: number,
    userLng: number,
    source: Grave[] = this.graves()
  ): GraveWithDistance[] {
    return source.map((grave) => {
      const distance = getDistance(
        { latitude: userLat, longitude: userLng },
        { latitude: grave.latitude, longitude: grave.longitude }
      );

      const bearing = getRhumbLineBearing(
        { latitude: userLat, longitude: userLng },
        { latitude: grave.latitude, longitude: grave.longitude }
      );

      return {
        ...grave,
        distance,
        bearing,
      };
    });
  }

  /**
   * Sortuje groby według wybranego kryterium
   */
  sortGraves(graves: Grave[], sortBy: SortOption): Grave[] {
    const sorted = [...graves];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => {
          const nameA = a.deceasedPersons[0]
            ? `${a.deceasedPersons[0].lastName} ${a.deceasedPersons[0].firstName}`
            : '';
          const nameB = b.deceasedPersons[0]
            ? `${b.deceasedPersons[0].lastName} ${b.deceasedPersons[0].firstName}`
            : '';
          return nameA.localeCompare(nameB, 'pl');
        });

      case 'date-added':
        return sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      case 'last-visited':
        return sorted.sort((a, b) => {
          if (!a.lastVisited) return 1;
          if (!b.lastVisited) return -1;
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
        });

      case 'distance':
        // Wymaga aktualnej lokalizacji - sortowanie w komponencie
        return sorted;

      default:
        return sorted;
    }
  }

  /**
   * Aktualizuje datę ostatniej wizyty
   */
  async markAsVisited(id: string): Promise<void> {
    await this.updateGrave(id, {
      lastVisited: new Date().toISOString(),
    });
  }

  /**
   * Pobiera groby z wygasającą opłatą (w najbliższym miesiącu)
   */
  getGravesWithPaymentDue(): Grave[] {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    return this.graves().filter((grave) => {
      if (!grave.paymentDueDate) return false;
      const dueDate = new Date(grave.paymentDueDate);
      return dueDate <= oneMonthFromNow && dueDate >= new Date();
    });
  }

  /**
   * Zmienia sposób sortowania
   */
  setSortBy(sortBy: SortOption): void {
    this.sortBy.set(sortBy);
  }

  /** Mapa, z której usunięto ten telefon, jest tylko do odczytu. */
  private assertWritable(): void {
    if (this.spaces.readOnly()) throw new Error('Ta mapa jest tylko do odczytu');
  }
}
