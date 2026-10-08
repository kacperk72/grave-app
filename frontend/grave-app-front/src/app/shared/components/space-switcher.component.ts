import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { IndexedDbService } from '../../core/services/indexeddb.service';
import { AvatarStackComponent } from './avatar.component';
import { IconComponent } from './icon.component';
import { isShared } from '../models/space.model';
import { visibleSpaces } from '../utils/account-link';
import { pluralPl } from '../utils/grave-display';
import { syncStatusText } from '../utils/sync-status';

/** Pigułka z aktywną mapą; dotknięcie otwiera listę map do przełączenia. */
@Component({
  selector: 'app-space-switcher',
  imports: [RouterLink, AvatarStackComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
    <button
      type="button"
      class="pill"
      (click)="toggle()"
      [attr.aria-expanded]="open()"
      aria-haspopup="dialog"
    >
      @if (activeState(); as state) {
      <span [class]="'dot dot--' + state" aria-hidden="true"></span>
      }
      <span class="pill__name">{{ spaces.activeSpace()?.name ?? 'Moje' }}</span>
      <app-avatar-stack [people]="activePeople()" [size]="22" />
      <app-icon name="chevron-right" [size]="16" class="pill__chev" />
    </button>
    }
    <!-- Natywny <dialog> leży w warstwie najwyższej — ponad nawigacją i nakładką mapy -->
    <dialog
      #sheet
      class="sheet"
      aria-label="Wybierz mapę"
      (close)="open.set(false)"
      (click)="onDialogClick($event)"
    >
      @if (open()) {
      <div class="sheet__inner">
      <h2>Mapy w tym telefonie</h2>
      @for (row of rows(); track row.id) {
      <button type="button" class="map-row" [class.active]="row.active" (click)="choose(row.id)">
        <span class="map-row__text">
          <span class="map-row__name">{{ row.name }}</span>
          <span class="map-row__sub">{{ row.sub }}</span>
        </span>
        <app-avatar-stack [people]="row.people" [size]="24" />
        @if (row.active) {
        <app-icon name="check" [size]="20" [stroke]="2" />
        }
      </button>
      }
      <a class="pill-btn pill-btn--light" routerLink="/mapy/nowa" (click)="close()">
        <app-icon name="plus" [size]="18" /> Utwórz rodzinną mapę
      </a>
      <p class="hint">Masz link od rodziny? Otwórz go na tym telefonie.</p>
      </div>
      }
    </dialog>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .pill {
        align-self: flex-start;
        height: 34px;
        max-width: 100%;
        padding: 0 10px 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: none;
        border-radius: var(--radius-pill);
        background: var(--card);
        color: var(--ink);
        box-shadow: var(--shadow-card);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .pill__name {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .pill__chev {
        color: var(--ink-faint);
        transform: rotate(90deg);
      }
      .dot {
        width: 8px;
        height: 8px;
        flex-shrink: 0;
        border-radius: var(--radius-pill);
        background: var(--ok);
        &--syncing {
          background: var(--locate);
        }
        &--offline,
        &--off {
          background: var(--ink-faint);
        }
        &--error,
        &--revoked,
        &--removed {
          background: var(--danger);
        }
      }
      .sheet {
        width: 100%;
        max-width: 560px;
        max-height: 80vh;
        margin: auto auto 0;
        padding: 0;
        border: none;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        background: var(--stone);
        color: var(--ink);
        box-shadow: var(--shadow-float);
        &::backdrop {
          background: rgba(0, 0, 0, 0.35);
        }
      }
      .sheet__inner {
        padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      h2 {
        margin: 0 4px 6px;
        font-size: 18px;
      }
      .map-row {
        min-height: 60px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 2px solid transparent;
        border-radius: var(--radius-md);
        background: var(--card);
        color: var(--ink);
        font: inherit;
        text-align: left;
        cursor: pointer;
        &.active {
          border-color: var(--ink);
        }
      }
      .map-row__text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .map-row__name {
        font-size: 15px;
        font-weight: 600;
      }
      .map-row__sub {
        font-size: 13px;
        color: var(--ink-muted);
      }
      .pill-btn {
        margin-top: 6px;
        gap: 8px;
      }
      .hint {
        margin: 4px 4px 0;
        font-size: 13px;
        color: var(--ink-muted);
      }
    `,
  ],
})
export class SpaceSwitcherComponent {
  readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);
  private readonly db = inject(IndexedDbService);

  readonly open = signal(false);
  private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
  private readonly counts = signal<Record<string, number>>({});

  readonly visible = computed(() => this.spaces.sharedSpaces().length > 0);
  readonly activeState = computed(() => {
    const active = this.spaces.activeSpace();
    return active && isShared(active) ? this.sync.syncOf(active.id).state : null;
  });
  readonly activePeople = computed(() => this.spaces.members()[this.spaces.activeSpaceId()] ?? []);

  readonly rows = computed(() =>
    visibleSpaces(this.spaces.spaces()).map((s) => {
      const n = this.counts()[s.id] ?? 0;
      const graves = `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
      const sub =
        s.kind === 'personal'
          ? `${graves} · na koncie`
          : isShared(s)
            ? `${graves} · ${syncStatusText(this.sync.syncOf(s.id), s.syncedAt)}`
            : `${graves} · tylko w tym telefonie`;
      return {
        id: s.id,
        name: s.name,
        sub,
        active: s.id === this.spaces.activeSpaceId(),
        people: this.spaces.members()[s.id] ?? [],
      };
    })
  );

  async toggle(): Promise<void> {
    this.open.set(true);
    this.sheet().nativeElement.showModal();
    this.counts.set(await this.db.countBySpace());
  }

  close(): void {
    this.sheet().nativeElement.close();
  }

  /** Dotknięcie tła (poza zawartością) zamyka panel. */
  onDialogClick(event: MouseEvent): void {
    if (event.target === this.sheet().nativeElement) this.close();
  }

  choose(id: string): void {
    this.spaces.setActive(id);
    this.close();
    this.spaces.loadMembers(id).catch(() => {});
  }
}
