import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sidenav-header">
      <span class="brand-mark"><i class="pi pi-map-marker"></i></span>
      <div class="brand-text">
        <h2>GraveMap</h2>
        <span class="tagline">Pamięć i kierunek</span>
      </div>
    </div>

    <nav class="nav-list">
      <a routerLink="/map" routerLinkActive="active" (click)="close.emit()" class="nav-item">
        <span class="nav-icon"><i class="pi pi-map"></i></span>
        <span class="nav-copy">
          <span class="nav-title">Mapa</span>
          <span class="nav-sub">Nawigacja na cmentarzu</span>
        </span>
      </a>
      <a routerLink="/graves" routerLinkActive="active" (click)="close.emit()" class="nav-item">
        <span class="nav-icon"><i class="pi pi-list"></i></span>
        <span class="nav-copy">
          <span class="nav-title">Moje groby</span>
          <span class="nav-sub">Zapisane lokalizacje</span>
        </span>
      </a>
      <a routerLink="/settings" routerLinkActive="active" (click)="close.emit()" class="nav-item">
        <span class="nav-icon"><i class="pi pi-cog"></i></span>
        <span class="nav-copy">
          <span class="nav-title">Ustawienia</span>
          <span class="nav-sub">Offline i dane</span>
        </span>
      </a>
    </nav>

    <button type="button" class="theme-toggle" (click)="theme.toggle()">
      <span class="nav-icon">
        <i class="pi" [class.pi-sun]="theme.mode() === 'dark'" [class.pi-moon]="theme.mode() === 'light'"></i>
      </span>
      <span class="nav-copy">
        <span class="nav-title">{{ theme.mode() === 'dark' ? 'Tryb dzienny' : 'Tryb wieczorny' }}</span>
        <span class="nav-sub">na cmentarzu</span>
      </span>
    </button>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--surface);
        color: var(--ink);
      }

      .sidenav-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 26px 22px 22px;
        border-bottom: 1px solid var(--hairline);
      }

      .brand-mark {
        width: 46px;
        height: 46px;
        border-radius: var(--radius-pill);
        background: var(--forest);
        color: #fbf9f3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 10px rgba(45, 50, 40, 0.22);

        i {
          font-size: 20px;
        }
      }

      .brand-text h2 {
        margin: 0;
        font-family: var(--font-serif);
        font-weight: 600;
        font-size: 21px;
        color: var(--ink);
      }

      .brand-text .tagline {
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }

      .nav-list {
        padding: 14px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
      }

      .nav-item,
      .theme-toggle {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 14px;
        border-radius: var(--radius-md);
        text-decoration: none;
        color: var(--ink);
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .nav-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border-radius: var(--radius-sm);
        background: var(--beige);
        color: var(--sage);
        display: inline-flex;
        align-items: center;
        justify-content: center;

        i {
          font-size: 17px;
        }
      }

      .nav-copy {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }

      .nav-title {
        font-family: var(--font-serif);
        font-size: 16px;
        font-weight: 600;
        color: var(--ink);
      }

      .nav-sub {
        font-size: 12px;
        color: var(--ink-muted);
      }

      .nav-item:hover,
      .theme-toggle:hover {
        background: var(--paper-2);
      }

      .nav-item.active {
        background: color-mix(in srgb, var(--forest) 14%, transparent);

        .nav-icon {
          background: var(--forest);
          color: #fbf9f3;
        }

        .nav-title {
          color: var(--forest-strong);
        }
      }

      .theme-toggle {
        margin: 8px 12px 20px;
        border: 1px solid var(--hairline);
        background: var(--paper);
        text-align: left;
        font: inherit;
      }
    `,
  ],
})
export class SidenavComponent {
  protected readonly theme = inject(ThemeService);
  close = output<void>();
}
