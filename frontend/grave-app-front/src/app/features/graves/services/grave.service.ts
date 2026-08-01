import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { getDistance, getRhumbLineBearing } from 'geolib';

import { IndexedDbService } from '../../../core/services/indexeddb.service';
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
  // Signals dla reactive state
  graves = signal<Grave[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = signal<string>('');
  sortBy = signal<SortOption>('name');

  // Computed values
  gravesCount = computed(() => this.graves().length);

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
    this.loadGraves();
  }

  /**
   * Generuje mockowe dane grobów w okolicy podanych współrzędnych
   */
  async generateMockGraves(centerLat: number, centerLng: number, count: number = 8): Promise<void> {
    const mockGraves: Grave[] = [];

    const polishNames = [
      { firstName: 'Jan', lastName: 'Kowalski', birthYear: 1945, deathYear: 2020 },
      { firstName: 'Maria', lastName: 'Nowak', birthYear: 1952, deathYear: 2018 },
      { firstName: 'Józef', lastName: 'Wiśniewski', birthYear: 1938, deathYear: 2015 },
      { firstName: 'Anna', lastName: 'Wójcik', birthYear: 1960, deathYear: 2022 },
      { firstName: 'Stanisław', lastName: 'Kowalczyk', birthYear: 1935, deathYear: 2019 },
      { firstName: 'Krystyna', lastName: 'Kamińska', birthYear: 1948, deathYear: 2021 },
      { firstName: 'Piotr', lastName: 'Lewandowski', birthYear: 1955, deathYear: 2023 },
      { firstName: 'Teresa', lastName: 'Dąbrowska', birthYear: 1942, deathYear: 2017 },
    ];

    const cemeteries = [
      'Cmentarz Rakowicki',
      'Cmentarz Podgórski',
      'Cmentarz Salwatorski',
      'Cmentarz Batowicki',
    ];

    for (let i = 0; i < Math.min(count, polishNames.length); i++) {
      const person = polishNames[i];

      // Generowanie losowych współrzędnych w okolicy (10-50 metrów)
      const offsetMeters = 10 + Math.random() * 40; // 10-50 metrów
      const angle = Math.random() * 2 * Math.PI; // Losowy kąt

      // 1 metr ≈ 0.00001 stopnia szerokości geograficznej
      // 1 metr ≈ 0.000014 stopnia długości geograficznej (na tej szerokości)
      const latOffset = (offsetMeters * Math.sin(angle)) / 111000;
      const lngOffset =
        (offsetMeters * Math.cos(angle)) / (111000 * Math.cos((centerLat * Math.PI) / 180));

      const grave: Grave = {
        id: crypto.randomUUID(),
        cemeteryName: cemeteries[i % cemeteries.length],
        sector: `Sektor ${Math.floor(Math.random() * 50) + 1}`,
        graveNumber: `${Math.floor(Math.random() * 100) + 1}`,
        latitude: centerLat + latOffset,
        longitude: centerLng + lngOffset,
        lastPaymentAmount: Math.floor(Math.random() * 300) + 100,
        currency: 'PLN',
        paymentPeriodMonths: 12,
        paymentDueDate: new Date(
          2024,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ).toISOString(),
        lastVisited: new Date(
          2023,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ).toISOString(),
        notes: `Grób rodzinny ${person.lastName}`,
        deceasedPersons: [
          {
            id: crypto.randomUUID(),
            graveId: '',
            firstName: person.firstName,
            lastName: person.lastName,
            birthDate: new Date(
              person.birthYear,
              Math.floor(Math.random() * 12),
              Math.floor(Math.random() * 28) + 1
            ).toISOString(),
            deathDate: new Date(
              person.deathYear,
              Math.floor(Math.random() * 12),
              Math.floor(Math.random() * 28) + 1
            ).toISOString(),
          },
        ],
        photos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGraves.push(grave);
    }

    // Zapisz wszystkie mockowe groby do IndexedDB
    for (const grave of mockGraves) {
      try {
        await this.db.addGrave(grave);
      } catch (error) {
        console.error('Error adding mock grave:', error);
      }
    }

    // Przeładuj groby po dodaniu mockowych danych
    await this.loadGraves();
    console.log(
      `✅ Dodano ${mockGraves.length} mockowych grobów w okolicy ${centerLat}, ${centerLng}`
    );
  }

  /**
   * Ładuje wszystkie groby z IndexedDB
   */
  async loadGraves(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const graves = await this.db.getGraves();
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

    await this.db.addGrave(newGrave);
    await this.loadGraves();

    // TODO: Sync with backend
    return newGrave;
  }

  /**
   * Aktualizuje istniejący grób
   */
  async updateGrave(id: string, dto: UpdateGraveDto): Promise<void> {
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
}
