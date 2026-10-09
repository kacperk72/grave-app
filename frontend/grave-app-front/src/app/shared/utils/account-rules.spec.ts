import { describe, expect, it } from 'vitest';
import { familyDeletionText, personalDeletionText, normalizeEmail, passwordProblem, shouldShowLoginBanner } from './account-rules';

const DAY = 24 * 60 * 60 * 1000;

describe('normalizeEmail', () => {
  it('przycina i zmienia na małe litery', () =>
    expect(normalizeEmail('  Kacper@Example.COM ')).toBe('kacper@example.com'));
  it('odrzuca adres bez @ albo domeny', () => {
    expect(normalizeEmail('kacper')).toBeNull();
    expect(normalizeEmail('kacper@x')).toBeNull();
  });
});

describe('passwordProblem', () => {
  it('za krótkie', () => expect(passwordProblem('abc')).toBe('Hasło musi mieć co najmniej 8 znaków'));
  it('za długie', () =>
    expect(passwordProblem('x'.repeat(129))).toBe('Hasło może mieć najwyżej 128 znaków'));
  it('dobre', () => expect(passwordProblem('dobrehaslo')).toBeNull());
});

describe('shouldShowLoginBanner', () => {
  const base = { loggedIn: false, graveCount: 3, dismissedAt: null, now: 10 * DAY };
  it('niezalogowany z grobami → pokaż', () => expect(shouldShowLoginBanner(base)).toBe(true));
  it('zalogowany → nie', () => expect(shouldShowLoginBanner({ ...base, loggedIn: true })).toBe(false));
  it('bez grobów → nie', () => expect(shouldShowLoginBanner({ ...base, graveCount: 0 })).toBe(false));
  it('„Później” mniej niż 7 dni temu → nie', () =>
    expect(shouldShowLoginBanner({ ...base, dismissedAt: 10 * DAY - 2 * DAY })).toBe(false));
  it('„Później” ponad 7 dni temu → tak', () =>
    expect(shouldShowLoginBanner({ ...base, dismissedAt: 10 * DAY - 8 * DAY })).toBe(true));
});

describe('teksty usunięcia konta', () => {
  it('Moje z grobami i zdjęciami', () =>
    expect(personalDeletionText({ graves: 12, photos: 1 })).toBe('„Moje” — 12 grobów i 1 zdjęcie zostanie usuniętych'));
  it('puste Moje', () => expect(personalDeletionText({ graves: 0, photos: 0 })).toBe('„Moje” jest puste'));
  it('wyjście', () =>
    expect(familyDeletionText({ spaceId: 'a', name: 'Rodzinna Kępa', effect: 'leave' })).toBe(
      '„Rodzinna Kępa” — wychodzisz. Twoje groby zostają dla rodziny.'
    ));
  it('przekazanie roli', () =>
    expect(familyDeletionText({ spaceId: 'a', name: 'Rodzinna Kubit', effect: 'transfer', heir: 'Weronika' })).toBe(
      '„Rodzinna Kubit” — wychodzisz, rola założyciela przejdzie na: Weronika. Twoje groby zostają dla rodziny.'
    ));
  it('usunięcie mapy', () =>
    expect(familyDeletionText({ spaceId: 'a', name: 'Stara', effect: 'delete' })).toBe(
      '„Stara” — nikogo poza Tobą tu nie ma, mapa zostanie usunięta razem z grobami i zdjęciami.'
    ));
});
