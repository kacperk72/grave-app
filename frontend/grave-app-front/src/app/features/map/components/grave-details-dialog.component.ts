import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { Grave } from '../../../shared/models/grave.model';

@Component({
  selector: 'app-grave-details-dialog',
  imports: [DecimalPipe, ButtonModule, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: 'min(560px, 92vw)' }"
      styleClass="grave-dialog"
      [showHeader]="true"
    >
      <ng-template #header>
        @if (grave(); as g) {
        <div class="grave-dialog-header">
          <div class="grave-dialog-avatar"><i class="pi pi-map-marker"></i></div>
          <div class="grave-dialog-title">
            <h2>
              {{ g.deceasedPersons[0]?.firstName }} {{ g.deceasedPersons[0]?.lastName }}
              @if (g.deceasedPersons.length > 1) {
              <span class="more">+{{ g.deceasedPersons.length - 1 }}</span>
              }
            </h2>
            <small><i class="pi pi-map-marker"></i> {{ locationLabel() }}</small>
          </div>
        </div>
        }
      </ng-template>

      @if (grave(); as g) {
      <div class="grave-dialog-body">
        @if (g.deceasedPersons.length > 0) {
        <ul class="people">
          @for (person of g.deceasedPersons; track person.id) {
          <li>
            <span class="people__name">{{ person.firstName }} {{ person.lastName }}</span>
            <span class="people__years">{{ yearsFor(person) }}</span>
          </li>
          }
        </ul>
        }

        @if (distanceMeters(); as d) {
        <div class="card">
          <span class="eyebrow">Odległość</span>
          <span class="card__value">{{ d | number : '1.0-0' }} m</span>
        </div>
        } @if (g.lastVisited) {
        <div class="card">
          <span class="eyebrow"><i class="pi pi-calendar"></i> Ostatnia wizyta</span>
          <span class="card__value">{{ formatDate(g.lastVisited) }}</span>
        </div>
        } @if (g.paymentDueDate) {
        <div class="card card--warn">
          <span class="eyebrow"><i class="pi pi-calendar"></i> Opłata</span>
          <span class="card__value">{{ formatDate(g.paymentDueDate) }}</span>
        </div>
        } @if (g.notes) {
        <div class="card card--note">
          <span class="eyebrow"><i class="pi pi-pencil"></i> Notatka</span>
          <p class="card__note">{{ g.notes }}</p>
        </div>
        }

        <div class="gallery">
          <span class="eyebrow"><i class="pi pi-images"></i> Galeria</span>
          <div class="thumbs">
            @for (i of [0, 1, 2]; track i) {
            <button
              type="button"
              (click)="openGallery.emit({ graveId: g.id, index: i })"
              class="thumb"
            >
              <i class="pi pi-image"></i>
            </button>
            }
          </div>
        </div>
      </div>

      <ng-template #footer>
        <div class="grave-dialog-actions">
          <p-button
            [outlined]="true"
            icon="pi pi-check-circle"
            label="Odwiedzony"
            (onClick)="markVisited.emit(g.id)"
          />
          <p-button icon="pi pi-directions" label="Nawiguj" (onClick)="onNavigate(g.id)" />
        </div>
      </ng-template>
      }
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .grave-dialog {
        border-radius: var(--radius-lg);

        .p-dialog-header {
          padding: 18px 20px 12px;
        }
        .p-dialog-content {
          padding: 8px 20px 20px;
        }
        .p-dialog-footer {
          padding: 12px 20px 18px;
        }
      }

      .grave-dialog-header {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .grave-dialog-avatar {
        width: 46px;
        height: 46px;
        border-radius: var(--radius-md);
        background: var(--forest);
        color: #fbf9f3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }

      .grave-dialog-title {
        display: flex;
        flex-direction: column;
        line-height: 1.25;

        h2 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: 20px;
          font-weight: 600;
          color: var(--ink);

          .more {
            color: var(--ink-muted);
            font-size: 15px;
          }
        }

        small {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: var(--ink-muted);

          i {
            font-size: 11px;
            color: var(--sage);
          }
        }
      }

      .grave-dialog-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .people {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;

        li {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding: 12px 16px;
          background: var(--paper);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
        }

        &__name {
          font-family: var(--font-serif);
          font-size: 16px;
          color: var(--ink);
        }

        &__years {
          font-size: 13px;
          color: var(--ink-muted);
          white-space: nowrap;
        }
      }

      .card {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px 16px;
        background: var(--paper);
        border: 1px solid var(--hairline);
        border-radius: var(--radius-md);

        &__value {
          font-size: 15px;
          color: var(--ink);
          font-weight: 600;
        }

        &__note {
          margin: 0;
          font-size: 14px;
          color: var(--ink);
          line-height: 1.5;
        }

        &--warn {
          background: var(--copper-tint);
          border-color: transparent;

          .card__value {
            color: var(--copper-ink);
          }
        }
      }

      .gallery {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .thumbs {
        display: flex;
        gap: 10px;
      }

      .thumb {
        width: 84px;
        height: 84px;
        border-radius: var(--radius-md);
        border: 1px solid var(--hairline);
        background: var(--paper-2);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--sage-soft);
        transition: all 0.15s ease;

        i {
          font-size: 22px;
        }

        &:hover {
          border-color: var(--sage);
          transform: translateY(-2px);
        }
      }

      .grave-dialog-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;

        @media (max-width: 480px) {
          width: 100%;
          p-button {
            flex: 1;
          }
        }
      }
    `,
  ],
})
export class GraveDetailsDialogComponent {
  visible = model<boolean>(false);
  grave = input<Grave | undefined>(undefined);
  userCoords = input<GeolocationCoordinates | undefined>(undefined);

  navigate = output<string>();
  markVisited = output<string>();
  openGallery = output<{ graveId: string; index: number }>();

  locationLabel = computed(() => {
    const g = this.grave();
    if (!g) return '';
    const parts = [g.cemeteryName];
    if (g.sector) parts.push(`sektor ${g.sector}`);
    if (g.graveNumber) parts.push(`miejsce ${g.graveNumber}`);
    return parts.join(' · ');
  });

  distanceMeters = computed<number | null>(() => {
    const g = this.grave();
    const coords = this.userCoords();
    if (!g || !coords) return null;
    return haversine(coords.latitude, coords.longitude, g.latitude, g.longitude);
  });

  yearsFor(person: { birthDate: string | null; deathDate: string | null }): string {
    const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
    const death = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
    if (birth && death) return `${birth}–${death}`;
    if (death) return `†${death}`;
    if (birth) return `ur. ${birth}`;
    return '';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  onNavigate(graveId: string): void {
    this.navigate.emit(graveId);
    this.visible.set(false);
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
