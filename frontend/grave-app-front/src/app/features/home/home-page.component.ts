import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { GraveService } from '../graves/services/grave.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { GravePhoto, GraveWithDistance, SortOption } from '../../shared/models/grave.model';
import { IconComponent } from '../../shared/components/icon.component';
import { GravePhotoComponent } from '../../shared/components/grave-photo.component';
import {
  dueLabel,
  formatDistance,
  graveTitle,
  paymentStatus,
  primaryPhoto,
  yearsRange,
} from '../../shared/utils/grave-display';

type Filter = { kind: 'all' } | { kind: 'near' } | { kind: 'due' } | { kind: 'cemetery'; name: string };

interface CardVm {
  id: string;
  title: string;
  meta: string;
  photo?: GravePhoto;
  distance: string;
}

interface AttentionVm {
  id: string;
  title: string;
  dueText: string;
  badge: string;
}

/** Promień filtra „Blisko mnie". */
const NEAR_RADIUS_M = 5000;

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, IconComponent, GravePhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  readonly graveService = inject(GraveService);
  readonly family = inject(FamilySyncService);

  readonly familyTitle = computed(() => {
    const pending = this.family.pending();
    if (this.family.state() === 'offline') {
      return pending > 0 ? `Bez internetu — ${pending} zmian czeka na wysłanie` : 'Bez internetu';
    }
    if (this.family.state() === 'error' || this.family.state() === 'revoked') {
      return this.family.errorMessage() ?? 'Błąd synchronizacji';
    }
    return 'Groby są wspólne dla całej rodziny';
  });
  private readonly geolocation = inject(GeolocationService);

  readonly today = capitalize(
    new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly filter = signal<Filter>({ kind: 'all' });
  /** null = automatycznie: po odległości, gdy znamy położenie, inaczej po nazwisku. */
  readonly sortChoice = signal<SortOption | null>(null);
  readonly sortOpen = signal(false);

  readonly query = computed(() => this.graveService.searchQuery());

  readonly sortOptions = computed(() => [
    { value: 'distance' as SortOption, label: 'Odległość', disabled: !this.userLocation() },
    { value: 'name' as SortOption, label: 'Nazwisko', disabled: false },
    { value: 'last-visited' as SortOption, label: 'Ostatnia wizyta', disabled: false },
    { value: 'date-added' as SortOption, label: 'Data dodania', disabled: false },
  ]);

  readonly effectiveSort = computed<SortOption>(() => {
    const choice = this.sortChoice();
    if (choice === 'distance' && !this.userLocation()) return 'name';
    return choice ?? (this.userLocation() ? 'distance' : 'name');
  });

  readonly cemeteries = computed(() =>
    [...new Set(this.graveService.graves().map((g) => g.cemeteryName))].sort((a, b) =>
      a.localeCompare(b, 'pl')
    )
  );

  private readonly withStatus = computed(() =>
    this.graveService
      .graves()
      .map((grave) => ({ grave, status: paymentStatus(grave) }))
      .filter((x) => x.status !== null)
      .sort((a, b) => a.status!.days - b.status!.days)
  );

  readonly dueCount = computed(() => this.withStatus().length);

  readonly attention = computed<AttentionVm[]>(() =>
    this.withStatus()
      .slice(0, 3)
      .map(({ grave, status }) => ({
        id: grave.id,
        title: graveTitle(grave),
        dueText: dueText(status!.due, status!.overdue),
        badge: dueLabel(status!),
      }))
  );

  private readonly visibleGraves = computed<GraveWithDistance[]>(() => {
    const loc = this.userLocation();
    const f = this.filter();
    let graves: GraveWithDistance[] = this.graveService.filteredGraves();
    if (loc) graves = this.graveService.getGravesWithDistance(loc.lat, loc.lng, graves);

    if (f.kind === 'near') {
      graves = graves.filter((g) => g.distance !== undefined && g.distance <= NEAR_RADIUS_M);
    } else if (f.kind === 'due') {
      const due = new Set(this.withStatus().map((x) => x.grave.id));
      graves = graves.filter((g) => due.has(g.id));
    } else if (f.kind === 'cemetery') {
      graves = graves.filter((g) => g.cemeteryName === f.name);
    }

    const sort = this.effectiveSort();
    if (sort === 'distance') {
      return [...graves].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    return this.graveService.sortGraves(graves, sort) as GraveWithDistance[];
  });

  readonly cards = computed<CardVm[]>(() =>
    this.visibleGraves().map((g) => ({
      id: g.id,
      title: graveTitle(g),
      meta: [g.deceasedPersons[0] ? yearsRange(g.deceasedPersons[0]) : '', g.cemeteryName]
        .filter(Boolean)
        .join(' · '),
      photo: primaryPhoto(g),
      distance: formatDistance(g.distance),
    }))
  );

  readonly sectionTitle = computed(() => {
    const f = this.filter();
    if (this.query()) return 'Wyniki wyszukiwania';
    if (f.kind === 'due') return 'Do opłaty';
    if (f.kind === 'cemetery') return f.name;
    if (f.kind === 'near' || this.effectiveSort() === 'distance') return 'Najbliżej ciebie';
    return 'Twoje groby';
  });

  constructor() {
    const sub = this.geolocation.watchPosition().subscribe({
      next: (pos) => this.userLocation.set({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      error: () => {
        // Bez GPS: brak odległości, sortowanie po nazwisku
      },
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  isFilter(kind: Filter['kind'], name?: string): boolean {
    const f = this.filter();
    return f.kind === kind && (kind !== 'cemetery' || (f as { name: string }).name === name);
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
  }

  onSearch(value: string): void {
    this.graveService.searchByName(value);
  }

  clearSearch(): void {
    this.graveService.searchByName('');
  }

  selectSort(value: SortOption): void {
    this.sortChoice.set(value);
    this.graveService.setSortBy(value);
  }

  shortCemetery(name: string): string {
    return name.replace(/^cmentarz\s+/i, '');
  }

  async generateMockData(): Promise<void> {
    const loc = this.userLocation();
    // Bez GPS — okolice Krakowa
    await this.graveService.generateMockGraves(loc?.lat ?? 50.02704, loc?.lng ?? 19.936453, 8);
  }
}

/** „do 14 listopada" albo „termin minął 8 lutego 2024" (rok tylko spoza bieżącego). */
function dueText(due: Date, overdue: boolean): string {
  const sameYear = due.getFullYear() === new Date().getFullYear();
  const date = due.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return overdue ? `termin minął ${date}` : `do ${date}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
