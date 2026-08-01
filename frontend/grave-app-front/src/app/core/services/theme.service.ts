import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'gravemap-theme';

/**
 * Zarządza motywem jasny/ciemny. Klasa `.app-dark` na <html> jest współdzielona
 * z presetem PrimeNG (darkModeSelector) oraz tokenami CSS aplikacji.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readInitial());

  constructor() {
    this.apply(this.mode());
  }

  toggle(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    this.apply(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage niedostępny — motyw działa tylko w tej sesji
    }
  }

  private apply(mode: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle('app-dark', mode === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', mode === 'dark' ? '#23281f' : '#f3eee3');
  }

  private readInitial(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
