import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BottomNavComponent } from './layout/bottom-nav/bottom-nav.component';
import { ThemeService } from './core/services/theme.service';
import { AppUpdateService } from './core/services/app-update.service';
import { injectCurrentUrl } from './core/services/current-url';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Wstrzyknięcie od razu nakłada zapisany motyw, zanim wyrenderuje się pierwszy ekran.
  private readonly theme = inject(ThemeService);
  protected readonly update = inject(AppUpdateService);
  private readonly currentUrl = injectCurrentUrl();

  private readonly path = computed(() => this.currentUrl().split(/[?#]/)[0]);

  // Ekrany „w głąb" (powitanie, szczegóły, formularz) mają własne przyciski powrotu
  // i nie pokazują dolnej nawigacji.
  readonly showNav = computed(() => {
    const p = this.path();
    return !(p.startsWith('/welcome') || p.startsWith('/graves/'));
  });
}
