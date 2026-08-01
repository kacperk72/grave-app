import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { GraveWithDistance } from '../../../../shared/models/grave.model';
import { GraveCardComponent } from '../grave-card/grave-card.component';

@Component({
  selector: 'app-graves-list',
  imports: [ProgressSpinnerModule, GraveCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="graves-list-container">
      @if (loading()) {
      <div class="loading-overlay">
        <p-progressspinner styleClass="loader" strokeWidth="4" />
        <p>Ładowanie grobów…</p>
      </div>
      } @if (!loading() && graves().length === 0) {
      <div class="empty-state">
        <div class="empty-icon"><i class="pi pi-map-marker"></i></div>
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
      :host {
        display: block;
      }

      .graves-list-container {
        position: relative;
        min-height: 200px;
      }

      .loading-overlay {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 64px 16px;

        p {
          margin: 0;
          color: var(--ink-muted);
        }
      }

      :host ::ng-deep .loader.p-progressspinner {
        width: 48px;
        height: 48px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 64px 16px;
        text-align: center;

        .empty-icon {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-lg);
          background: var(--beige);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          color: var(--sage);
          margin-bottom: 18px;
        }

        h2 {
          margin: 0 0 6px;
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 600;
          color: var(--ink);
        }

        p {
          margin: 0;
          color: var(--ink-muted);
          max-width: 360px;
        }
      }

      .graves-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 18px;

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 1200px) {
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
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
