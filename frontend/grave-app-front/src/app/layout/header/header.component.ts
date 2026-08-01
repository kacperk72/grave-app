import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <button
        type="button"
        class="icon-btn"
        (click)="toggleSidenav.emit()"
        aria-label="Otwórz menu"
      >
        <i class="pi pi-bars"></i>
      </button>

      <a class="brand" routerLink="/" aria-label="GraveMap — strona główna">
        <span class="brand-mark">
          <i class="pi pi-map-marker"></i>
        </span>
        <span class="brand-text">
          <span class="brand-name">GraveMap</span>
          <span class="brand-tagline">Pamięć i kierunek</span>
        </span>
      </a>

      <button
        type="button"
        class="icon-btn"
        (click)="theme.toggle()"
        [attr.aria-label]="theme.mode() === 'dark' ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'"
      >
        <i class="pi" [class.pi-sun]="theme.mode() === 'dark'" [class.pi-moon]="theme.mode() === 'light'"></i>
      </button>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .app-header {
        position: sticky;
        top: 0;
        z-index: 100;
        display: grid;
        grid-template-columns: 44px 1fr 44px;
        align-items: center;
        gap: 8px;
        height: 68px;
        padding: 0 16px;
        background: var(--paper);
        border-bottom: 1px solid var(--hairline);

        @media (max-width: 599px) {
          height: 60px;
          padding: 0 12px;
        }
      }

      .icon-btn {
        width: 44px;
        height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        border: 1px solid var(--hairline);
        background: var(--surface);
        color: var(--ink);
        cursor: pointer;
        transition: background 0.15s ease, transform 0.12s ease;

        i {
          font-size: 17px;
        }

        &:hover {
          background: var(--beige);
        }

        &:active {
          transform: scale(0.94);
        }
      }

      .brand {
        justify-self: center;
        display: inline-flex;
        align-items: center;
        gap: 11px;
        text-decoration: none;
        color: inherit;
        user-select: none;
      }

      .brand-mark {
        width: 42px;
        height: 42px;
        border-radius: var(--radius-pill);
        background: var(--forest);
        color: #fbf9f3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 10px rgba(45, 50, 40, 0.22);

        i {
          font-size: 19px;
        }

        @media (max-width: 599px) {
          width: 38px;
          height: 38px;

          i {
            font-size: 17px;
          }
        }
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.05;
      }

      .brand-name {
        font-family: var(--font-serif);
        font-weight: 600;
        font-size: 22px;
        color: var(--ink);

        @media (max-width: 599px) {
          font-size: 19px;
        }
      }

      .brand-tagline {
        font-family: var(--font-sans);
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }
    `,
  ],
})
export class HeaderComponent {
  protected readonly theme = inject(ThemeService);
  toggleSidenav = output<void>();
}
