import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getDistance } from 'geolib';

import { Grave } from '../../../shared/models/grave.model';
import { IconComponent } from '../../../shared/components/icon.component';
import { GravePhotoComponent } from '../../../shared/components/grave-photo.component';
import {
  formatDistance,
  graveTitle,
  personName,
  placeLine,
  primaryPhoto,
  yearsRange,
} from '../../../shared/utils/grave-display';

/** Pływająca karta wybranego grobu nad dolną nawigacją mapy. */
@Component({
  selector: 'app-map-grave-card',
  imports: [RouterLink, IconComponent, GravePhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (grave(); as g) {
    <article class="card" aria-live="polite">
      <button type="button" class="close" aria-label="Zamknij kartę grobu" (click)="close.emit()">
        <app-icon name="close" [size]="16" />
      </button>
      <div class="card__main">
        <app-grave-photo class="card__photo" [photo]="photo()" />
        <div class="card__text">
          <h2>{{ title() }}</h2>
          @if (subline()) {
          <span class="card__sub">{{ subline() }}</span>
          }
          <span class="card__sub card__sub--place">
            <app-icon name="pin" [size]="14" />{{ place() }}
          </span>
        </div>
      </div>
      <div class="card__actions">
        <a class="pill-btn details" [routerLink]="['/graves', g.id]">Szczegóły</a>
        <button type="button" class="pill-btn pill-btn--dark go" (click)="navigate.emit(g.id)">
          <app-icon name="navigate" [size]="18" />
          Nawiguj{{ distance() ? ' · ' + distance() : '' }}
        </button>
      </div>
    </article>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        z-index: 1001;
        left: 50%;
        bottom: calc(100px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        width: min(460px, calc(100% - 32px));
      }

      .card {
        position: relative;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        border-radius: var(--radius-lg);
        background: var(--card);
        color: var(--ink);
        box-shadow: var(--shadow-float);

        &__main {
          display: flex;
          gap: 14px;
          align-items: center;
          padding-right: 28px;
        }

        &__photo {
          width: 84px;
          height: 84px;
          flex-shrink: 0;
          border-radius: 20px;
        }

        &__text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;

          h2 {
            margin: 0;
            font-size: 19px;
            line-height: 1.2;
            letter-spacing: -0.015em;
          }
        }

        &__sub {
          font-size: 13px;
          color: var(--ink-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          &--place {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
        }

        &__actions {
          display: flex;
          gap: 10px;

          .details {
            flex: 1;
          }

          .go {
            flex: 1.4;
          }
        }
      }

      .close {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: var(--radius-pill);
        background: var(--pill);
        color: var(--ink);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
    `,
  ],
})
export class MapGraveCardComponent {
  grave = input<Grave | undefined>(undefined);
  userCoords = input<GeolocationCoordinates | undefined>(undefined);

  close = output<void>();
  navigate = output<string>();

  readonly title = computed(() => {
    const g = this.grave();
    return g ? graveTitle(g) : '';
  });

  readonly subline = computed(() => {
    const g = this.grave();
    if (!g) return '';
    const [first, ...others] = g.deceasedPersons;
    const parts = [first ? yearsRange(first) : ''];
    if (others.length) parts.push(`oraz ${others.map(personName).join(', ')}`);
    return parts.filter(Boolean).join(' · ');
  });

  readonly place = computed(() => {
    const g = this.grave();
    if (!g) return '';
    return placeLine(g) || g.cemeteryName;
  });

  readonly photo = computed(() => {
    const g = this.grave();
    return g ? primaryPhoto(g) : undefined;
  });

  readonly distance = computed(() => {
    const g = this.grave();
    const c = this.userCoords();
    if (!g || !c) return '';
    return formatDistance(
      getDistance({ latitude: c.latitude, longitude: c.longitude }, { latitude: g.latitude, longitude: g.longitude })
    );
  });
}
