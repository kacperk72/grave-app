import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SpaceService } from '../../core/services/space.service';
import { GraveService } from '../graves/services/grave.service';
import { IndexedDbService } from '../../core/services/indexeddb.service';
import { ApiError } from '../../core/services/family-api';
import { IconComponent } from '../../shared/components/icon.component';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { LOCAL_SPACE_ID, Profile } from '../../shared/models/space.model';
import { pluralPl } from '../../shared/utils/grave-display';

/** Zakładanie rodzinnej mapy: nazwa, podpis założyciela i co zrobić z grobami z „Moje". */
@Component({
  selector: 'app-create-space-page',
  imports: [RouterLink, IconComponent, ProfileFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <a class="round-btn round-btn--sm back" routerLink="/settings" aria-label="Wróć">
        <app-icon name="arrow-left" [size]="20" />
      </a>
      <h1>Nowa rodzinna mapa</h1>
      <p class="lead">Każdy, kto dostanie link, dołączy i zobaczy groby z tej mapy.</p>

      <label class="field">
        <span>Nazwa mapy</span>
        <input
          type="text"
          maxlength="40"
          [value]="name()"
          (input)="name.set($any($event.target).value)"
        />
      </label>

      @if (localCount() > 0) {
      <fieldset class="choice">
        <legend>Groby z „Moje" ({{ localText() }})</legend>
        <label>
          <input type="radio" name="move" [checked]="move()" (change)="move.set(true)" />
          Przenieś na nową mapę
        </label>
        <label>
          <input type="radio" name="move" [checked]="!move()" (change)="move.set(false)" />
          Zostaw w „Moje"
        </label>
      </fieldset>
      }

      <app-profile-form
        [requireTerms]="true"
        nameLabel="Twój podpis na mapie"
        submitLabel="Utwórz mapę"
        busyLabel="Tworzę mapę…"
        [busy]="busy()"
        (submitted)="create($event)"
      />
      @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .screen {
        max-width: 560px;
        margin: 0 auto;
        padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .back {
        align-self: flex-start;
      }
      h1 {
        margin: 0;
        font-size: 28px;
      }
      .lead {
        margin: 0;
        color: var(--ink-muted);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink-muted);
        input {
          height: 48px;
          padding: 0 14px;
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          background: var(--card);
          color: var(--ink);
          font: inherit;
          font-size: 16px;
          font-weight: 400;
        }
      }
      .choice {
        margin: 0;
        padding: 12px 14px;
        border: none;
        border-radius: var(--radius-md);
        background: var(--card);
        display: flex;
        flex-direction: column;
        gap: 8px;
        legend {
          padding: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-muted);
        }
        label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
        }
      }
      .error {
        margin: 0;
        color: var(--danger);
      }
    `,
  ],
})
export class CreateSpacePageComponent {
  private readonly spaces = inject(SpaceService);
  private readonly db = inject(IndexedDbService);
  private readonly graveService = inject(GraveService);
  private readonly router = inject(Router);

  readonly name = signal('Rodzinna mapa');
  readonly move = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly localCount = signal(0);
  readonly localText = computed(() => {
    const n = this.localCount();
    return `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
  });

  constructor() {
    this.db.graveIds(LOCAL_SPACE_ID).then((ids) => this.localCount.set(ids.length));
  }

  async create(profile: Profile): Promise<void> {
    const name = this.name().replace(/\s+/g, ' ').trim();
    if (!name) {
      this.error.set('Podaj nazwę mapy.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const space = await this.spaces.create(name, profile, this.move());
      await this.graveService.loadGraves();
      this.router.navigate(['/mapy', space.id], { replaceUrl: true });
    } catch (err) {
      this.error.set(
        err instanceof ApiError ? err.message : 'Nie udało się utworzyć mapy. Sprawdź internet.'
      );
    } finally {
      this.busy.set(false);
    }
  }
}
