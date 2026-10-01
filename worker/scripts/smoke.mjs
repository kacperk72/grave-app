// Test dymny API rodzinnej mapy na LOKALNYM Workerze.
// Uruchom `npm run dev` (port 8791), potem `npm run smoke`. Nigdy na produkcji.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API = process.env.API ?? 'http://localhost:8791';
const workerDir = fileURLToPath(new URL('..', import.meta.url));
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(name, ok, detail) {
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name}`, JSON.stringify(detail ?? null));
  }
}

function grave(id) {
  return {
    id,
    latitude: 50,
    longitude: 20,
    cemeteryName: 'Cmentarz testowy',
    currency: 'PLN',
    deceasedPersons: [],
    photos: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

/** Jedna liczba z lokalnej bazy D1 (zapytanie musi zwracać kolumnę `n`). */
function sql(query) {
  const out = execSync(`npx wrangler d1 execute grave-app --local --json --command "${query}"`, {
    cwd: workerDir,
    encoding: 'utf8',
  });
  return JSON.parse(out)[0].results[0].n;
}

/** Stara wersja aplikacji: mapa bez członków, klucz z linku jako Bearer. */
async function legacy() {
  const created = await call('POST', '/spaces');
  check('stara aplikacja: POST /spaces bez treści daje klucz', created.status === 201 && typeof created.data?.token === 'string', created);
  const token = created.data.token;

  const pushed = await call('POST', '/changes', {
    token,
    body: { changes: [{ id: 'g-legacy', deleted: false, data: grave('g-legacy') }] },
  });
  check('stara aplikacja: zapis grobu', pushed.status === 200 && pushed.data.rev === 1, pushed);

  const pulled = await call('GET', '/changes?since=0', { token });
  check('stara aplikacja: odczyt grobu', pulled.status === 200 && pulled.data.changes.length === 1 && pulled.data.changes[0].id === 'g-legacy', pulled);

  const space = await call('GET', '/space', { token });
  check('stara aplikacja: podgląd mapy', space.status === 200 && space.data.graves === 1, space);

  const bad = await call('GET', '/changes?since=0', { token: 'x'.repeat(43) });
  check('zły klucz: 401', bad.status === 401, bad);
  return token;
}

const legacyToken = await legacy();
void legacyToken; void sql; // używane w kolejnych sekcjach

console.log(failed ? `\n${failed} FAIL` : '\nwszystko ok');
process.exit(failed ? 1 : 0);
