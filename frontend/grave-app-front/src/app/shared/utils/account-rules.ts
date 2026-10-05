const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const BANNER_PAUSE_MS = 7 * 24 * 60 * 60 * 1000;

/** Ta sama normalizacja co w Workerze (`worker/src/accounts.ts`). */
export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function passwordProblem(value: string): string | null {
  if (value.length < MIN_PASSWORD) return `Hasło musi mieć co najmniej ${MIN_PASSWORD} znaków`;
  if (value.length > MAX_PASSWORD) return `Hasło może mieć najwyżej ${MAX_PASSWORD} znaków`;
  return null;
}

/** Pasek „Zaloguj się, żeby nie stracić grobów” na Starcie. */
export function shouldShowLoginBanner(input: {
  loggedIn: boolean;
  graveCount: number;
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (input.loggedIn || input.graveCount === 0) return false;
  return input.dismissedAt === null || input.now - input.dismissedAt > BANNER_PAUSE_MS;
}
