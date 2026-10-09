import { readStorage, writeStorage } from '../core/services/storage';

/** Wersja regulaminu i polityki prywatności — ta sama liczba co TERMS_VERSION w Workerze. */
export const TERMS_VERSION = 1;
/** Data obowiązywania bieżącej wersji (ustawiana na dzień wydania). */
export const TERMS_DATE = '9.10.2026';
export const CONTACT_EMAIL = 'kontakt@znajdzgroby.pl';

const TERMS_KEY = 'znajdzgroby-terms';

/** Wersja zaakceptowana na tym urządzeniu (0 = żadna). */
export function acceptedTermsVersion(): number {
  return Number(readStorage(TERMS_KEY)) || 0;
}

export function needsTermsAcceptance(accepted = acceptedTermsVersion()): boolean {
  return accepted < TERMS_VERSION;
}

export function markTermsAccepted(): void {
  writeStorage(TERMS_KEY, String(TERMS_VERSION));
}
