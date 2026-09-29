import { DeceasedPerson, Grave } from '../models/grave.model';

/**
 * Wspólne formatowanie danych grobu na potrzeby kart, mapy i szczegółów.
 */

/** Ile dni przed terminem opłata trafia do sekcji „Wymaga uwagi". */
export const PAYMENT_WARNING_DAYS = 60;

const DAY_MS = 86_400_000;

export function personName(person: Pick<DeceasedPerson, 'firstName' | 'lastName'>): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function graveTitle(grave: Grave): string {
  const first = grave.deceasedPersons[0];
  return first ? personName(first) : 'Grób bez nazwy';
}

/** „1938 – 2019", „† 2019", „ur. 1938" albo pusty napis. */
export function yearsRange(person: Pick<DeceasedPerson, 'birthDate' | 'deathDate'>): string {
  const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const death = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  if (birth && death) return `${birth} – ${death}`;
  if (death) return `† ${death}`;
  if (birth) return `ur. ${birth}`;
  return '';
}

/** Kwatera/sektor i numer miejsca w jednej linii, np. „sektor 12 · miejsce 4". */
export function placeLine(grave: Pick<Grave, 'sector' | 'graveNumber'>): string {
  const parts: string[] = [];
  if (grave.sector) {
    parts.push(/^(sektor|kw|kwatera)/i.test(grave.sector) ? grave.sector : `sektor ${grave.sector}`);
  }
  if (grave.graveNumber) parts.push(`miejsce ${grave.graveNumber}`);
  return parts.join(' · ');
}

export function primaryPhotoUrl(grave: Grave): string | undefined {
  const primary = grave.photos.find((p) => p.isPrimary) ?? grave.photos[0];
  return primary?.thumbnailUrl || primary?.url;
}

export interface PaymentStatus {
  due: Date;
  days: number; // ujemne = po terminie
  overdue: boolean;
}

/** Stan opłaty, gdy termin minął albo przypada w ciągu PAYMENT_WARNING_DAYS dni. */
export function paymentStatus(grave: Grave, now = new Date()): PaymentStatus | null {
  if (!grave.paymentDueDate) return null;
  const due = new Date(grave.paymentDueDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((startOfDue.getTime() - startOfToday.getTime()) / DAY_MS);
  if (days > PAYMENT_WARNING_DAYS) return null;
  return { due, days, overdue: days < 0 };
}

export function dueLabel(status: PaymentStatus): string {
  if (status.overdue) return 'po terminie';
  if (status.days === 0) return 'dziś';
  if (status.days === 1) return 'jutro';
  return `za ${status.days} dni`;
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Polska odmiana: 1 grób, 2 groby, 5 grobów. */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
