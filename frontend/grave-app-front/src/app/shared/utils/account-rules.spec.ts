import { describe, expect, it } from 'vitest';
import { normalizeEmail, passwordProblem, shouldShowLoginBanner } from './account-rules';

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
