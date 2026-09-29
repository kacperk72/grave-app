import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

/** Jak często sprawdzać, czy na serwerze jest nowe wydanie, gdy aplikacja jest otwarta. */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Wykrywa nowe wydanie aplikacji (PWA). Service worker pobiera nową wersję w tle,
 * a my pokazujemy prośbę o odświeżenie — bez tego użytkownik widziałby starą
 * wersję aż do drugiego ponownego uruchomienia.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  // W trybie deweloperskim i w testach service worker nie jest zarejestrowany
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  readonly updateReady = signal(false);

  constructor() {
    const sw = this.swUpdate;
    if (!sw?.isEnabled) return;

    sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));

    const check = () => sw.checkForUpdate().catch(() => undefined);
    setInterval(check, CHECK_INTERVAL_MS);
    // Telefon zwykle wybudza aplikację z tła, zamiast ją restartować — sprawdź przy powrocie
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }

  reload(): void {
    document.location.reload();
  }
}
