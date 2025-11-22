import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { GraveWithDistance } from '../../../../shared/models/grave.model';
import { GraveCardComponent } from '../grave-card/grave-card.component';

/**
 * Komponent listy grobów
 * Wyświetla kartki grobów w grid layout
 */
@Component({
  selector: 'app-graves-list',
  imports: [MatProgressSpinnerModule, GraveCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="graves-list-container">
      @if (loading()) {
      <div class="loading-overlay">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Ładowanie grobów...</p>
      </div>
      } @if (!loading() && graves().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">🪦</div>
        <h2>{{ emptyMessage() }}</h2>
        <p>{{ emptyHint() }}</p>
      </div>
      } @if (!loading() && graves().length > 0) {
      <div class="graves-grid">
        @for (grave of graves(); track grave.id) {
        <app-grave-card [grave]="grave" (navigate)="onNavigate($event)" />
        }
      </div>
      }
    </div>
  `,
  styles: [
    `
      .graves-list-container {
        position: relative;
        min-height: 200px;
      }

      .loading-overlay {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 48px 16px;

        p {
          margin: 0;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        text-align: center;

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.87);
        }

        p {
          margin: 0;
          color: rgba(0, 0, 0, 0.6);
          max-width: 400px;
        }
      }

      .graves-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 24px;
        padding: 16px;

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
          gap: 16px;
          padding: 8px;
        }

        @media (min-width: 1200px) {
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
        }
      }
    `,
  ],
})
export class GravesListComponent {
  graves = input<GraveWithDistance[]>([]);
  loading = input<boolean>(false);
  emptyMessage = input<string>('Brak grobów');
  emptyHint = input<string>('Dodaj pierwszy grób klikając przycisk + poniżej');

  navigate = output<string>();

  onNavigate(graveId: string): void {
    this.navigate.emit(graveId);
  }
}
