import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { DialogModule } from 'primeng/dialog';

export interface GalleryRef {
  graveId: string;
  index: number;
}

@Component({
  selector: 'app-gallery-dialog',
  imports: [DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: 'min(900px, 96vw)', height: 'min(720px, 90vh)' }"
      styleClass="gallery-dialog"
    >
      @if (active(); as g) {
      <div class="gallery-placeholder">
        <div class="badge">Zdjęcie {{ g.index + 1 }}</div>
        <p>Placeholder – tutaj będzie podgląd zdjęcia w pełnym ekranie</p>
      </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .gallery-dialog .p-dialog-content {
        padding: 0;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        color: white;
      }

      .gallery-placeholder {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 24px;
        color: rgba(255, 255, 255, 0.9);

        .badge {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }
      }
    `,
  ],
})
export class GalleryDialogComponent {
  visible = model<boolean>(false);
  active = input<GalleryRef | undefined>(undefined);
}
