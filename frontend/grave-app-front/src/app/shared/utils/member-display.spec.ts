import { describe, expect, it } from 'vitest';
import {
  AVATAR_COLORS,
  colorFor,
  initials,
  isAvatarColor,
  lastSeenText,
  relativeTime,
} from './member-display';

const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 1, 12);

describe('initials', () => {
  it('pierwsza litera imienia i nazwiska', () => expect(initials('Kacper Kubit')).toBe('KK'));
  it('jedno słowo → jedna wielka litera', () => expect(initials('ania')).toBe('A'));
  it('nadmiarowe spacje i środkowe imię', () => expect(initials('  Anna   Maria  Nowak ')).toBe('AN'));
  it('polskie znaki', () => expect(initials('łucja żak')).toBe('ŁŻ'));
  it('nie rozcina emoji', () => expect(initials('🌷 Ania')).toBe('🌷A'));
  it('puste imię → ?', () => expect(initials('   ')).toBe('?'));
});

describe('colorFor', () => {
  it('ten sam tekst → ten sam kolor', () => expect(colorFor('Ania')).toBe(colorFor('Ania')));
  it('kolor z palety', () => expect(AVATAR_COLORS).toContain(colorFor('Kacper')));
});

describe('isAvatarColor', () => {
  it('przyjmuje kolor z palety', () => expect(isAvatarColor('sage')).toBe(true));
  it('odrzuca inne wartości', () => {
    expect(isAvatarColor('red')).toBe(false);
    expect(isAvatarColor(undefined)).toBe(false);
  });
});

describe('lastSeenText', () => {
  it('brak synchronizacji', () => expect(lastSeenText(null, NOW)).toBe('jeszcze bez synchronizacji'));
  it('przed chwilą', () => expect(lastSeenText(NOW - 30_000, NOW)).toBe('online przed chwilą'));
  it('minuty', () => expect(lastSeenText(NOW - 5 * MIN, NOW)).toBe('online 5 min temu'));
  it('godziny', () => expect(lastSeenText(NOW - 3 * 60 * MIN, NOW)).toBe('online 3 godz. temu'));
  it('jeden dzień', () => expect(lastSeenText(NOW - 24 * 60 * MIN, NOW)).toBe('online 1 dzień temu'));
  it('kilka dni', () => expect(lastSeenText(NOW - 3 * 24 * 60 * MIN, NOW)).toBe('online 3 dni temu'));
  it('tygodnie', () =>
    expect(lastSeenText(NOW - 21 * 24 * 60 * MIN, NOW)).toBe('brak aktywności od 3 tyg.'));
  it('czas z przyszłości (rozjechany zegar) → przed chwilą', () =>
    expect(lastSeenText(NOW + 5 * MIN, NOW)).toBe('online przed chwilą'));
});

describe('relativeTime', () => {
  it('przed chwilą', () => expect(relativeTime(NOW - 10_000, NOW)).toBe('przed chwilą'));
  it('minuty', () => expect(relativeTime(NOW - 7 * MIN, NOW)).toBe('7 min temu'));
  it('dni', () => expect(relativeTime(NOW - 2 * 24 * 60 * MIN, NOW)).toBe('2 dni temu'));
});
