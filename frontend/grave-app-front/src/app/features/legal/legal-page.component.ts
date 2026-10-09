import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { IconComponent } from '../../shared/components/icon.component';
import { TERMS_DATE, TERMS_VERSION } from '../../shared/legal';

/** Wspólna ramka dokumentów: „Wróć”, tytuł, wersja; treść przez <ng-content>. */
@Component({
  selector: 'app-legal-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="doc">
      <button type="button" class="round-btn round-btn--sm back" aria-label="Wróć" (click)="back()">
        <app-icon name="arrow-left" [size]="20" />
      </button>
      <h1>{{ title() }}</h1>
      <p class="ver">Wersja {{ version }} · obowiązuje od {{ date }}</p>
      <ng-content />
    </article>
  `,
  styles: [
    `
      .doc { max-width: 680px; margin: 0 auto; padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 48px;
        display: flex; flex-direction: column; gap: 10px; }
      .back { align-self: flex-start; }
      h1 { margin: 6px 0 0; font-size: 30px; }
      .ver { align-self: flex-start; margin: 0 0 6px; padding: 4px 12px; border-radius: var(--radius-pill);
        background: var(--pill); color: var(--ink-muted); font-size: 13px; font-weight: 600; }
      :host ::ng-deep h2 { margin: 18px 0 4px; font-size: 18px; }
      :host ::ng-deep p, :host ::ng-deep li { margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: var(--ink); }
      :host ::ng-deep ol, :host ::ng-deep ul { margin: 0; padding-left: 22px; }
      :host ::ng-deep a { color: var(--ink); text-decoration: underline; text-underline-offset: 2px; }
      :host ::ng-deep table { border-collapse: collapse; width: 100%; font-size: 14px; }
      :host ::ng-deep th, :host ::ng-deep td { text-align: left; vertical-align: top; padding: 8px 6px;
        border-top: 1px solid var(--hairline); }
    `,
  ],
})
export class LegalPageComponent {
  private readonly router = inject(Router);
  readonly title = input.required<string>();
  readonly version = TERMS_VERSION;
  readonly date = TERMS_DATE;

  back(): void {
    // Router numeruje nawigacje w history.state: 1 = pierwsza strona w tej karcie (np. dokument otwarty
    // z checkboxa w nowej karcie) — wtedy nie ma do czego wracać w aplikacji, idziemy do Ustawień
    const navigationId = (history.state as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navigationId > 1) history.back();
    else void this.router.navigateByUrl('/settings');
  }
}
