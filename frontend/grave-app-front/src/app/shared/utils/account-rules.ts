import { pluralPl } from './grave-display';

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

export type FamilyEffect = 'leave' | 'transfer' | 'delete';

export interface FamilyDeletionEffect {
  spaceId: string;
  name: string;
  effect: FamilyEffect;
  heir?: string;
}

/** Odpowiedź `GET /account/deletion`. */
export interface DeletionPreview {
  personal: { graves: number; photos: number };
  families: FamilyDeletionEffect[];
}

export function personalDeletionText({ graves, photos }: { graves: number; photos: number }): string {
  if (graves === 0 && photos === 0) return '„Moje” jest puste';
  return `„Moje” — ${graves} ${pluralPl(graves, 'grób', 'groby', 'grobów')} i ${photos} ${pluralPl(
    photos,
    'zdjęcie',
    'zdjęcia',
    'zdjęć'
  )} zostanie usuniętych`;
}

export function familyDeletionText(f: FamilyDeletionEffect): string {
  switch (f.effect) {
    case 'transfer':
      return `„${f.name}” — wychodzisz, rola założyciela przejdzie na: ${f.heir}. Twoje groby zostają dla rodziny.`;
    case 'delete':
      return `„${f.name}” — nikogo poza Tobą tu nie ma, mapa zostanie usunięta razem z grobami i zdjęciami.`;
    default:
      return `„${f.name}” — wychodzisz. Twoje groby zostają dla rodziny.`;
  }
}
