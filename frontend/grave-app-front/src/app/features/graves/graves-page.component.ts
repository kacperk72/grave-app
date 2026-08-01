import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { GraveService } from './services/grave.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { GravesListComponent } from './components/graves-list/graves-list.component';
import { GraveWithDistance, SortOption } from '../../shared/models/grave.model';

interface SortOptionItem {
  label: string;
  value: SortOption;
  disabled?: boolean;
}

@Component({
  selector: 'app-graves-page',
  imports: [
    RouterModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    GravesListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="graves-page">
      <header class="graves-header">
        <span class="eyebrow">Zapisane lokalizacje</span>
        <h1>Moje groby</h1>
        <p class="count">
          {{ graveService.gravesCount() }}
          {{ graveService.gravesCount() === 1 ? 'miejsce' : 'miejsca' }} na
          {{ cemeteriesCount() }} {{ cemeteriesCount() === 1 ? 'cmentarzu' : 'cmentarzach' }} ·
          dane dostępne offline
        </p>

        <div class="tools">
          <p-iconfield class="search">
            <p-inputicon class="pi pi-search" />
            <input
              pInputText
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Szukaj po nazwisku, cmentarzu, sektorze…"
              class="search-input"
            />
            @if (searchQuery) {
            <p-inputicon
              class="pi pi-times clear-icon"
              (click)="clearSearch()"
              role="button"
              aria-label="Wyczyść"
            />
            }
          </p-iconfield>

          <div class="sort-row">
            <span class="sort-label"><i class="pi pi-sort-alt"></i> Sortuj</span>
            <div class="chips">
              @for (opt of sortOptions(); track opt.value) {
              <button
                type="button"
                class="chip"
                [class.active]="sortBy() === opt.value"
                [disabled]="opt.disabled"
                (click)="selectSort(opt.value)"
              >
                {{ opt.label }}
              </button>
              }
            </div>
          </div>

          @if (graveService.gravesCount() === 0 && !graveService.isLoading()) {
          <p-button
            severity="warn"
            icon="pi pi-bolt"
            label="Wygeneruj dane testowe"
            (onClick)="generateMockData()"
            styleClass="mock-button"
          />
          }
        </div>
      </header>

      <app-graves-list
        [graves]="displayedGraves()"
        [loading]="graveService.isLoading()"
        [emptyMessage]="getEmptyMessage()"
        [emptyHint]="getEmptyHint()"
        (navigate)="onNavigate($event)"
      />

      @if (displayedGraves().length > 0) {
      <section class="stats">
        <div class="stat-card">
          <div class="stat-icon"><i class="pi pi-map-marker"></i></div>
          <div>
            <strong>{{ graveService.gravesCount() }}</strong>
            <span>Groby</span>
          </div>
        </div>

        @if (paymentsDueCount() > 0) {
        <div class="stat-card">
          <div class="stat-icon stat-icon--warn"><i class="pi pi-exclamation-triangle"></i></div>
          <div>
            <strong>{{ paymentsDueCount() }}</strong>
            <span>Wygasające opłaty</span>
          </div>
        </div>
        } @if (userLocation()) {
        <div class="stat-card">
          <div class="stat-icon"><i class="pi pi-compass"></i></div>
          <div>
            <strong>{{ nearbyCount() }}</strong>
            <span>W pobliżu (&lt; 5 km)</span>
          </div>
        </div>
        }
      </section>
      }

      <a routerLink="/graves/add" class="fab-add" aria-label="Dodaj grób">
        <i class="pi pi-plus"></i>
        <span>Dodaj grób</span>
      </a>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .graves-page {
        max-width: 100%;
      }

      .graves-header {
        margin-bottom: 20px;
      }

      .graves-header h1 {
        margin: 6px 0 0;
        font-family: var(--font-serif);
        font-size: 32px;
        font-weight: 600;
        color: var(--ink);
      }

      .count {
        margin: 6px 0 0;
        color: var(--ink-muted);
        font-size: 14px;
      }

      .tools {
        margin-top: 18px;
        padding: 16px;
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-card);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      :host ::ng-deep .search {
        display: block;
      }

      :host ::ng-deep .search input.search-input {
        width: 100%;
        padding-left: 2.6rem;
        padding-right: 2.6rem;
        height: 46px;
        border-radius: var(--radius-pill);
        background: var(--surface-raised);
      }

      :host ::ng-deep .clear-icon {
        cursor: pointer;
      }

      .sort-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .sort-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        padding: 8px 16px;
        border-radius: var(--radius-pill);
        border: 1px solid var(--hairline);
        background: var(--surface-raised);
        color: var(--ink-muted);
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover:not(:disabled):not(.active) {
          border-color: var(--sage-soft);
          color: var(--ink);
        }

        &.active {
          background: var(--forest);
          border-color: var(--forest);
          color: #fbf9f3;
        }

        &:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      }

      :host ::ng-deep .mock-button {
        align-self: flex-start;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 20px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px;
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);

        > div:not(.stat-icon) {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        strong {
          font-family: var(--font-serif);
          font-size: 24px;
          color: var(--ink);
        }

        span {
          font-size: 11px;
          color: var(--ink-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 4px;
        }
      }

      .stat-icon {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-sm);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
        background: var(--beige);
        color: var(--sage);

        &--warn {
          background: var(--copper-tint);
          color: var(--copper-ink);
        }
      }

      .fab-add {
        position: fixed;
        right: 20px;
        bottom: calc(84px + env(safe-area-inset-bottom, 0px));
        z-index: 800;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 20px;
        border-radius: var(--radius-pill);
        background: var(--copper);
        color: #fbf9f3;
        text-decoration: none;
        font-family: var(--font-sans);
        font-weight: 600;
        font-size: 15px;
        box-shadow: var(--shadow-float);
        transition: transform 0.14s ease, background 0.15s ease;

        i {
          font-size: 16px;
        }

        &:hover {
          background: var(--copper-strong);
          transform: translateY(-2px);
        }

        @media (min-width: 900px) {
          bottom: 28px;
        }
      }

      @media (max-width: 599px) {
        .graves-header h1 {
          font-size: 26px;
        }
      }
    `,
  ],
})
export class GravesPageComponent {
  readonly graveService = inject(GraveService);
  private readonly geolocation = inject(GeolocationService);
  private readonly destroyRef = inject(DestroyRef);

  searchQuery = '';
  sortBy = signal<SortOption>('name');

  userLocation = signal<{ lat: number; lng: number } | null>(null);

  sortOptions = computed<SortOptionItem[]>(() => [
    { label: 'Nazwisko', value: 'name' },
    { label: 'Odległość', value: 'distance', disabled: !this.userLocation() },
    { label: 'Data dodania', value: 'date-added' },
    { label: 'Ostatnia wizyta', value: 'last-visited' },
  ]);

  cemeteriesCount = computed(() => {
    const names = new Set(this.graveService.graves().map((g) => g.cemeteryName));
    return names.size;
  });

  paymentsDueCount = computed(() => this.graveService.getGravesWithPaymentDue().length);

  nearbyCount = computed(() => {
    const loc = this.userLocation();
    if (!loc) return 0;
    return this.graveService
      .getGravesWithDistance(loc.lat, loc.lng)
      .filter((g) => g.distance !== undefined && g.distance < 5000).length;
  });

  displayedGraves = computed(() => {
    const filtered = this.graveService.filteredGraves();
    const loc = this.userLocation();

    // attach distance (for the card badge and distance sorting) to the
    // already-filtered list so search stays respected when GPS is on
    const graves: GraveWithDistance[] = loc
      ? this.graveService.getGravesWithDistance(loc.lat, loc.lng, filtered)
      : filtered;

    return this.graveService.sortGraves(graves, this.sortBy());
  });

  constructor() {
    const sub = this.geolocation.watchPosition().subscribe({
      next: (pos) => {
        this.userLocation.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      error: () => {
        // GPS unavailable — distance sort stays disabled
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  onSearchChange(query: string): void {
    this.graveService.searchByName(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.graveService.searchByName('');
  }

  selectSort(sortBy: SortOption): void {
    this.sortBy.set(sortBy);
    this.graveService.setSortBy(sortBy);
  }

  onNavigate(graveId: string): void {
    console.log('Navigate to grave:', graveId);
  }

  getEmptyMessage(): string {
    return this.searchQuery ? 'Brak wyników wyszukiwania' : 'Nie masz jeszcze żadnych grobów';
  }

  getEmptyHint(): string {
    return this.searchQuery
      ? 'Spróbuj wyszukać inną frazę'
      : 'Dodaj pierwszy grób klikając przycisk „Dodaj grób"';
  }

  async generateMockData(): Promise<void> {
    const loc = this.userLocation();
    if (loc) {
      await this.graveService.generateMockGraves(loc.lat, loc.lng, 8);
    } else {
      // fallback — okolice Krakowa
      await this.graveService.generateMockGraves(50.02704, 19.936453, 8);
    }
  }
}
