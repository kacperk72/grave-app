import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bottom-nav" aria-label="Nawigacja główna">
      <a routerLink="/map" routerLinkActive="active" class="tab">
        <i class="pi pi-map"></i>
        <span>Mapa</span>
      </a>
      <a routerLink="/graves" routerLinkActive="active" class="tab">
        <i class="pi pi-list"></i>
        <span>Moje groby</span>
      </a>
      <a routerLink="/settings" routerLinkActive="active" class="tab">
        <i class="pi pi-cog"></i>
        <span>Ustawienia</span>
      </a>
    </nav>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 900;
        display: flex;
        justify-content: space-around;
        align-items: stretch;
        gap: 4px;
        padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
        background: var(--paper);
        border-top: 1px solid var(--hairline);
        box-shadow: 0 -4px 20px rgba(45, 50, 40, 0.06);

        // Tylko mobile / tablet — na desktopie nawigacja przez panel boczny
        @media (min-width: 900px) {
          display: none;
        }
      }

      .tab {
        flex: 1;
        max-width: 140px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 8px 4px;
        border-radius: var(--radius-md);
        text-decoration: none;
        color: var(--ink-muted);
        transition: background 0.15s ease, color 0.15s ease;

        i {
          font-size: 19px;
        }

        span {
          font-family: var(--font-sans);
          font-size: 11.5px;
          font-weight: 600;
        }
      }

      .tab.active {
        color: var(--forest-strong);
        background: color-mix(in srgb, var(--forest) 14%, transparent);
      }
    `,
  ],
})
export class BottomNavComponent {}
