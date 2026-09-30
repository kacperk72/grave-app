import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { GravePhoto } from '../models/grave.model';
import { PhotoVariant } from '../../core/services/indexeddb.service';
import { PhotoService } from '../../core/services/photo.service';

/**
 * Zdjęcie grobu wypełniające rodzica (object-fit: cover). Bajty wczytuje
 * PhotoService (telefon → rodzinna mapa). Gdy grób nie ma zdjęcia albo jeszcze się
 * wczytuje, pokazuje ilustrację nagrobka ze zniczami.
 */
@Component({
  selector: 'app-grave-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src()) {
    <img [src]="src()" [alt]="alt()" loading="lazy" />
    } @else {
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="300" fill="#7E8675" />
      <circle cx="60" cy="60" r="70" fill="#6D7565" />
      <circle cx="360" cy="50" r="80" fill="#6D7565" />
      <path d="M120 300V120a80 80 0 0 1 160 0V300Z" fill="#D9D3C9" />
      <rect x="158" y="130" width="84" height="46" rx="4" fill="#C4BDB1" />
      <rect x="170" y="144" width="60" height="4" rx="2" fill="#A39B8E" />
      <rect x="178" y="156" width="44" height="4" rx="2" fill="#A39B8E" />
      <rect y="250" width="400" height="50" fill="#4E5446" />
      <rect x="176" y="222" width="18" height="30" rx="3" fill="#8E3B2E" />
      <circle cx="185" cy="214" r="5" fill="#EFB45E" />
      <rect x="206" y="226" width="18" height="26" rx="3" fill="#E9E2D6" />
      <circle cx="215" cy="219" r="4.5" fill="#EFB45E" />
    </svg>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        overflow: hidden;
        background: var(--stone-2);
      }
      img,
      svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    `,
  ],
})
export class GravePhotoComponent {
  private readonly photos = inject(PhotoService);

  photo = input<GravePhoto | undefined>(undefined);
  variant = input<PhotoVariant>('thumb');
  alt = input<string>('');

  protected readonly src = signal<string | undefined>(undefined);

  constructor() {
    effect((onCleanup) => {
      const photo = this.photo();
      const variant = this.variant();
      this.src.set(undefined);
      if (!photo) return;
      let active = true;
      onCleanup(() => (active = false));
      this.photos
        .url(photo, variant)
        .then((url) => {
          if (active) this.src.set(url);
        })
        .catch(() => undefined);
    });
  }
}
