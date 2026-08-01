import { describe, it, expect } from 'vitest';
import { parseGoogleMapsLocation } from './google-maps-location';

describe('parseGoogleMapsLocation', () => {
  it('wyłuskuje pozycję pinezki z !3d/!4d (preferowane nad @viewport)', () => {
    const url =
      "https://www.google.pl/maps/place/49%C2%B036'45.4%22N+21%C2%B038'55.7%22E/" +
      '@49.6126172,21.5725762,13z/data=!4m4!3m3!8m2!3d49.6126172!4d21.6487939?entry=tts';
    const res = parseGoogleMapsLocation(url);
    expect(res).toEqual({
      kind: 'coords',
      lat: 49.6126172,
      lng: 21.6487939, // z !4d, nie z @ (21.5725762)
      source: 'pin',
    });
  });

  it('używa @lat,lng gdy brak !3d/!4d', () => {
    const url = 'https://www.google.com/maps/@50.0619,19.9369,15z';
    const res = parseGoogleMapsLocation(url);
    expect(res).toEqual({ kind: 'coords', lat: 50.0619, lng: 19.9369, source: 'viewport' });
  });

  it('parsuje DMS ze ścieżki /place/ (zakodowane URL-em)', () => {
    const url =
      "https://www.google.pl/maps/place/49%C2%B036'45.4%22N+21%C2%B038'55.7%22E";
    const res = parseGoogleMapsLocation(url);
    expect(res.kind).toBe('coords');
    if (res.kind === 'coords') {
      expect(res.source).toBe('dms');
      expect(res.lat).toBeCloseTo(49.612611, 4);
      expect(res.lng).toBeCloseTo(21.648806, 4);
    }
  });

  it('parsuje same współrzędne dziesiętne', () => {
    expect(parseGoogleMapsLocation('49.6126, 21.6488')).toEqual({
      kind: 'coords',
      lat: 49.6126,
      lng: 21.6488,
      source: 'raw',
    });
    expect(parseGoogleMapsLocation('50.0619 19.9369')).toEqual({
      kind: 'coords',
      lat: 50.0619,
      lng: 19.9369,
      source: 'raw',
    });
  });

  it('krótki link bez współrzędnych → needs-expand', () => {
    const url = 'https://maps.app.goo.gl/H5c3ExxrJDMBjuH47';
    expect(parseGoogleMapsLocation(url)).toEqual({ kind: 'needs-expand', url });
  });

  it('stary krótki format goo.gl/maps → needs-expand', () => {
    const url = 'https://goo.gl/maps/abcDEF123';
    expect(parseGoogleMapsLocation(url)).toEqual({ kind: 'needs-expand', url });
  });

  it('link do zapisanej listy (tylko ID, brak współrzędnych) → invalid', () => {
    const url =
      'https://www.google.pl/maps/@/data=!3m1!4b1!4m3!11m2!2s_y65UKhSqHjZaH9uQOCF78JeNeM_8Q!3e3';
    expect(parseGoogleMapsLocation(url)).toEqual({ kind: 'invalid' });
  });

  it('pusty/śmieciowy input → invalid', () => {
    expect(parseGoogleMapsLocation('')).toEqual({ kind: 'invalid' });
    expect(parseGoogleMapsLocation('   ')).toEqual({ kind: 'invalid' });
    expect(parseGoogleMapsLocation('to nie jest link')).toEqual({ kind: 'invalid' });
  });

  it('współrzędne poza zakresem → invalid', () => {
    expect(parseGoogleMapsLocation('120.0, 200.0')).toEqual({ kind: 'invalid' });
  });
});
