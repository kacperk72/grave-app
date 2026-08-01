import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ButtonModule } from 'primeng/button';

import { GraveWithDistance } from '../../../../shared/models/grave.model';
import { DistancePipe } from '../../../../shared/pipes/distance.pipe';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-grave-card',
  imports: [RouterModule, ButtonModule, DistancePipe, DateFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="grave-card">
      <div class="card-main">
        <div
          class="thumb"
          [class.placeholder]="!primaryPhoto()"
          [style.background-image]="primaryPhoto() ? 'url(' + primaryPhoto() + ')' : null"
        >
          @if (!primaryPhoto()) {
          <i class="pi pi-image"></i>
          }
        </div>

        <div class="info">
          <h3 class="name">
            @if (grave().deceasedPersons.length > 0) {
            {{ grave().deceasedPersons[0].firstName }} {{ grave().deceasedPersons[0].lastName
            }}@if (grave().deceasedPersons.length > 1) {<span class="more"
              >&nbsp;+{{ grave().deceasedPersons.length - 1 }}</span
            >}
            } @else {
            <span class="no-name">Grób bez nazwy</span>
            }
          </h3>

          <p class="location">
            <i class="pi pi-map-marker"></i>
            <span>{{ grave().cemeteryName }}</span>
          </p>

          @if (grave().sector || grave().graveNumber) {
          <p class="place">
            @if (grave().sector) { sektor {{ grave().sector }} } @if (grave().graveNumber) {
            {{ grave().sector ? '· ' : '' }}miejsce {{ grave().graveNumber }} }
          </p>
          } @if (yearsLine()) {
          <p class="years">{{ yearsLine() }}</p>
          }
        </div>
      </div>

      @if (grave().distance !== undefined || grave().lastVisited) {
      <div class="pills">
        @if (grave().distance !== undefined) {
        <span class="pill">
          <i class="pi pi-compass"></i>
          {{ grave().distance | distance }}
        </span>
        } @if (grave().lastVisited) {
        <span class="pill">
          <i class="pi pi-calendar"></i>
          {{ grave().lastVisited | dateFormat }}
        </span>
        }
      </div>
      } @if (paymentWarning()) {
      <div class="payment-warning">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ paymentWarning() }}</span>
      </div>
      }

      <footer>
        <p-button
          label="Szczegóły"
          icon="pi pi-info-circle"
          [outlined]="true"
          styleClass="w-full"
          [routerLink]="['/graves', grave().id]"
        />
        @if (grave().distance !== undefined) {
        <p-button label="Nawiguj" icon="pi pi-directions" styleClass="w-full" (onClick)="onNavigate()" />
        }
      </footer>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .grave-card {
        background: var(--surface);
        border: 1px solid var(--hairline);
        border-radius: var(--radius-lg);
        padding: 16px;
        box-shadow: var(--shadow-card);
        display: flex;
        flex-direction: column;
        gap: 14px;
        height: 100%;
        transition: transform 0.18s ease, box-shadow 0.18s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-float);
        }
      }

      .card-main {
        display: flex;
        gap: 14px;
      }

      .thumb {
        width: 88px;
        height: 88px;
        flex-shrink: 0;
        border-radius: var(--radius-md);
        background-size: cover;
        background-position: center;
        background-color: var(--paper-2);

        &.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;

          i {
            font-size: 32px;
            color: var(--sage-soft);
          }
        }
      }

      .info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .name {
        margin: 0;
        font-family: var(--font-serif);
        font-size: 19px;
        font-weight: 600;
        color: var(--ink);
        line-height: 1.2;

        .more {
          color: var(--ink-muted);
          font-size: 15px;
        }
      }

      .no-name {
        color: var(--ink-faint);
        font-style: italic;
      }

      .location {
        margin: 2px 0 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        color: var(--ink-muted);

        i {
          font-size: 12px;
          color: var(--sage);
        }
      }

      .place {
        margin: 0;
        font-size: 12.5px;
        color: var(--ink-faint);
      }

      .years {
        margin: 3px 0 0;
        font-family: var(--font-serif);
        font-size: 13px;
        color: var(--ink-muted);
      }

      .pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: var(--radius-pill);
        background: var(--beige);
        color: var(--ink);
        font-size: 12.5px;
        font-weight: 600;

        i {
          font-size: 12px;
          color: var(--sage);
        }
      }

      .payment-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: var(--copper-tint);
        border-radius: var(--radius-sm);
        color: var(--copper-ink);
        font-size: 12.5px;
        font-weight: 500;

        i {
          font-size: 14px;
          flex-shrink: 0;
        }
      }

      footer {
        margin-top: auto;
        display: flex;
        gap: 10px;

        :host ::ng-deep .w-full,
        :host ::ng-deep .w-full .p-button {
          width: 100%;
        }

        p-button {
          flex: 1;
        }
      }
    `,
  ],
})
export class GraveCardComponent {
  grave = input.required<GraveWithDistance>();
  navigate = output<string>();

  primaryPhoto = computed(() => {
    const g = this.grave();
    const primary = g.photos.find((p) => p.isPrimary);
    return primary?.thumbnailUrl || primary?.url || g.photos[0]?.url;
  });

  yearsLine = computed(() => {
    const persons = this.grave().deceasedPersons.slice(0, 2);
    const ranges = persons
      .map((p) => {
        const birth = p.birthDate ? new Date(p.birthDate).getFullYear() : null;
        const death = p.deathDate ? new Date(p.deathDate).getFullYear() : null;
        if (birth && death) return `${birth}–${death}`;
        if (death) return `†${death}`;
        if (birth) return `${birth}`;
        return null;
      })
      .filter((r): r is string => r !== null);
    return ranges.join(' · ');
  });

  paymentWarning = computed(() => {
    const g = this.grave();
    if (!g.paymentDueDate) return null;
    const due = new Date(g.paymentDueDate);
    const now = new Date();
    const oneMonth = new Date();
    oneMonth.setMonth(oneMonth.getMonth() + 2);
    if (due < now || due > oneMonth) return null;
    const days = Math.max(0, Math.round((due.getTime() - now.getTime()) / 86_400_000));
    const dueStr = due.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    return `Opłata kończy się za ${days} dni — do ${dueStr}`;
  });

  onNavigate(): void {
    this.navigate.emit(this.grave().id);
  }
}
