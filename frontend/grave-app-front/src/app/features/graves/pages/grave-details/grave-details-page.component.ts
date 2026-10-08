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
import { GravePhoto } from '../../../../shared/models/grave.model';
import { PhotoService } from '../../../../core/services/photo.service';
import { PhotoViewerComponent } from '../../../../shared/components/photo-viewer.component';
import { AvatarComponent } from '../../../../shared/components/avatar.component';
import { SpaceService } from '../../../../core/services/space.service';
import { LOCAL_SPACE_ID, isShared } from '../../../../shared/models/space.model';
import { visibleSpaces } from '../../../../shared/utils/account-link';
import { relativeTime } from '../../../../shared/utils/member-display';
import { canGoBackInApp } from '../../../../core/services/navigation';
import {
  dueLabel,
  formatDate,
  formatDistance,
  graveTitle,
  paymentStatus,
  lifeSpan,
  personName,
  placeLine,
  pluralPl,
} from '../../../../shared/utils/grave-display';

@Component({
  selector: 'app-grave-details-page',
  imports: [RouterLink, IconComponent, GravePhotoComponent, PhotoViewerComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grave-details-page.component.html',
  styleUrl: './grave-details-page.component.scss',
})
export class GraveDetailsPageComponent {
  private readonly graveService = inject(GraveService);
  private readonly geolocation = inject(GeolocationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly photoService = inject(PhotoService);
  readonly spaces = inject(SpaceService);

  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id'))));

  readonly grave = computed(() => this.graveService.graves().find((g) => g.id === this.id()));
  readonly notFound = computed(() => !this.grave() && !this.graveService.isLoading());

  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  /** null = zdjęcie główne; po kliknięciu miniatury — wybrane. */
  readonly photoIndex = signal<number | null>(null);
  readonly photoBusy = signal(false);
  readonly viewerOpen = signal(false);
  readonly photoError = signal<string | null>(null);
  readonly visitSaved = signal(false);
  readonly busy = signal(false);

  readonly readOnly = computed(() => this.spaces.readOnly());

  /** „Ostatnio zmienił(a): Ania · 3 dni temu" — tylko na rodzinnej mapie, gdy znamy osobę. */
  readonly changedBy = computed(() => {
    const g = this.grave();
    const spaceId = this.spaces.activeSpaceId();
    if (!g?.updatedBy || spaceId === LOCAL_SPACE_ID) return null;
    const member = this.spaces.members()[spaceId]?.find((m) => m.id === g.updatedBy);
    return member ? { member, when: relativeTime(new Date(g.updatedAt).getTime()) } : null;
  });

  /** Mapy, na które można przenieść albo skopiować grób. */
  readonly targets = computed(() =>
    visibleSpaces(this.spaces.spaces()).filter(
      (s) => s.id !== this.spaces.activeSpaceId() && s.status !== 'removed'
    )
  );
  readonly transferMode = signal<'move' | 'copy' | null>(null);
  readonly transferNote = signal<string | null>(null);

  readonly title = computed(() => {
    const g = this.grave();
    return g ? graveTitle(g) : '';
  });

  /** Pełne daty życia pierwszej osoby — pod nazwiskiem w tytule. */
  readonly subline = computed(() => {
    const first = this.grave()?.deceasedPersons[0];
    return first ? lifeSpan(first) : '';
  });

  /** Pozostałe osoby w grobie, każda z datami życia. */
  readonly others = computed(() =>
    (this.grave()?.deceasedPersons ?? []).slice(1).map((p) => ({
      id: p.id,
      name: personName(p),
      span: lifeSpan(p),
    }))
  );

  readonly photos = computed(() => this.grave()?.photos ?? []);
  readonly activePhoto = computed<GravePhoto | undefined>(() => {
    const photos = this.photos();
    const index = this.photoIndex();
    return (index !== null ? photos[index] : undefined) ?? photos.find((p) => p.isPrimary) ?? photos[0];
  });

  /** Pozycja widocznego zdjęcia na liście — od niej startuje powiększenie. */
  readonly activeIndex = computed(() => {
    const active = this.activePhoto();
    return Math.max(0, this.photos().findIndex((p) => p.id === active?.id));
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
    this.spaces.loadMembers(this.spaces.activeSpaceId()).catch(() => {});
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
    if (canGoBackInApp()) this.location.back();
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

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const g = this.grave();
    if (!file || !g) return;
    this.photoBusy.set(true);
    this.photoError.set(null);
    try {
      await this.photoService.addPhoto(g.id, file);
      this.photoIndex.set(this.photos().length - 1);
    } catch {
      this.photoError.set('Nie udało się dodać zdjęcia. Spróbuj innego pliku.');
    } finally {
      this.photoBusy.set(false);
    }
  }

  async removeActivePhoto(): Promise<void> {
    const g = this.grave();
    const photo = this.activePhoto();
    if (!g || !photo) return;
    if (!confirm('Usunąć to zdjęcie? Zniknie też u rodziny.')) return;
    this.photoBusy.set(true);
    try {
      await this.photoService.removePhoto(g.id, photo.id);
      this.photoIndex.set(null);
    } finally {
      this.photoBusy.set(false);
    }
  }

  async transfer(toSpaceId: string): Promise<void> {
    const g = this.grave();
    const mode = this.transferMode();
    const target = this.spaces.spaces().find((s) => s.id === toSpaceId);
    const from = this.spaces.activeSpace();
    if (!g || !mode || !target || !from) return;
    if (mode === 'move' && isShared(from)) {
      const ok = confirm(
        `„${this.title()}" zniknie z mapy „${from.name}" także u pozostałych osób. Przenieść?`
      );
      if (!ok) return;
    }
    this.busy.set(true);
    this.transferNote.set(null);
    try {
      if (mode === 'move') {
        await this.spaces.moveGrave(g.id, toSpaceId);
        // Grób jest teraz na mapie docelowej — pokaż ją, żeby szczegóły zostały na ekranie
        this.spaces.setActive(toSpaceId);
        this.transferNote.set(`Przeniesiono na mapę „${target.name}".`);
      } else {
        const { skippedPhotos } = await this.spaces.copyGrave(g.id, toSpaceId);
        const skipped =
          skippedPhotos > 0
            ? ` Pominięto ${skippedPhotos} ${pluralPl(skippedPhotos, 'zdjęcie', 'zdjęcia', 'zdjęć')} — nie ma ich w telefonie.`
            : '';
        this.transferNote.set(`Skopiowano na mapę „${target.name}".${skipped}`);
      }
      this.transferMode.set(null);
    } catch (err) {
      this.transferNote.set(err instanceof Error ? err.message : 'Nie udało się. Spróbuj ponownie.');
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
