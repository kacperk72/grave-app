import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AccountService } from '../../core/services/account.service';
import { ApiError } from '../../core/services/family-api';
import { markOnboardingSeen } from '../../core/services/onboarding';
import { IconComponent } from '../../shared/components/icon.component';
import { normalizeEmail, passwordProblem } from '../../shared/utils/account-rules';
import { pluralPl } from '../../shared/utils/grave-display';

type Step = 'login' | 'email' | 'code' | 'password' | 'done';

/**
 * Logowanie e-mailem i hasłem. „Załóż konto” i „Nie pamiętam hasła” to ten sam przepływ:
 * e-mail → kod z maila → ustawienie hasła. Link z maila (`/logowanie#<link>`) pomija wpisywanie kodu.
 */
@Component({
  selector: 'app-login-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <a class="round-btn round-btn--sm back" routerLink="/settings" aria-label="Wróć">
        <app-icon name="arrow-left" [size]="20" />
      </a>

      @switch (step()) {
        @case ('login') {
          <h1>Zaloguj się</h1>
          <p class="lead">
            Twoje groby i zdjęcia będą na każdym urządzeniu, na którym się zalogujesz.
          </p>
          <form (submit)="$event.preventDefault(); login()">
            <label class="field"
              ><span>E-mail</span>
              <input
                type="email"
                autocomplete="email"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
              />
            </label>
            <label class="field"
              ><span>Hasło</span>
              <span class="pw">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="current-password"
                  [value]="password()"
                  (input)="password.set($any($event.target).value)"
                />
                <button
                  type="button"
                  class="pw__toggle"
                  (click)="showPassword.set(!showPassword())"
                >
                  {{ showPassword() ? 'Ukryj' : 'Pokaż' }}
                </button>
              </span>
            </label>
            <button type="submit" class="cta" [disabled]="busy()">
              {{ busy() ? 'Loguję…' : 'Zaloguj' }}
            </button>
          </form>
          <button type="button" class="link" (click)="startSetup('reset')">
            Nie pamiętam hasła
          </button>
          <button type="button" class="link" (click)="startSetup('register')">
            Nie mam konta — załóż
          </button>
        }
        @case ('email') {
          <h1>{{ mode() === 'register' ? 'Załóż konto' : 'Nowe hasło' }}</h1>
          <p class="lead">
            Wyślemy na Twój e-mail 6-cyfrowy kod, żeby potwierdzić, że adres jest Twój.
          </p>
          <form (submit)="$event.preventDefault(); sendCode()">
            <label class="field"
              ><span>E-mail</span>
              <input
                type="email"
                autocomplete="email"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
              />
            </label>
            <button type="submit" class="cta" [disabled]="busy()">
              {{ busy() ? 'Wysyłam…' : 'Wyślij kod' }}
            </button>
          </form>
          <button type="button" class="link" (click)="step.set('login')">
            Mam już hasło — zaloguj się
          </button>
        }
        @case ('code') {
          <h1>Wpisz kod z maila</h1>
          <p class="lead">Wysłaliśmy kod na {{ email() }}. Sprawdź też folder „Spam”.</p>
          <form (submit)="$event.preventDefault(); checkCode()">
            <label class="field"
              ><span>Kod (6 cyfr)</span>
              <input
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="7"
                [value]="code()"
                (input)="code.set($any($event.target).value)"
              />
            </label>
            <button type="submit" class="cta" [disabled]="busy()">
              {{ busy() ? 'Sprawdzam…' : 'Dalej' }}
            </button>
          </form>
          <button type="button" class="link" [disabled]="resendIn() > 0" (click)="sendCode()">
            {{ resendIn() > 0 ? 'Wyślij ponownie za ' + resendIn() + ' s' : 'Wyślij ponownie' }}
          </button>
        }
        @case ('password') {
          <h1>Ustaw hasło</h1>
          <p class="lead">Konto: {{ email() }}</p>
          <form (submit)="$event.preventDefault(); savePassword()">
            <label class="field"
              ><span>Hasło (min. 8 znaków)</span>
              <span class="pw">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="new-password"
                  [value]="password()"
                  (input)="password.set($any($event.target).value)"
                />
                <button
                  type="button"
                  class="pw__toggle"
                  (click)="showPassword.set(!showPassword())"
                >
                  {{ showPassword() ? 'Ukryj' : 'Pokaż' }}
                </button>
              </span>
            </label>
            <button type="submit" class="cta" [disabled]="busy()">
              {{ busy() ? 'Zapisuję…' : 'Zapisz hasło' }}
            </button>
          </form>
        }
        @case ('done') {
          <h1>Gotowe</h1>
          <p class="lead">{{ doneText() }}</p>
          <a class="cta" routerLink="/start">Przejdź do grobów</a>
        }
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .screen {
        max-width: 520px;
        margin: 0 auto;
        padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 32px;
        display: flex;
        flex-direction: column;
        gap: 14px;
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
        line-height: 1.45;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
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
        font-weight: 400;
        width: 100%;
        box-sizing: border-box;
      }
      .pw {
        position: relative;
        display: block;
      }
      .pw input {
        padding-right: 76px;
      }
      .pw__toggle {
        position: absolute;
        right: 8px;
        top: 8px;
        height: 32px;
        padding: 0 10px;
        border: none;
        border-radius: var(--radius-pill);
        background: var(--pill);
        color: var(--ink);
        font-size: 13px;
        cursor: pointer;
      }
      .link {
        align-self: flex-start;
        padding: 6px 0;
        border: none;
        background: none;
        color: var(--ink-muted);
        font-size: 14px;
        text-decoration: underline;
        cursor: pointer;
      }
      .link:disabled {
        text-decoration: none;
        cursor: default;
      }
      .error {
        margin: 0;
        color: var(--danger);
        font-size: 14px;
      }
    `,
  ],
})
export class LoginPageComponent {
  private readonly account = inject(AccountService);
  private readonly router = inject(Router);

  readonly step = signal<Step>('login');
  readonly mode = signal<'register' | 'reset'>('register');
  readonly email = signal(this.account.session()?.email ?? '');
  readonly password = signal('');
  readonly code = signal('');
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly resendIn = signal(0);
  readonly doneText = signal('');
  private setupToken = '';
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    markOnboardingSeen();
    // Link z maila (`/logowanie#<link>`): przy otwarciu strony i gdy karta z `/logowanie` była już
    // otwarta (zmienia się tylko `#`). Fragment z routera, bo to router obsługuje zmianę adresu.
    inject(ActivatedRoute)
      .fragment.pipe(takeUntilDestroyed())
      .subscribe((fragment) => {
        const link = decodeURIComponent(fragment ?? '').trim();
        if (link) this.consumeLink(link);
      });
  }

  private consumeLink(link: string): void {
    void this.router.navigateByUrl('/logowanie', { replaceUrl: true });
    this.run(async () => {
      const res = await this.account.verify({ link });
      this.setupToken = res.setupToken;
      this.email.set(res.email);
      this.step.set('password');
    });
  }

  login(): void {
    const email = normalizeEmail(this.email());
    if (!email || !this.password()) {
      this.error.set('Podaj e-mail i hasło');
      return;
    }
    this.run(async () => this.finish(await this.account.login(email, this.password())));
  }

  startSetup(mode: 'register' | 'reset'): void {
    this.mode.set(mode);
    this.error.set(null);
    this.step.set('email');
  }

  sendCode(): void {
    const email = normalizeEmail(this.email());
    if (!email) {
      this.error.set('Podaj poprawny adres e-mail');
      return;
    }
    this.run(async () => {
      await this.account.requestCode(email);
      this.email.set(email);
      this.step.set('code');
      this.startResendTimer();
    });
  }

  checkCode(): void {
    const code = this.code().replace(/\s/g, '');
    this.run(async () => {
      const res = await this.account.verify({ email: this.email(), code });
      this.setupToken = res.setupToken;
      this.step.set('password');
    });
  }

  savePassword(): void {
    const problem = passwordProblem(this.password());
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.run(async () =>
      this.finish(await this.account.setPassword(this.setupToken, this.password())),
    );
  }

  private finish(res: { movedGraves: number }): void {
    this.password.set('');
    this.doneText.set(
      res.movedGraves > 0
        ? `Przenoszę ${res.movedGraves} ${pluralPl(res.movedGraves, 'grób', 'groby', 'grobów')} z „Moje” na konto — zdjęcia wyślą się w tle.`
        : 'Jesteś zalogowany. Twoje mapy są teraz na koncie.',
    );
    this.step.set('done');
  }

  private startResendTimer(): void {
    clearInterval(this.timer);
    this.resendIn.set(60);
    this.timer = setInterval(() => {
      this.resendIn.update((n) => Math.max(0, n - 1));
      if (this.resendIn() === 0) clearInterval(this.timer);
    }, 1000);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (err) {
      this.error.set(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Coś poszło nie tak. Spróbuj ponownie.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
