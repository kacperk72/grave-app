import { pluralPl } from './grave-display';

/** Paleta awatarów — ta sama lista co w Workerze (`worker/src/members.ts`). */
export const AVATAR_COLORS = ['sage', 'clay', 'sky', 'plum', 'sand', 'slate', 'rose', 'moss'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const AVATAR_COLOR_LABELS: Record<AvatarColor, string> = {
  sage: 'szałwia',
  clay: 'glina',
  sky: 'niebo',
  plum: 'śliwka',
  sand: 'piasek',
  slate: 'łupek',
  rose: 'róża',
  moss: 'mech',
};

export function isAvatarColor(value: unknown): value is AvatarColor {
  return typeof value === 'string' && (AVATAR_COLORS as readonly string[]).includes(value);
}

/** „Kacper Kubit" → „KK", „ania" → „A". Znaki liczone jako punkty Unicode — emoji się nie rozpada. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : '';
  return (first + last).toLocaleUpperCase('pl-PL');
}

/** Stały kolor dla tekstu — podpowiedź przy pierwszym podpisie. */
export function colorFor(seed: string): AvatarColor {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** „5 min temu", „3 godz. temu", „2 dni temu" — bez podmiotu, do wstawienia w zdanie. */
export function relativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < 2 * MIN) return 'przed chwilą';
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min temu`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} godz. temu`;
  const days = Math.floor(diff / DAY);
  return `${days} ${pluralPl(days, 'dzień', 'dni', 'dni')} temu`;
}

/** Aktywność członka na liście: „online 5 min temu", „brak aktywności od 3 tyg.". */
export function lastSeenText(lastSeenAt: number | null, now = Date.now()): string {
  if (lastSeenAt === null) return 'jeszcze bez synchronizacji';
  const diff = now - lastSeenAt;
  if (diff >= WEEK) return `brak aktywności od ${Math.floor(diff / WEEK)} tyg.`;
  return `online ${relativeTime(lastSeenAt, now)}`;
}
