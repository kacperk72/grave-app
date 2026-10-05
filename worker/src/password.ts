import { HttpError } from './http';

/** Hasła: PBKDF2-SHA256 z WebCrypto. Liczba iteracji ograniczona przez 10 ms CPU darmowego Workera. */
export const PASSWORD_ALGO = 'pbkdf2-sha256';
export const PASSWORD_ITERATIONS = 20_000;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

export interface StoredPassword {
  password_hash: string;
  password_salt: string;
  password_algo: string;
  password_iterations: number;
}

export function randomBase64(bytes: number): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export async function hashPassword(password: string, saltB64: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(saltB64), iterations },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

/** Porównanie w stałym czasie — czas odpowiedzi nie zdradza, ile bajtów się zgadza. */
export async function verifyPassword(password: string, stored: StoredPassword): Promise<boolean> {
  const actual = fromBase64(await hashPassword(password, stored.password_salt, stored.password_iterations));
  const expected = fromBase64(stored.password_hash);
  if (actual.byteLength !== expected.byteLength) return false;
  return crypto.subtle.timingSafeEqual(actual, expected);
}

export function needsRehash(algo: string, iterations: number): boolean {
  return algo !== PASSWORD_ALGO || iterations < PASSWORD_ITERATIONS;
}

export function checkPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD || value.length > MAX_PASSWORD) {
    throw new HttpError(400, `Hasło musi mieć od ${MIN_PASSWORD} do ${MAX_PASSWORD} znaków`);
  }
  return value;
}
