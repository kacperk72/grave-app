/** Wspólne narzędzia HTTP Workera: odpowiedzi JSON, błędy, CORS, czytanie treści. */

export const MAX_BODY_BYTES = 2 * 1024 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Kod dla aplikacji, gdy sam status nie wystarcza (np. `member_removed`). */
    readonly code?: string
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function corsHeaders(request: Request, allowedOrigins: string): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = allowedOrigins.split(',').map((o) => o.trim());
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY_BYTES) throw new HttpError(413, 'Za duże zapytanie');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Za duże zapytanie');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Nieprawidłowy JSON');
  }
}

/** Jak `readJson`, ale puste ciało daje `null` (stara aplikacja wysyła `POST /spaces` bez treści). */
export async function readOptionalJson(request: Request): Promise<unknown | null> {
  const text = await request.clone().text();
  if (text.trim() === '') return null;
  return readJson(request);
}
