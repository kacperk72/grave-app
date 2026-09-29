import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

const STORAGE_KEY = 'gravemap-theme';

/**
 * Zarządza motywem jasny/ciemny/systemowy. Klasa `.app-dark` na <html> jest
 * współdzielona z presetem PrimeNG (darkModeSelector) oraz tokenami CSS aplikacji.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media =
    typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly preference = signal<ThemePreference>(this.readInitial());

  /** Motyw faktycznie widoczny na ekranie. */
  readonly mode = computed<ThemeMode>(() => {
    const pref = this.preference();
    if (pref === 'system') return this.systemDark() ? 'dark' : 'light';
    return pref;
  });

  constructor() {
    this.media?.addEventListener('change', (e) => {
      this.systemDark.set(e.matches);
      this.apply();
    });
    this.apply();
  }

  toggle(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    this.apply();
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // localStorage niedostępny — motyw działa tylko w tej sesji
    }
  }

  private apply(): void {
    const dark = this.mode() === 'dark';
    document.documentElement.classList.toggle('app-dark', dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', dark ? '#121211' : '#f3f2ef');
  }

  private readInitial(): ThemePreference {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {
      // ignore
    }
    return 'system';
  }
}
