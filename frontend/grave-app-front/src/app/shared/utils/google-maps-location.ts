/**
 * Parsowanie lokalizacji z linku Google Maps — w całości po stronie przeglądarki
 * (bez backendu). Obsługuje pojedynczą pinezkę; listy zapisanych miejsc nie są
 * wspierane (nie zawierają współrzędnych w URL-u).
 */

export type GmapsCoordsSource = 'pin' | 'viewport' | 'dms' | 'raw';

export type GmapsParseResult =
  | { kind: 'coords'; lat: number; lng: number; source: GmapsCoordsSource }
  | { kind: 'needs-expand'; url: string } // krótki link bez współrzędnych
  | { kind: 'invalid' };

function inRange(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isShortLink(input: string): boolean {
  return /(?:maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/i.test(input);
}

/** Pozycja pinezki: !3d<lat>!4d<lng> */
function tryPin(input: string): { lat: number; lng: number } | null {
  const m = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return inRange(lat, lng) ? { lat, lng } : null;
}

/** Środek widoku mapy: @<lat>,<lng> */
function tryViewport(input: string): { lat: number; lng: number } | null {
  const m = input.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return inRange(lat, lng) ? { lat, lng } : null;
}

/** Ścieżka /place/ ze współrzędnymi w formacie DMS: 49°36'45.4"N 21°38'55.7"E */
function tryDms(input: string): { lat: number; lng: number } | null {
  const decoded = safeDecode(input).replace(/\+/g, ' ');
  const re = /(\d+(?:\.\d+)?)°\s*(\d+(?:\.\d+)?)'\s*(\d+(?:\.\d+)?)"\s*([NSEW])/gi;
  const parts: Record<string, number> = {};
  let match: RegExpExecArray | null;
  while ((match = re.exec(decoded)) !== null) {
    const deg = parseFloat(match[1]);
    const min = parseFloat(match[2]);
    const sec = parseFloat(match[3]);
    const hemi = match[4].toUpperCase();
    const sign = hemi === 'S' || hemi === 'W' ? -1 : 1;
    const value = sign * (deg + min / 60 + sec / 3600);
    parts[hemi === 'N' || hemi === 'S' ? 'lat' : 'lng'] = value;
  }
  if (parts['lat'] === undefined || parts['lng'] === undefined) return null;
  return inRange(parts['lat'], parts['lng']) ? { lat: parts['lat'], lng: parts['lng'] } : null;
}

/** Same współrzędne dziesiętne: "49.6126, 21.6488" lub "50.0619 19.9369" */
function tryRaw(input: string): { lat: number; lng: number } | null {
  const m = input.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return inRange(lat, lng) ? { lat, lng } : null;
}

export function parseGoogleMapsLocation(input: string): GmapsParseResult {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return { kind: 'invalid' };

  const strategies: Array<[GmapsCoordsSource, (s: string) => { lat: number; lng: number } | null]> =
    [
      ['pin', tryPin],
      ['viewport', tryViewport],
      ['dms', tryDms],
      ['raw', tryRaw],
    ];

  for (const [source, fn] of strategies) {
    const coords = fn(trimmed);
    if (coords) return { kind: 'coords', lat: coords.lat, lng: coords.lng, source };
  }

  if (isShortLink(trimmed)) return { kind: 'needs-expand', url: trimmed };

  return { kind: 'invalid' };
}
