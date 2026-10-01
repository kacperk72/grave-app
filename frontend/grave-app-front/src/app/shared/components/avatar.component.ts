import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { initials } from '../utils/member-display';

/** Awatar członka: inicjały na kolorze z palety. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[attr.aria-label]': 'name()',
    '[attr.title]': 'name()',
    '[class]': "'avatar-color--' + color()",
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.4',
  },
  template: `{{ letters() }}`,
  styles: [
    `
      :host {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        font-weight: 600;
        line-height: 1;
        user-select: none;
      }
    `,
  ],
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly color = input<string>('slate');
  readonly size = input(32);
  readonly letters = computed(() => initials(this.name()));
}

/** Kilka nakładających się awatarów i „+N" dla reszty. */
@Component({
  selector: 'app-avatar-stack',
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (p of shown(); track $index) {
    <app-avatar [name]="p.name" [color]="p.color" [size]="size()" />
    } @if (extra() > 0) {
    <span class="more" [style.height.px]="size()" [style.min-width.px]="size()">+{{ extra() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
      }
      app-avatar,
      .more {
        box-shadow: 0 0 0 2px var(--card);
      }
      app-avatar + app-avatar,
      app-avatar + .more {
        margin-left: -8px;
      }
      .more {
        padding: 0 6px;
        border-radius: var(--radius-pill);
        background: var(--pill);
        color: var(--ink-muted);
        font-size: 11px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class AvatarStackComponent {
  readonly people = input<readonly { name: string; color: string }[]>([]);
  readonly max = input(3);
  readonly size = input(24);
  readonly shown = computed(() => this.people().slice(0, this.max()));
  readonly extra = computed(() => Math.max(0, this.people().length - this.max()));
}
