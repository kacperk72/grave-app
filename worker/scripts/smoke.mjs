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

/** Nowa mapa z założycielem, podgląd zaproszenia, dołączanie, kto zapisał grób. */
async function members() {
  const created = await call('POST', '/spaces', {
    body: { name: '  Rodzina   Testowa ', member: { name: 'Kacper', color: 'sage' } },
  });
  check(
    'nowa mapa z założycielem',
    created.status === 201 && created.data.role === 'owner' && created.data.name === 'Rodzina Testowa' &&
      typeof created.data.invite === 'string' && typeof created.data.memberToken === 'string',
    created
  );
  const { invite, memberToken: owner, memberId: ownerId, spaceId } = created.data;

  const preview = await call('GET', '/invite', { token: invite });
  check(
    'podgląd zaproszenia',
    preview.status === 200 && preview.data.name === 'Rodzina Testowa' && preview.data.members.length === 1 &&
      preview.data.members[0].name === 'Kacper' && preview.data.graves === 0,
    preview
  );

  const tooLong = await call('POST', '/join', { token: invite, body: { name: 'x'.repeat(41), color: 'sky' } });
  check('imię dłuższe niż 40 znaków: 400', tooLong.status === 400, tooLong);
  const badColor = await call('POST', '/join', { token: invite, body: { name: 'Ania', color: 'red' } });
  check('nieznany kolor: 400', badColor.status === 400, badColor);
  const viaMember = await call('POST', '/join', { token: owner, body: { name: 'Ania', color: 'rose' } });
  check('dołączenie kluczem członka zamiast linku: 401', viaMember.status === 401, viaMember);

  const joined = await call('POST', '/join', { token: invite, body: { name: '  Ania 🌷 ', color: 'rose' } });
  check(
    'dołączenie jako członek',
    joined.status === 201 && joined.data.role === 'member' && joined.data.spaceId === spaceId,
    joined
  );
  const ania = joined.data.memberToken;

  await call('POST', '/changes', { token: ania, body: { changes: [{ id: 'g1', deleted: false, data: grave('g1') }] } });
  const pulled = await call('GET', '/changes?since=0', { token: owner });
  check('updatedBy = id członka', pulled.data?.changes?.[0]?.updatedBy === joined.data.memberId, pulled);

  const space = await call('GET', '/space', { token: ania });
  check(
    'GET /space: nazwa, ja i rola',
    space.status === 200 && space.data.name === 'Rodzina Testowa' && space.data.me?.role === 'member' && space.data.graves === 1,
    space
  );
  return { invite, owner, ownerId, ania, aniaId: joined.data.memberId, spaceId };
}

/** Mapa sprzed migracji: pierwszy podpisany zostaje założycielem. */
async function legacyOwner(token) {
  const first = await call('POST', '/join', { token, body: { name: 'Pierwszy', color: 'moss' } });
  check('stara mapa: pierwszy dołączający zostaje założycielem', first.data?.role === 'owner', first);
  const second = await call('POST', '/join', { token, body: { name: 'Drugi', color: 'sky' } });
  check('stara mapa: drugi to zwykły członek', second.data?.role === 'member', second);
  const pulled = await call('GET', '/changes?since=0', { token: second.data?.memberToken });
  check(
    'stara mapa: dawne groby widoczne, updatedBy = null',
    pulled.data?.changes?.some((c) => c.id === 'g-legacy' && c.updatedBy === null),
    pulled
  );
  const stillLegacy = await call('GET', '/changes?since=0', { token });
  check('stara mapa: klucz z linku nadal działa (przejściowo)', stillLegacy.status === 200, stillLegacy);
}

const legacyToken = await legacy();
const session = await members();
await legacyOwner(legacyToken);
void session; void sql; // używane w kolejnych sekcjach

console.log(failed ? `\n${failed} FAIL` : '\nwszystko ok');
process.exit(failed ? 1 : 0);
