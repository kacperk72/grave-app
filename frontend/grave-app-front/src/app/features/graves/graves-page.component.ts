import { Component, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

import { GraveService } from './services/grave.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { GravesListComponent } from './components/graves-list/graves-list.component';
import { GraveWithDistance, SortOption } from '../../shared/models/grave.model';

/**
 * Strona główna modułu grobów
 * Wyświetla listę wszystkich grobów z możliwością wyszukiwania i sortowania
 */
@Component({
  selector: 'app-graves-page',
  imports: [
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    GravesListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="graves-page">
      <!-- Header z wyszukiwaniem -->
      <section class="graves-header">
        <div class="header-content">
          <h1>Moje groby</h1>
          <p class="graves-count">{{ displayedGraves().length }} lokalizacji</p>
        </div>

        <!-- Wyszukiwarka -->
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Szukaj po nazwisku lub cmentarzu</mat-label>
          <input
            matInput
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Wpisz nazwisko..."
          />
          <mat-icon matPrefix>search</mat-icon>
          @if (searchQuery) {
          <button mat-icon-button matSuffix (click)="clearSearch()" aria-label="Wyczyść">
            <mat-icon>close</mat-icon>
          </button>
          }
        </mat-form-field>

        <!-- Sortowanie -->
        <div class="controls">
          <mat-form-field appearance="outline" class="sort-field">
            <mat-label>Sortuj według</mat-label>
            <mat-select [(ngModel)]="sortBy" (ngModelChange)="onSortChange($event)">
              <mat-option value="name">Nazwisko</mat-option>
              <mat-option value="date-added">Data dodania</mat-option>
              <mat-option value="last-visited">Ostatnio odwiedzony</mat-option>
              <mat-option value="distance" [disabled]="!userLocation()">
                Odległość {{ !userLocation() ? '(brak GPS)' : '' }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          @if (graveService.gravesCount() === 0 && !graveService.isLoading()) {
          <button
            mat-raised-button
            color="accent"
            (click)="generateMockData()"
            aria-label="Wygeneruj dane testowe"
            class="mock-button"
          >
            <mat-icon>science</mat-icon>
            Wygeneruj dane testowe
          </button>
          }

          <button
            mat-fab
            color="primary"
            routerLink="/graves/add"
            aria-label="Dodaj grób"
            class="fab-add"
          >
            <mat-icon>add</mat-icon>
          </button>
        </div>
      </section>

      <!-- Lista grobów -->
      <app-graves-list
        [graves]="displayedGraves()"
        [loading]="graveService.isLoading()"
        [emptyMessage]="getEmptyMessage()"
        [emptyHint]="getEmptyHint()"
        (navigate)="onNavigate($event)"
      />

      <!-- Statystyki (opcjonalnie) -->
      @if (displayedGraves().length > 0) {
      <section class="graves-stats">
        <div class="stat-card">
          <mat-icon>location_on</mat-icon>
          <div>
            <strong>{{ graveService.gravesCount() }}</strong>
            <span>Groby</span>
          </div>
        </div>

        @if (paymentsDueCount() > 0) {
        <div class="stat-card">
          <mat-icon color="warn">warning</mat-icon>
          <div>
            <strong>{{ paymentsDueCount() }}</strong>
            <span>Wygasające opłaty</span>
          </div>
        </div>
        } @if (userLocation()) {
        <div class="stat-card">
          <mat-icon>near_me</mat-icon>
          <div>
            <strong>{{ nearbyCount() }}</strong>
            <span>W pobliżu (< 5km)</span>
          </div>
        </div>
        }
      </section>
      }
    </div>
  `,
  styles: [
    `
      .graves-page {
        max-width: 100%;
        padding: 0;
      }

      .graves-header {
        margin-bottom: 32px;
        padding: 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .header-content {
        margin-bottom: 24px;

        h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.87);
        }

        .graves-count {
          margin: 0;
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
        }
      }

      .search-field {
        width: 100%;
        margin-bottom: 16px;
      }

      .controls {
        display: flex;
        gap: 16px;
        align-items: center;

        .sort-field {
          flex: 1;
        }

        .fab-add {
          flex-shrink: 0;
        }

        .mock-button {
          flex-shrink: 0;
        }
      }

      .graves-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 32px;
        padding: 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        transition: all 0.2s ease;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
          color: var(--primary-color);
        }

        div {
          display: flex;
          flex-direction: column;

          strong {
            font-size: 28px;
            font-weight: 600;
            line-height: 1;
            margin-bottom: 6px;
            color: rgba(0, 0, 0, 0.87);
          }

          span {
            font-size: 13px;
            color: rgba(0, 0, 0, 0.6);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }
      }

      @media (max-width: 599px) {
        .graves-page {
          padding: 0;
        }

        .graves-header {
          padding: 12px;
          border-radius: 0;
          margin-bottom: 16px;
        }

        .header-content {
          margin-bottom: 16px;

          h1 {
            font-size: 22px;
          }

          .graves-count {
            font-size: 13px;
          }
        }

        .search-field {
          margin-bottom: 12px;
        }

        .controls {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;

          .sort-field {
            width: 100%;
          }

          .fab-add {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 100;
            box-shadow: 0 4px 16px rgba(46, 125, 50, 0.4);
          }
        }

        .graves-stats {
          grid-template-columns: 1fr;
          padding: 12px;
          gap: 12px;
          margin-top: 16px;
          border-radius: 0;
        }

        .stat-card {
          padding: 14px;

          mat-icon {
            font-size: 36px;
            width: 36px;
            height: 36px;
          }

          div strong {
            font-size: 24px;
          }

          div span {
            font-size: 12px;
          }
        }
      }

      @media (min-width: 600px) and (max-width: 959px) {
        .graves-header {
          padding: 20px;
        }

        .header-content h1 {
          font-size: 26px;
        }
      }
    `,
  ],
})
export class GravesPageComponent {
  readonly graveService = inject(GraveService);
  private readonly geolocation = inject(GeolocationService);

  searchQuery = '';
  sortBy: SortOption = 'name';

  // Computed values
  userLocation = computed(() => {
    // TODO: Get from GeolocationService
    return null as { lat: number; lng: number } | null;
  });

  paymentsDueCount = computed(() => this.graveService.getGravesWithPaymentDue().length);

  nearbyCount = computed(() => {
    const location = this.userLocation();
    if (!location) return 0;

    const gravesWithDistance = this.graveService.getGravesWithDistance(location.lat, location.lng);
    return gravesWithDistance.filter((g) => g.distance && g.distance < 5000).length;
  });

  displayedGraves = computed(() => {
    let graves = this.graveService.filteredGraves();

    // Dodaj odległość jeśli jest lokalizacja
    const location = this.userLocation();
    let gravesWithDistance: GraveWithDistance[] = graves;

    if (location && this.sortBy === 'distance') {
      gravesWithDistance = this.graveService.getGravesWithDistance(location.lat, location.lng);
    }

    // Sortuj
    return this.graveService.sortGraves(gravesWithDistance, this.sortBy);
  });

  constructor() {
    // Track user location for distance calculations
    effect(() => {
      // TODO: Subscribe to geolocation updates
    });
  }

  onSearchChange(query: string): void {
    this.graveService.searchByName(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.graveService.searchByName('');
  }

  onSortChange(sortBy: SortOption): void {
    this.graveService.setSortBy(sortBy);
  }

  onNavigate(graveId: string): void {
    // TODO: Implement navigation to grave
    console.log('Navigate to grave:', graveId);
  }

  getEmptyMessage(): string {
    if (this.searchQuery) {
      return 'Brak wyników wyszukiwania';
    }
    return 'Nie masz jeszcze żadnych grobów';
  }

  getEmptyHint(): string {
    if (this.searchQuery) {
      return 'Spróbuj wyszukać inną frazę';
    }
    return 'Dodaj pierwszy grób klikając przycisk + poniżej';
  }

  async generateMockData(): Promise<void> {
    // Współrzędne w okolicy Krakowa (podane przez użytkownika)
    const centerLat = 50.02704;
    const centerLng = 19.936453;
    await this.graveService.generateMockGraves(centerLat, centerLng, 8);
  }
}
