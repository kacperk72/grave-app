/** Wersja regulaminu i polityki prywatności — ta sama liczba co TERMS_VERSION w aplikacji. */
export const TERMS_VERSION = 1;

/** Wersja zgody z ciała zapytania albo null (brak / śmieci / wersja z przyszłości). */
export function parseTermsVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= TERMS_VERSION
    ? value
    : null;
}
