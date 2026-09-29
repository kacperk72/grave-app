import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FamilySyncService } from '../../core/services/family-sync.service';
import { GraveService } from '../graves/services/grave.service';
import { markOnboardingSeen } from '../../core/services/onboarding';
import { IconComponent } from '../../shared/components/icon.component';
import { pluralPl } from '../../shared/utils/grave-display';

type View =
  | { kind: 'loading' }
  | { kind: 'ready'; graves: number }
  | { kind: 'same' }
  | { kind: 'invalid' }
  | { kind: 'offline' };

/**
 * Ekran otwierany z rodzinnego linku `/rodzina#<klucz>`. Klucz czytamy z części
 * po `#` i od razu usuwamy go z paska adresu, żeby nie został w historii.
 */
@Component({
  selector: 'app-join-family-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <span class="badge"><app-icon name="users" [size]="30" /></span>

      @switch (view().kind) { @case ('loading') {
      <h1>Sprawdzam link…</h1>
      } @case ('ready') {
      <h1>Dołącz do rodzinnej mapy</h1>
      <p class="lead">
        Na wspólnej mapie {{ remoteText() }}. Zmiany, które ktoś wprowadzi, pojawią się u
        wszystkich.
      </p>

      @if (localCount() > 0) {
      <div class="note">
        <app-icon name="upload" [size]="20" />
        <span>
          {{ localText() }} z tego telefonu też trafi na wspólną mapę. Nic nie zniknie i nic się nie
          zdubluje.
        </span>
      </div>
      } @if (sync.connected()) {
      <div class="note note--warn">
        <app-icon name="alert" [size]="20" />
        <span>Ten telefon jest w innej rodzinnej mapie. Dołączenie odłączy go od niej.</span>
      </div>
      }

      <p class="hint">Każdy, kto ma ten link, widzi te groby i może je zmieniać.</p>

      <div class="actions">
        <button type="button" class="cta" [disabled]="busy()" (click)="join()">
          {{ busy() ? 'Dołączam…' : 'Dołącz' }}
          <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
        </button>
        <a class="pill-btn pill-btn--light" routerLink="/start" (click)="skip()">Nie teraz</a>
      </div>
      @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      } } @case ('same') {
      <h1>Już jesteś na tej mapie</h1>
      <p class="lead">Ten telefon korzysta z tego rodzinnego linku.</p>
      <div class="actions">
        <a class="cta" routerLink="/start">
          Przejdź do grobów
          <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
        </a>
      </div>
      } @case ('invalid') {
      <h1>Ten link nie działa</h1>
      <p class="lead">
        Jest niepełny albo ktoś z rodziny wygenerował już nowy. Poproś o aktualny link.
      </p>
      <div class="actions">
        <a class="pill-btn pill-btn--light" routerLink="/start" (click)="skip()">Przejdź do aplikacji</a>
      </div>
      } @case ('offline') {
      <h1>Brak połączenia</h1>
      <p class="lead">Do dołączenia potrzebny jest internet. Spróbuj ponownie za chwilę.</p>
      <div class="actions">
        <button type="button" class="cta" (click)="check()">
          Spróbuj ponownie
          <span class="cta__arrow"><app-icon name="refresh" [size]="20" /></span>
        </button>
      </div>
      } }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .screen {
        max-width: 520px;
        margin: 0 auto;
        padding: calc(48px + env(safe-area-inset-top, 0px)) 24px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .badge {
        width: 72px;
        height: 72px;
        margin-bottom: 8px;
        border-radius: 24px;
        background: var(--ink);
        color: var(--on-ink);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      h1 {
        margin: 0;
        font-size: 32px;
        line-height: 1.1;
      }

      .lead {
        margin: 0;
        font-size: 16px;
        line-height: 1.5;
        color: var(--ink-muted);
      }

      .note {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        border-radius: var(--radius-md);
        background: var(--card);
        font-size: 14px;
        line-height: 1.45;

        app-icon {
          margin-top: 1px;
        }

        &--warn {
          background: var(--candle-tint);
          color: var(--candle-ink);
        }
      }

      .hint {
        margin: 0;
        font-size: 13px;
        color: var(--ink-muted);
      }

      .actions {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;

        .pill-btn {
          height: 56px;
        }
      }

      .error {
        margin: 0;
        color: var(--danger);
        font-size: 14px;
      }
    `,
  ],
})
export class JoinFamilyPageComponent {
  readonly sync = inject(FamilySyncService);
  private readonly graveService = inject(GraveService);
  private readonly router = inject(Router);

  private readonly token = readTokenFromUrl();

  readonly view = signal<View>({ kind: 'loading' });
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly localCount = computed(() => this.graveService.gravesCount());
  readonly localText = computed(() => {
    const n = this.localCount();
    return `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
  });
  readonly remoteText = computed(() => {
    const v = this.view();
    const n = v.kind === 'ready' ? v.graves : 0;
    if (n === 0) return 'nie ma jeszcze grobów';
    return `${pluralPl(n, 'jest', 'są', 'jest')} ${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
  });

  constructor() {
    this.check();
  }

  async check(): Promise<void> {
    if (!this.token) {
      this.view.set({ kind: 'invalid' });
      return;
    }
    if (this.sync.token() === this.token) {
      this.view.set({ kind: 'same' });
      return;
    }
    this.view.set({ kind: 'loading' });
    try {
      const { graves } = await this.sync.preview(this.token);
      this.view.set({ kind: 'ready', graves });
    } catch (err) {
      const status = (err as { status?: number }).status;
      this.view.set({ kind: status === 401 ? 'invalid' : 'offline' });
    }
  }

  async join(): Promise<void> {
    if (!this.token || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.sync.join(this.token);
      markOnboardingSeen();
      this.router.navigate(['/start'], { replaceUrl: true });
    } catch {
      this.error.set('Nie udało się dołączyć. Sprawdź internet i spróbuj ponownie.');
    } finally {
      this.busy.set(false);
    }
  }

  skip(): void {
    markOnboardingSeen();
  }
}

function readTokenFromUrl(): string | null {
  const token = decodeURIComponent(window.location.hash.replace(/^#/, '')).trim();
  // Usuń klucz z paska adresu i historii przeglądarki
  if (window.location.hash) {
    history.replaceState(history.state, '', window.location.pathname + window.location.search);
  }
  return /^[A-Za-z0-9_-]{20,}$/.test(token) ? token : null;
}
