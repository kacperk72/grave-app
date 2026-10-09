import { ChangeDetectionStrategy, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';

import { AccountService } from '../../core/services/account.service';
import { ApiError } from '../../core/services/family-api';
import {
  DeletionPreview,
  familyDeletionText,
  personalDeletionText,
} from '../../shared/utils/account-rules';

/** „Usuń konto”: podsumowanie skutków z serwera, potwierdzenie hasłem. */
@Component({
  selector: 'app-delete-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #sheet class="sheet" aria-label="Usuń konto" (close)="reset()" (click)="onDialogClick($event)">
      <div class="sheet__inner">
        <h2>Usunąć konto?</h2>
        @if (preview(); as p) {
          <p class="lead">Tego nie da się cofnąć. Co się stanie:</p>
          <ul class="effects">
            <li>{{ personalText(p.personal) }}</li>
            @for (f of p.families; track f.spaceId) {
              <li>{{ familyText(f) }}</li>
            }
          </ul>
          <form (submit)="$event.preventDefault(); confirm()">
            <label class="field">
              <span>Hasło</span>
              <input type="password" autocomplete="current-password" [value]="password()"
                (input)="password.set($any($event.target).value)" />
            </label>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button type="submit" class="danger" [disabled]="busy() || !password()">
              {{ busy() ? 'Usuwam…' : 'Usuń konto na zawsze' }}
            </button>
          </form>
        } @else if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        } @else {
          <p class="lead">Sprawdzam, co zostanie usunięte…</p>
        }
        <button type="button" class="pill-btn pill-btn--light" (click)="close()">Anuluj</button>
      </div>
    </dialog>
  `,
  styles: [
    `
      :host { display: contents; }
      .sheet { width: 100%; max-width: 560px; max-height: 90vh; margin: auto auto 0; padding: 0; border: none;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0; background: var(--stone); color: var(--ink);
        box-shadow: var(--shadow-float); }
      .sheet::backdrop { background: rgba(0, 0, 0, 0.35); }
      .sheet__inner { padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px)); display: flex;
        flex-direction: column; gap: 12px; }
      h2 { margin: 0; font-size: 22px; }
      .lead { margin: 0; color: var(--ink-muted); }
      .effects { margin: 0; padding: 6px 16px 6px 34px; border-radius: var(--radius-md); background: var(--card); }
      .effects li { padding: 8px 0; font-size: 14px; line-height: 1.45; }
      form { display: flex; flex-direction: column; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink-muted); }
      input { height: 48px; padding: 0 14px; border: 1px solid var(--hairline); border-radius: var(--radius-sm);
        background: var(--card); color: var(--ink); font: inherit; font-size: 16px; font-weight: 400; }
      .error { margin: 0; color: var(--danger); font-size: 14px; }
      .danger { height: 56px; border: none; border-radius: var(--radius-pill); background: var(--danger);
        color: #fff; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; }
      .danger:disabled { opacity: 0.5; cursor: default; }
    `,
  ],
})
export class DeleteAccountDialogComponent {
  private readonly account = inject(AccountService);
  private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
  readonly deleted = output<void>();

  readonly preview = signal<DeletionPreview | null>(null);
  readonly password = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly personalText = personalDeletionText;
  readonly familyText = familyDeletionText;

  async open(): Promise<void> {
    this.sheet().nativeElement.showModal();
    try {
      this.preview.set(await this.account.deletionPreview());
    } catch (err) {
      this.error.set(this.message(err));
    }
  }

  async confirm(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.deleteAccount(this.password());
      this.close();
      this.deleted.emit();
    } catch (err) {
      this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
    }
  }

  close(): void {
    this.sheet().nativeElement.close();
  }

  reset(): void {
    this.preview.set(null);
    this.password.set('');
    this.error.set(null);
  }

  onDialogClick(event: MouseEvent): void {
    if (event.target === this.sheet().nativeElement) this.close();
  }

  private message(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 401) return err.message === 'Hasło jest nieprawidłowe' ? err.message : 'Sesja wygasła — zaloguj się ponownie';
      return err.message;
    }
    return 'Bez internetu nie da się usunąć konta. Spróbuj, gdy wróci zasięg.';
  }
}
