import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const STORAGE_KEY = 'gravemap-onboarded';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true; // bez localStorage nie męczymy ekranem powitalnym przy każdym starcie
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

/** Przy pierwszym uruchomieniu kieruje na ekran powitalny. */
export const onboardingGuard: CanActivateFn = () =>
  hasSeenOnboarding() ? true : inject(Router).createUrlTree(['/welcome']);
