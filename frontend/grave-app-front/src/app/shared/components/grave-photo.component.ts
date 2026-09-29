import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Zdjęcie grobu wypełniające rodzica (object-fit: cover). Gdy grób nie ma
 * zdjęcia, pokazuje spokojną ilustrację — jedną z trzech, dobraną stale po `seed`,
 * żeby karty różnych grobów nie wyglądały identycznie.
 */
@Component({
  selector: 'app-grave-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src()) {
    <img [src]="src()" [alt]="alt()" loading="lazy" />
    } @else { @switch (scene()) { @case (0) {
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="300" fill="#CDBFB1" />
      <circle cx="286" cy="112" r="36" fill="#E8DBCA" />
      <path d="M0 188C80 160 150 176 222 160S340 148 400 164V300H0Z" fill="#9A9287" />
      <path d="M0 226C90 204 200 214 282 200S370 204 400 210V300H0Z" fill="#6B665D" />
      <path d="M72 236C66 196 72 140 79 104C86 140 92 196 86 236Z" fill="#383B32" />
      <path d="M106 238C102 204 106 166 112 144C118 166 122 204 118 238Z" fill="#383B32" />
      <path d="M214 262V232a22 22 0 0 1 44 0V262Z" fill="#BFB6AA" />
      <path d="M268 262V242a15 15 0 0 1 30 0V262Z" fill="#ADA498" />
      <rect y="258" width="400" height="42" fill="#3B3A35" />
    </svg>
    } @case (1) {
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="300" fill="#C4CCBD" />
      <path
        d="M0 170L40 90L80 170ZM50 180L100 70L150 180ZM130 175L175 95L220 175ZM200 185L255 60L310 185ZM290 175L335 90L380 175ZM350 180L390 110L430 180Z"
        fill="#5A6A55"
      />
      <path
        d="M-20 215L30 120L80 215ZM60 220L120 105L180 220ZM170 222L225 125L280 222ZM260 218L320 110L380 218Z"
        fill="#3E4B3B"
      />
      <rect y="210" width="400" height="90" fill="#6F7565" />
      <path d="M160 300C185 260 205 240 200 210L214 210C224 240 236 262 260 300Z" fill="#BDB8A8" />
    </svg>
    } @default {
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
    } } }
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
  src = input<string | undefined>(undefined);
  seed = input<string>('');
  alt = input<string>('');

  protected readonly scene = computed(() => {
    let hash = 0;
    for (const ch of this.seed()) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(hash) % 3;
  });
}
