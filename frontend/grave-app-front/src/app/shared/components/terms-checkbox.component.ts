import { ChangeDetectionStrategy, Component, model } from '@angular/core';

/** Zgoda na regulamin — dokumenty w nowej karcie, żeby nie zgubić wypełnionego formularza. */
@Component({
  selector: 'app-terms-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="terms">
      <input
        type="checkbox"
        [checked]="accepted()"
        (change)="accepted.set($any($event.target).checked)"
      />
      <span>
        Akceptuję <a href="/regulamin" target="_blank" rel="noopener">Regulamin</a> i zapoznałem/am
        się z <a href="/prywatnosc" target="_blank" rel="noopener">Polityką prywatności</a>
      </span>
    </label>
  `,
  styles: [
    `
      .terms {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 14px 16px;
        border-radius: var(--radius-sm);
        background: var(--card);
        font-size: 14px;
        line-height: 1.45;
        cursor: pointer;
      }
      input {
        width: 22px;
        height: 22px;
        margin: 0;
        flex-shrink: 0;
        accent-color: var(--ink);
      }
      a {
        color: var(--ink);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
    `,
  ],
})
export class TermsCheckboxComponent {
  readonly accepted = model(false);
}
