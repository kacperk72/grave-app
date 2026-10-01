import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { AvatarComponent } from './avatar.component';
import { IconComponent } from './icon.component';
import { Profile } from '../models/space.model';
import { AVATAR_COLORS, AVATAR_COLOR_LABELS, AvatarColor, colorFor } from '../utils/member-display';
import { readProfile } from '../../core/services/profile';

/** Podpis tego telefonu na mapie: imię i kolor awatara, z podglądem. */
@Component({
  selector: 'app-profile-form',
  imports: [AvatarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="pf" (submit)="$event.preventDefault(); submit()">
      <div class="pf__row">
        <app-avatar [name]="name().trim() || '?'" [color]="color()" [size]="52" />
        <label class="pf__field">
          <span class="pf__label">{{ nameLabel() }}</span>
          <input
            type="text"
            maxlength="40"
            autocomplete="given-name"
            placeholder="np. Kasia"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </label>
      </div>
      <div class="pf__colors" role="radiogroup" aria-label="Kolor awatara">
        @for (c of colors; track c) {
        <button
          type="button"
          role="radio"
          [class]="'pf__swatch avatar-color--' + c"
          [class.active]="color() === c"
          [attr.aria-checked]="color() === c"
          [attr.aria-label]="labels[c]"
          (click)="pick(c)"
        ></button>
        }
      </div>
      <button type="submit" class="cta" [disabled]="busy() || !valid()">
        {{ busy() ? busyLabel() : submitLabel() }}
        <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
      </button>
    </form>
  `,
  styles: [
    `
      .pf {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .pf__row {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .pf__field {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pf__label {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink-muted);
      }
      input {
        height: 48px;
        padding: 0 14px;
        border: 1px solid var(--hairline);
        border-radius: var(--radius-sm);
        background: var(--card);
        color: var(--ink);
        font: inherit;
        font-size: 16px;
      }
      .pf__colors {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pf__swatch {
        width: 36px;
        height: 36px;
        border: 2px solid transparent;
        border-radius: var(--radius-pill);
        cursor: pointer;
        &.active {
          border-color: var(--ink);
        }
      }
    `,
  ],
})
export class ProfileFormComponent {
  readonly submitLabel = input('Dalej');
  readonly busyLabel = input('Zapisuję…');
  readonly nameLabel = input('Jak się podpisać?');
  readonly busy = input(false);
  readonly submitted = output<Profile>();

  readonly colors = AVATAR_COLORS;
  readonly labels = AVATAR_COLOR_LABELS;

  private readonly saved = readProfile();
  readonly name = signal(this.saved?.name ?? '');
  /** Kolor wybrany ręcznie; bez wyboru — stały kolor z imienia. */
  private readonly picked = signal<AvatarColor | null>(this.saved?.color ?? null);
  readonly color = computed(() => this.picked() ?? colorFor(this.name().trim() || '?'));

  readonly valid = computed(() => {
    const chars = [...this.name().replace(/\s+/g, ' ').trim()].length;
    return chars > 0 && chars <= 40;
  });

  pick(color: AvatarColor): void {
    this.picked.set(color);
  }

  submit(): void {
    if (!this.valid() || this.busy()) return;
    this.submitted.emit({ name: this.name().replace(/\s+/g, ' ').trim(), color: this.color() });
  }
}
