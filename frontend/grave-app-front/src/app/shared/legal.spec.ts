import { describe, expect, it } from 'vitest';
import { TERMS_VERSION, needsTermsAcceptance } from './legal';

describe('needsTermsAcceptance', () => {
  it('bez zgody w tym urządzeniu — trzeba zaakceptować', () => expect(needsTermsAcceptance(0)).toBe(true));
  it('starsza wersja — trzeba zaakceptować', () => expect(needsTermsAcceptance(TERMS_VERSION - 1)).toBe(true));
  it('bieżąca wersja — bez checkboxa', () => expect(needsTermsAcceptance(TERMS_VERSION)).toBe(false));
});
