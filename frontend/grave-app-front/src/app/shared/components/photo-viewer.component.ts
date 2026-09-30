import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { GravePhoto } from '../models/grave.model';
import { PhotoService } from '../../core/services/photo.service';
import { IconComponent } from './icon.component';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const SWIPE_PX = 60;

/**
 * Zdjęcie na pełnym ekranie z przybliżaniem: dwa palce (pinch), podwójne stuknięcie,
 * kółko myszy; przybliżone zdjęcie przesuwa się palcem, a nieprzybliżone —
 * przesunięte w bok — przechodzi do następnego zdjęcia grobu.
 */
@Component({
  selector: 'app-photo-viewer',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': 'label()',
    // Na całym dokumencie: po stuknięciu w zdjęcie fokus nie jest już w oknie
    '(document:keydown)': 'onKey($event)',
  },
  template: `
    <div
      class="stage"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (wheel)="onWheel($event)"
    >
      @if (src(); as url) {
      <img
        [src]="url"
        [alt]="alt()"
        draggable="false"
        [style.transform]="transform()"
        [class.animated]="animated()"
      />
      } @else {
      <span class="loading">Wczytuję zdjęcie…</span>
      }
    </div>

    <div class="bar">
      @if (photos().length > 1) {
      <span class="counter">{{ index() + 1 }} / {{ photos().length }}</span>
      } @else {
      <span></span>
      }
      <button #closeBtn type="button" class="round" aria-label="Zamknij" (click)="closed.emit()">
        <app-icon name="close" [size]="22" />
      </button>
    </div>

    @if (photos().length > 1) {
    <button type="button" class="round nav nav--prev" aria-label="Poprzednie zdjęcie" (click)="go(-1)">
      <app-icon name="arrow-left" [size]="22" />
    </button>
    <button type="button" class="round nav nav--next" aria-label="Następne zdjęcie" (click)="go(1)">
      <app-icon name="arrow-right" [size]="22" />
    </button>
    }

    @if (scale() === 1) {
    <p class="hint" aria-hidden="true">Rozsuń palce albo stuknij dwa razy, aby przybliżyć</p>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 3000;
        display: block;
        background: #0c0c0b;
        color: #ffffff;
        outline: none;
      }

      .stage {
        position: absolute;
        inset: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: none; // gesty obsługujemy sami
        cursor: zoom-in;
      }

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
        transform-origin: 0 0;
        will-change: transform;

        &.animated {
          transition: transform 0.22s ease;
        }
      }

      .loading {
        font-size: 14px;
        color: #c9c6bf;
      }

      .bar {
        position: absolute;
        top: calc(12px + env(safe-area-inset-top, 0px));
        left: 16px;
        right: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        pointer-events: none;

        > * {
          pointer-events: auto;
        }
      }

      .counter {
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        font-size: 14px;
        font-weight: 500;
      }

      .round {
        width: 48px;
        height: 48px;
        border: none;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        backdrop-filter: blur(8px);
      }

      .nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);

        &--prev {
          left: 12px;
        }

        &--next {
          right: 12px;
        }

        // Na telefonie przełącza się przesunięciem palca — strzałki tylko przeszkadzają
        @media (pointer: coarse) {
          display: none;
        }
      }

      .hint {
        position: absolute;
        left: 50%;
        bottom: calc(24px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        margin: 0;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        font-size: 13px;
        color: #e7e5df;
        white-space: nowrap;
        pointer-events: none;
      }
    `,
  ],
})
export class PhotoViewerComponent {
  private readonly photoService = inject(PhotoService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  photos = input.required<GravePhoto[]>();
  startIndex = input(0);
  alt = input('Zdjęcie grobu');
  closed = output<void>();

  readonly index = signal(0);
  readonly src = signal<string | undefined>(undefined);
  readonly scale = signal(1);
  private readonly tx = signal(0);
  private readonly ty = signal(0);
  readonly animated = signal(false);

  readonly label = computed(() =>
    this.photos().length > 1 ? `${this.alt()} — ${this.index() + 1} z ${this.photos().length}` : this.alt()
  );
  readonly transform = computed(
    () => `translate(${this.tx()}px, ${this.ty()}px) scale(${this.scale()})`
  );

  // Stan gestów
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch?: { distance: number; scale: number; midX: number; midY: number; tx: number; ty: number };
  private pan?: { x: number; y: number; tx: number; ty: number; startX: number };
  private lastTap = 0;

  constructor() {
    effect(() => this.index.set(this.startIndex()));

    effect((onCleanup) => {
      const photo = this.photos()[this.index()];
      this.src.set(undefined);
      this.reset(false);
      if (!photo) return;
      let active = true;
      onCleanup(() => (active = false));
      // Najpierw miniatura (jest od razu), potem pełna rozdzielczość
      this.photoService.url(photo, 'thumb').then((url) => active && !this.src() && this.src.set(url));
      this.photoService.url(photo, 'full').then((url) => active && url && this.src.set(url));
    });

    afterNextRender(() => {
      this.closeBtn()?.nativeElement.focus();
      document.body.style.overflow = 'hidden';
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  go(step: number): void {
    const count = this.photos().length;
    if (count < 2) return;
    this.index.set((this.index() + step + count) % count);
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closed.emit();
    else if (event.key === 'ArrowRight') this.go(1);
    else if (event.key === 'ArrowLeft') this.go(-1);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    this.zoomAt(event.clientX, event.clientY, this.scale() * factor, false);
  }

  onPointerDown(event: PointerEvent): void {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.animated.set(false);

    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pan = undefined;
      this.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: this.scale(),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        tx: this.tx(),
        ty: this.ty(),
      };
      return;
    }

    // Podwójne stuknięcie: przybliż w miejscu stuknięcia albo wróć do całości
    const now = Date.now();
    if (now - this.lastTap < DOUBLE_TAP_MS) {
      this.lastTap = 0;
      if (this.scale() > 1) this.reset(true);
      else this.zoomAt(event.clientX, event.clientY, DOUBLE_TAP_SCALE, true);
      return;
    }
    this.lastTap = now;
    this.pan = { x: event.clientX, y: event.clientY, tx: this.tx(), ty: this.ty(), startX: event.clientX };
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = clamp((this.pinch.scale * distance) / this.pinch.distance, MIN_SCALE, MAX_SCALE);
      // Punkt między palcami zostaje pod palcami
      const k = scale / this.pinch.scale;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      this.scale.set(scale);
      this.tx.set(midX - (this.pinch.midX - this.pinch.tx) * k);
      this.ty.set(midY - (this.pinch.midY - this.pinch.ty) * k);
      return;
    }

    if (this.pan && this.scale() > 1) {
      this.tx.set(this.pan.tx + event.clientX - this.pan.x);
      this.ty.set(this.pan.ty + event.clientY - this.pan.y);
    }
  }

  onPointerUp(event: PointerEvent): void {
    const pan = this.pan;
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = undefined;
    if (this.pointers.size > 0) return;
    this.pan = undefined;

    if (this.scale() <= 1.02) {
      // Nieprzybliżone: przesunięcie w bok zmienia zdjęcie
      const dx = pan ? event.clientX - pan.startX : 0;
      if (Math.abs(dx) > SWIPE_PX) this.go(dx < 0 ? 1 : -1);
      else this.reset(true);
    }
  }

  /** Przybliża tak, żeby punkt (x, y) ekranu pozostał w miejscu. */
  private zoomAt(x: number, y: number, target: number, animate: boolean): void {
    const scale = clamp(target, MIN_SCALE, MAX_SCALE);
    if (scale === 1) {
      this.reset(animate);
      return;
    }
    const rect = this.host.nativeElement.getBoundingClientRect();
    const px = x - rect.left;
    const py = y - rect.top;
    const k = scale / this.scale();
    this.animated.set(animate);
    this.tx.set(px - (px - this.tx()) * k);
    this.ty.set(py - (py - this.ty()) * k);
    this.scale.set(scale);
  }

  private reset(animate: boolean): void {
    this.animated.set(animate);
    this.scale.set(1);
    this.tx.set(0);
    this.ty.set(0);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
