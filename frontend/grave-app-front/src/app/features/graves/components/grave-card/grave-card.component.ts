import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { GraveWithDistance } from '../../../../shared/models/grave.model';
import { DistancePipe } from '../../../../shared/pipes/distance.pipe';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

/**
 * Komponent karty grobu - wyświetla podstawowe informacje
 * Używany w liście grobów
 */
@Component({
  selector: 'app-grave-card',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    DistancePipe,
    DateFormatPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="grave-card" [class.has-distance]="grave().distance !== undefined">
      <mat-card-header>
        <div class="header-content">
          <div class="grave-info">
            <mat-card-title>
              @if (grave().deceasedPersons.length > 0) {
              {{ grave().deceasedPersons[0].firstName }}
              {{ grave().deceasedPersons[0].lastName }}
              } @else {
              <span class="no-name">Grób bez nazwy</span>
              }
            </mat-card-title>
            <mat-card-subtitle>
              {{ grave().cemeteryName }}
              @if (grave().sector || grave().graveNumber) { • @if (grave().sector) { sektor
              {{ grave().sector }}
              } @if (grave().graveNumber) {
              {{ grave().sector ? ', ' : '' }}nr {{ grave().graveNumber }}
              } }
            </mat-card-subtitle>
          </div>

          @if (grave().distance !== undefined) {
          <div class="distance-badge">
            <mat-icon>near_me</mat-icon>
            <span>{{ grave().distance | distance }}</span>
          </div>
          }
        </div>

        @if (primaryPhoto()) {
        <div class="grave-image" [style.background-image]="'url(' + primaryPhoto() + ')'"></div>
        } @else {
        <div class="grave-image placeholder">
          <mat-icon>photo</mat-icon>
        </div>
        }
      </mat-card-header>

      <mat-card-content>
        <!-- Osoby zmarłe -->
        @if (grave().deceasedPersons.length > 1) {
        <div class="deceased-list">
          <mat-chip-listbox class="deceased-chips">
            @for (person of grave().deceasedPersons.slice(1, 3); track person.id) {
            <mat-chip-option disabled>
              {{ person.firstName }} {{ person.lastName }}
            </mat-chip-option>
            } @if (grave().deceasedPersons.length > 3) {
            <mat-chip-option disabled> +{{ grave().deceasedPersons.length - 3 }} </mat-chip-option>
            }
          </mat-chip-listbox>
        </div>
        }

        <!-- Daty życia pierwszej osoby -->
        @if (grave().deceasedPersons[0]) {
        <div class="dates">
          @if (grave().deceasedPersons[0].birthDate) {
          <div>
            <mat-icon>cake</mat-icon>
            <span>{{ grave().deceasedPersons[0].birthDate | dateFormat }}</span>
          </div>
          } @if (grave().deceasedPersons[0].deathDate) {
          <div>
            <mat-icon>event_busy</mat-icon>
            <span>{{ grave().deceasedPersons[0].deathDate | dateFormat }}</span>
          </div>
          }
        </div>
        }

        <!-- Przypomnienie o płatności -->
        @if (isPaymentDueSoon()) {
        <div class="payment-warning">
          <mat-icon color="warn">warning</mat-icon>
          <span>Opłata wygasa {{ grave().paymentDueDate | dateFormat : 'short' }}</span>
        </div>
        }

        <!-- Ostatnia wizyta -->
        @if (grave().lastVisited) {
        <div class="last-visited">
          <mat-icon>schedule</mat-icon>
          <span>Ostatnio odwiedzony {{ grave().lastVisited | dateFormat : 'relative' }}</span>
        </div>
        }
      </mat-card-content>

      <mat-card-actions>
        <button mat-button [routerLink]="['/graves', grave().id]" color="primary">
          <mat-icon>info</mat-icon>
          Szczegóły
        </button>
        @if (grave().distance !== undefined) {
        <button mat-button (click)="onNavigate()">
          <mat-icon>directions</mat-icon>
          Nawiguj
        </button>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      .grave-card {
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
      }

      mat-card-header {
        margin-bottom: 16px;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
        margin-bottom: 12px;
      }

      .grave-info {
        flex: 1;
      }

      .no-name {
        color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
        font-style: italic;
      }

      .distance-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: rgba(46, 125, 50, 0.1);
        border-radius: 12px;
        color: #2e7d32;
        font-size: 14px;
        font-weight: 500;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .grave-image {
        width: 100%;
        height: 200px;
        background-size: cover;
        background-position: center;
        border-radius: 8px;
        margin-bottom: 16px;

        &.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;

          mat-icon {
            font-size: 64px;
            width: 64px;
            height: 64px;
            color: rgba(0, 0, 0, 0.2);
          }
        }
      }

      mat-card-content {
        padding-top: 0;
      }

      .deceased-list {
        margin-bottom: 12px;
      }

      .deceased-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .dates {
        display: flex;
        align-items: center;
        gap: 16px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
        margin-bottom: 8px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 4px;
        }

        > * {
          display: flex;
          align-items: center;
        }
      }

      .payment-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #fff3e0;
        border-radius: 4px;
        color: #e65100;
        font-size: 14px;
        margin-bottom: 8px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .last-visited {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 13px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      mat-card-actions {
        display: flex;
        justify-content: space-between;
        padding: 8px 16px;

        button {
          mat-icon {
            margin-right: 4px;
          }
        }

        .more-button {
          margin-left: auto;
        }
      }

      @media (max-width: 599px) {
        .grave-card {
          margin: 0;
        }

        mat-card-header {
          margin-bottom: 12px;
        }

        .header-content {
          flex-direction: column;
          gap: 8px;
        }

        .distance-badge {
          align-self: flex-start;
          font-size: 13px;
          padding: 4px 10px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }

        .grave-image {
          height: 140px;
          margin-bottom: 12px;

          &.placeholder mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
          }
        }

        mat-card-title {
          font-size: 18px;
          line-height: 1.3;
        }

        mat-card-subtitle {
          font-size: 13px;
        }

        .dates {
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          font-size: 13px;
        }

        .payment-warning {
          font-size: 13px;
          padding: 6px 10px;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }

        .last-visited {
          font-size: 12px;
        }

        mat-card-actions {
          padding: 6px 12px;
          flex-wrap: wrap;
          gap: 4px;

          button {
            font-size: 13px;
            padding: 0 12px;

            mat-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
            }
          }
        }
      }
    `,
  ],
})
export class GraveCardComponent {
  grave = input.required<GraveWithDistance>();
  navigate = output<string>();

  primaryPhoto = computed(() => {
    const graveData = this.grave();
    const primary = graveData.photos.find((p) => p.isPrimary);
    return primary?.thumbnailUrl || primary?.url || graveData.photos[0]?.url;
  });

  isPaymentDueSoon = computed(() => {
    const graveData = this.grave();
    if (!graveData.paymentDueDate) return false;

    const dueDate = new Date(graveData.paymentDueDate);
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    return dueDate <= oneMonthFromNow && dueDate >= new Date();
  });

  onNavigate(): void {
    this.navigate.emit(this.grave().id);
  }
}
