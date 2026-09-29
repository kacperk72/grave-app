import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { getDistance } from 'geolib';

import { GraveService } from '../../services/grave.service';
import { GeolocationService } from '../../../../core/services/geolocation.service';
import { IconComponent } from '../../../../shared/components/icon.component';
import { GravePhotoComponent } from '../../../../shared/components/grave-photo.component';
import {
  dueLabel,
  formatDate,
  formatDistance,
  graveTitle,
  paymentStatus,
  personName,
  placeLine,
  pluralPl,
  yearsRange,
} from '../../../../shared/utils/grave-display';

@Component({
  selector: 'app-grave-details-page',
  imports: [RouterLink, IconComponent, GravePhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grave-details-page.component.html',
  styleUrl: './grave-details-page.component.scss',
})
export class GraveDetailsPageComponent {
  private readonly graveService = inject(GraveService);
  private readonly geolocation = inject(GeolocationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id'))));

  readonly grave = computed(() => this.graveService.graves().find((g) => g.id === this.id()));
  readonly notFound = computed(() => !this.grave() && !this.graveService.isLoading());

  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly photoIndex = signal(0);
  readonly visitSaved = signal(false);
  readonly busy = signal(false);

  readonly title = computed(() => {
    const g = this.grave();
    return g ? graveTitle(g) : '';
  });

  /** „1938 – 2019 · oraz Józef Nowak, 1935 – 2011" */
  readonly subline = computed(() => {
    const g = this.grave();
    if (!g) return '';
    const [first, ...others] = g.deceasedPersons;
    const parts: string[] = [];
    const years = first ? yearsRange(first) : '';
    if (years) parts.push(years);
    if (others.length) {
      const rest = others
        .map((p) => [personName(p), yearsRange(p)].filter(Boolean).join(', '))
        .join('; ');
      parts.push(`oraz ${rest}`);
    }
    return parts.join(' · ');
  });

  readonly photos = computed(() => this.grave()?.photos ?? []);
  readonly activePhoto = computed(() => {
    const photos = this.photos();
    const photo = photos[this.photoIndex()] ?? photos.find((p) => p.isPrimary) ?? photos[0];
    return photo?.url;
  });

  readonly distance = computed(() => {
    const g = this.grave();
    const loc = this.userLocation();
    if (!g || !loc) return '';
    return formatDistance(
      getDistance({ latitude: loc.lat, longitude: loc.lng }, { latitude: g.latitude, longitude: g.longitude })
    );
  });

  readonly place = computed(() => {
    const g = this.grave();
    return g ? placeLine(g) : '';
  });

  readonly coords = computed(() => {
    const g = this.grave();
    return g ? `${g.latitude.toFixed(5)}, ${g.longitude.toFixed(5)}` : '';
  });

  readonly lastVisited = computed(() => {
    const iso = this.grave()?.lastVisited;
    return iso ? formatDate(iso) : 'Jeszcze nie zapisano wizyty';
  });

  readonly payment = computed(() => {
    const g = this.grave();
    if (!g || !g.paymentDueDate) return null;
    const status = paymentStatus(g);
    const details: string[] = [];
    if (g.lastPaymentAmount) details.push(`Ostatnio ${g.lastPaymentAmount} ${g.currency || 'PLN'}`);
    if (g.paymentPeriodMonths) details.push(periodText(g.paymentPeriodMonths));
    return {
      title: `Opłata do ${formatDate(g.paymentDueDate)}`,
      details: details.join(' · '),
      badge: status ? dueLabel(status) : null,
    };
  });

  constructor() {
    const sub = this.geolocation.watchPosition().subscribe({
      next: (pos) => this.userLocation.set({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      error: () => {
        // bez GPS nie pokazujemy odległości
      },
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  back(): void {
    // Wejście z linku (bez historii w aplikacji) wraca na Start
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(['/start']);
  }

  async markVisited(): Promise<void> {
    const g = this.grave();
    if (!g || this.busy()) return;
    this.busy.set(true);
    try {
      await this.graveService.markAsVisited(g.id);
      this.visitSaved.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  async deleteGrave(): Promise<void> {
    const g = this.grave();
    if (!g) return;
    const ok = confirm(`Usunąć „${this.title()}" z aplikacji? Tego nie można cofnąć.`);
    if (!ok) return;
    await this.graveService.deleteGrave(g.id);
    this.router.navigate(['/start'], { replaceUrl: true });
  }
}

function periodText(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return `co ${years === 1 ? '' : years + ' '}${pluralPl(years, 'rok', 'lata', 'lat')}`;
  }
  return `co ${months} mies.`;
}
