import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent, IconName } from '../../shared/components/icon.component';
import { injectCurrentUrl } from '../../core/services/current-url';

interface NavItem {
  id: 'start' | 'map' | 'route' | 'settings';
  label: string;
  icon: IconName;
  link: string;
  query?: Record<string, string>;
}

/**
 * Pływająca grafitowa pigułka nawigacji. Aktywna zakładka rozwija się
 * w białą pigułkę z podpisem; pozostałe to same ikony.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bottom-nav" aria-label="Nawigacja główna">
      @for (item of items; track item.id) {
      <a
        class="tab"
        [class.active]="active() === item.id"
        [routerLink]="item.link"
        [queryParams]="item.query ?? null"
        [attr.aria-current]="active() === item.id ? 'page' : null"
        [attr.aria-label]="active() === item.id ? null : item.label"
      >
        <app-icon [name]="item.icon" />
        @if (active() === item.id) {
        <span>{{ item.label }}</span>
        }
      </a>
      }
    </nav>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .bottom-nav {
        position: fixed;
        z-index: 1100;
        left: 50%;
        bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        width: min(420px, calc(100% - 40px));
        height: 68px;
        padding: 0 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: var(--radius-pill);
        background: #171715;
        box-shadow: 0 12px 32px rgba(23, 23, 21, 0.22);
      }

      // Na ciemnym tle pigułka jaśnieje o ton, żeby się nie zlewała
      :host-context(.app-dark) .bottom-nav {
        background: #2a2927;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
      }

      .tab {
        height: 48px;
        min-width: 48px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: var(--radius-pill);
        color: #c9c6bf;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.2s ease, color 0.2s ease, padding 0.2s ease;

        &:hover:not(.active) {
          color: #ffffff;
        }

        &.active {
          padding: 0 18px 0 14px;
          background: #ffffff;
          color: #171715;
        }
      }
    `,
  ],
})
export class BottomNavComponent {
  private readonly url = injectCurrentUrl();

  readonly items: NavItem[] = [
    { id: 'start', label: 'Start', icon: 'home', link: '/start' },
    { id: 'map', label: 'Mapa', icon: 'map', link: '/map' },
    { id: 'route', label: 'Trasa', icon: 'route', link: '/map', query: { panel: 'route' } },
    { id: 'settings', label: 'Ustawienia', icon: 'sliders', link: '/settings' },
  ];

  readonly active = computed<NavItem['id'] | null>(() => {
    const url = this.url();
    if (url.startsWith('/map')) return url.includes('panel=route') ? 'route' : 'map';
    if (url.startsWith('/settings')) return 'settings';
    if (url.startsWith('/start')) return 'start';
    return null;
  });
}
