import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { ApiError } from '../../core/services/family-api';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { Profile } from '../../shared/models/space.model';

/**
 * Jednorazowe okienko po aktualizacji: mapa sprzed list członków czeka na podpis.
 * Pierwszy podpisany zostaje założycielem — wtedy drugi krok: nazwa mapy.
 */
@Component({
  selector: 'app-profile-prompt',
  imports: [ProfileFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (target(); as space) {
    <div class="backdrop" (click)="later()"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="pp-title">
      @if (naming()) {
      <h2 id="pp-title">Nazwij mapę</h2>
      <p>Jesteś jej założycielem. Nazwa pomoże odróżnić ją od innych map.</p>
      <form class="name" (submit)="$event.preventDefault(); rename(space.id)">
        <input
          type="text"
          maxlength="40"
          aria-label="Nazwa mapy"
          [value]="mapName()"
          (input)="mapName.set($any($event.target).value)"
        />
        <button type="submit" class="cta" [disabled]="busy() || !mapName().trim()">Gotowe</button>
      </form>
      } @else {
      <h2 id="pp-title">Rodzinna mapa ma teraz listę osób</h2>
      <p>Podpisz się, żeby rodzina widziała, kto ma dostęp do mapy „{{ space.name }}".</p>
      <app-profile-form submitLabel="Zapisz" [busy]="busy()" (submitted)="save(space.id, $event)" />
      } @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      }
      <button type="button" class="later" (click)="later()">Później</button>
    </section>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1200; // ponad dolną nawigacją (1100)
        background: rgba(0, 0, 0, 0.35);
      }
      .sheet {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1201;
        max-width: 560px;
        margin: 0 auto;
        padding: 24px 20px calc(20px + env(safe-area-inset-bottom, 0px));
        display: flex;
        flex-direction: column;
        gap: 14px;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        background: var(--stone);
        color: var(--ink);
        box-shadow: var(--shadow-float);
      }
      h2 {
        margin: 0;
        font-size: 22px;
      }
      p {
        margin: 0;
        color: var(--ink-muted);
        font-size: 15px;
        line-height: 1.45;
      }
      .name {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .name input {
        height: 48px;
        padding: 0 14px;
        border: 1px solid var(--hairline);
        border-radius: var(--radius-sm);
        background: var(--card);
        color: var(--ink);
        font: inherit;
        font-size: 16px;
      }
      .later {
        align-self: center;
        padding: 8px 12px;
        border: none;
        background: none;
        color: var(--ink-muted);
        font-size: 14px;
        cursor: pointer;
      }
      .error {
        color: var(--danger);
        font-size: 14px;
      }
    `,
  ],
})
export class ProfilePromptComponent {
  private readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);

  /** „Później" chowa okienko do następnego uruchomienia aplikacji. */
  private readonly dismissed = signal(false);
  /** Mapa, której założyciel właśnie nadaje nazwę. */
  private readonly namingId = signal<string | null>(null);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly mapName = signal('Rodzinna mapa');
  readonly naming = computed(() => this.namingId() !== null);

  readonly target = computed(() => {
    if (this.dismissed()) return null;
    const naming = this.namingId();
    const list = this.spaces.spaces();
    return naming
      ? list.find((s) => s.id === naming) ?? null
      : list.find((s) => s.status === 'needs-profile') ?? null;
  });

  async save(spaceId: string, profile: Profile): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const role = await this.spaces.completeProfile(spaceId, profile);
      this.sync.sync();
      if (role === 'owner') {
        this.mapName.set(
          this.spaces.spaces().find((s) => s.id === spaceId)?.name ?? 'Rodzinna mapa'
        );
        this.namingId.set(spaceId);
      }
    } catch (err) {
      this.error.set(
        err instanceof ApiError && err.status === 401
          ? 'Link tej mapy został zmieniony — poproś założyciela o nowy.'
          : 'Nie udało się zapisać. Sprawdź internet i spróbuj ponownie.'
      );
    } finally {
      this.busy.set(false);
    }
  }

  async rename(spaceId: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.spaces.rename(spaceId, this.mapName());
      this.namingId.set(null);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Nie udało się zmienić nazwy.');
    } finally {
      this.busy.set(false);
    }
  }

  later(): void {
    this.namingId.set(null);
    this.dismissed.set(true);
  }
}
