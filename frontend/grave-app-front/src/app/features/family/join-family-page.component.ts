import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { ApiError, InvitePreview } from '../../core/services/family-api';
import { markOnboardingSeen } from '../../core/services/onboarding';
import { IconComponent } from '../../shared/components/icon.component';
import { AvatarStackComponent } from '../../shared/components/avatar.component';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { Profile } from '../../shared/models/space.model';
import { pluralPl } from '../../shared/utils/grave-display';

type View =
  | { kind: 'loading' }
  | { kind: 'ready'; preview: InvitePreview }
  | { kind: 'same'; name: string }
  | { kind: 'invalid' }
  | { kind: 'offline' };

/**
 * Ekran otwierany z linku zaproszenia `/rodzina#<klucz>`. Klucz czytamy z części
 * po `#` i od razu usuwamy go z paska adresu, żeby nie został w historii.
 */
@Component({
  selector: 'app-join-family-page',
  imports: [RouterLink, IconComponent, AvatarStackComponent, ProfileFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <span class="badge"><app-icon name="users" [size]="30" /></span>

      @switch (view().kind) { @case ('loading') {
      <h1>Sprawdzam link…</h1>
      } @case ('ready') { @if (preview(); as p) {
      <h1>Dołącz do mapy „{{ p.name }}"</h1>
      <div class="who">
        <app-avatar-stack [people]="p.members" [max]="5" [size]="32" />
        <span>{{ membersText() }} · {{ gravesText() }}</span>
      </div>
      <div class="note">
        <app-icon name="users" [size]="20" />
        <span>Twoje groby z innych map nie zostaną wysłane na tę mapę.</span>
      </div>
      <app-profile-form
        submitLabel="Dołącz"
        busyLabel="Dołączam…"
        nameLabel="Jak cię podpisać w rodzinie?"
        [busy]="busy()"
        (submitted)="join($event)"
      />
      <a class="pill-btn pill-btn--light skip" routerLink="/start" (click)="skip()">Nie teraz</a>
      @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      } } } @case ('same') {
      <h1>Już jesteś na tej mapie</h1>
      <p class="lead">„{{ sameName() }}" jest już w tym telefonie — przełączyłem na nią.</p>
      <div class="actions">
        <a class="cta" routerLink="/start">
          Przejdź do grobów
          <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
        </a>
      </div>
      } @case ('invalid') {
      <h1>Ten link nie działa</h1>
      <p class="lead">
        Jest niepełny albo założyciel mapy wygenerował już nowy. Poproś o aktualny link.
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

      .who {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
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

      .skip {
        height: 56px;
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
  private readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);
  private readonly router = inject(Router);

  private readonly token = readTokenFromUrl();

  readonly view = signal<View>({ kind: 'loading' });
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly preview = computed(() => {
    const v = this.view();
    return v.kind === 'ready' ? v.preview : null;
  });
  readonly sameName = computed(() => {
    const v = this.view();
    return v.kind === 'same' ? v.name : '';
  });
  readonly membersText = computed(() => {
    const n = this.preview()?.members.length ?? 0;
    return `${n} ${pluralPl(n, 'osoba', 'osoby', 'osób')}`;
  });
  readonly gravesText = computed(() => {
    const n = this.preview()?.graves ?? 0;
    return n === 0 ? 'jeszcze bez grobów' : `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')}`;
  });

  constructor() {
    this.check();
  }

  async check(): Promise<void> {
    if (!this.token) {
      this.view.set({ kind: 'invalid' });
      return;
    }
    this.view.set({ kind: 'loading' });
    try {
      await this.spaces.ready;
      const preview = await this.spaces.preview(this.token);
      const known = this.spaces.findForInvite(this.token, preview);
      if (known && known.status === 'active') {
        this.spaces.setActive(known.id);
        markOnboardingSeen();
        this.view.set({ kind: 'same', name: known.name });
        return;
      }
      this.view.set({ kind: 'ready', preview });
    } catch (err) {
      this.view.set({ kind: err instanceof ApiError && err.status === 401 ? 'invalid' : 'offline' });
    }
  }

  async join(profile: Profile): Promise<void> {
    const preview = this.preview();
    if (!this.token || !preview || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.spaces.join(this.token, preview, profile);
      this.sync.sync();
      markOnboardingSeen();
      this.router.navigate(['/start'], { replaceUrl: true });
    } catch (err) {
      this.error.set(
        err instanceof ApiError && err.status !== 401
          ? err.message
          : 'Nie udało się dołączyć. Sprawdź internet i spróbuj ponownie.'
      );
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
