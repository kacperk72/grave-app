import { describe, expect, it } from 'vitest';
import { photoRejection } from './photo-upload';

describe('photoRejection', () => {
  it('dzienny limit wysyłania (429) → spróbuj później, zdjęcie zostaje w kolejce', () =>
    expect(photoRejection(429)).toBe('later'));
  it('za duże zdjęcie (413) → porzuć, zostaje tylko w telefonie', () =>
    expect(photoRejection(413)).toBe('drop'));
  it('zły format (415) → porzuć', () => expect(photoRejection(415)).toBe('drop'));
  it('brak miejsca na mapie (507) → porzuć', () => expect(photoRejection(507)).toBe('drop'));
  it('inny błąd (np. 500, 401) → przerwij synchronizację mapy', () => {
    expect(photoRejection(500)).toBe('fail');
    expect(photoRejection(401)).toBe('fail');
  });
});
