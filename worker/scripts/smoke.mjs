// Test dymny API rodzinnej mapy na LOKALNYM Workerze.
// Uruchom `npm run dev` (port 8791), potem `npm run smoke`. Nigdy na produkcji.
import { execSync } from 'node:child_process';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const API = process.env.API ?? 'http://localhost:8791';
const workerDir = fileURLToPath(new URL('..', import.meta.url));
let failed = 0;

async function call(method, path, { token, body, headers: extra } = {}) {
  const headers = { ...(extra ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // `wrangler d1 execute` obok `wrangler dev` potrafi na chwilę przeładować Workera — ponów przy błędzie sieci
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(API + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      break;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
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

/** Uprawnienia założyciela, rotacja linku, usuwanie i przekazanie roli, usunięcie mapy. */
async function management(s) {
  const list = await call('GET', '/members', { token: s.ania });
  check('lista członków, założyciel pierwszy', list.status === 200 && list.data.members.length === 2 && list.data.members[0].role === 'owner', list);

  const me = await call('PATCH', '/me', { token: s.ania, body: { name: 'Anna', color: 'plum' } });
  check('zmiana podpisu', me.status === 200 && me.data.name === 'Anna' && me.data.color === 'plum', me);

  const notOwner = await call('POST', '/space/rotate', { token: s.ania });
  check('rotacja przez członka: 403', notOwner.status === 403, notOwner);
  const renameByMember = await call('PATCH', '/space', { token: s.ania, body: { name: 'X' } });
  check('zmiana nazwy przez członka: 403', renameByMember.status === 403, renameByMember);

  const renamed = await call('PATCH', '/space', { token: s.owner, body: { name: 'Kubitowie' } });
  check('zmiana nazwy przez założyciela', renamed.status === 200 && renamed.data.name === 'Kubitowie', renamed);

  const rotated = await call('POST', '/space/rotate', { token: s.owner });
  check('nowy link zaproszenia', rotated.status === 200 && rotated.data.invite && rotated.data.invite !== s.invite, rotated);
  const oldInvite = await call('GET', '/invite', { token: s.invite });
  check('stary link nie działa', oldInvite.status === 401, oldInvite);
  const stillMember = await call('GET', '/changes?since=0', { token: s.ania });
  check('członek działa po zmianie linku', stillMember.status === 200, stillMember);

  const selfRemove = await call('DELETE', `/members/${s.ownerId}`, { token: s.owner });
  check('założyciel nie usuwa siebie: 400', selfRemove.status === 400, selfRemove);
  const ownerLeave = await call('POST', '/space/leave', { token: s.owner });
  check('założyciel nie wychodzi bez przekazania roli: 409', ownerLeave.status === 409, ownerLeave);

  const transferred = await call('POST', `/members/${s.aniaId}/owner`, { token: s.owner });
  check('przekazanie roli', transferred.status === 200, transferred);
  const newOwner = await call('GET', '/space', { token: s.ania });
  check('nowa założycielka', newOwner.data?.me?.role === 'owner', newOwner);

  const busy = await call('DELETE', '/space', { token: s.ania });
  check('usunięcie mapy z innymi osobami: 409', busy.status === 409, busy);

  const removed = await call('DELETE', `/members/${s.ownerId}`, { token: s.ania });
  check('usunięcie członka', removed.status === 200, removed);
  const gone = await call('GET', '/changes?since=0', { token: s.owner });
  check('usunięty: 401 member_removed', gone.status === 401 && gone.data?.code === 'member_removed', gone);
  const removeAgain = await call('DELETE', `/members/${s.ownerId}`, { token: s.ania });
  check('ponowne usunięcie: 404', removeAgain.status === 404, removeAgain);
  const toRemoved = await call('POST', `/members/${s.ownerId}/owner`, { token: s.ania });
  check('rola dla usuniętego: 404', toRemoved.status === 404, toRemoved);

  const del = await call('DELETE', '/space', { token: s.ania });
  check('usunięcie mapy przez jedyną osobę', del.status === 200, del);
  const after = await call('GET', '/space', { token: s.ania });
  check('po usunięciu mapy: 401', after.status === 401, after);
}

/** Stara aplikacja na mapie bez założyciela może zmienić link (jak dawniej). */
async function legacyRotate() {
  const created = await call('POST', '/spaces');
  const rotated = await call('POST', '/space/rotate', { token: created.data.token });
  check('stara aplikacja: rotacja mapy bez założyciela', rotated.status === 200 && typeof rotated.data.token === 'string', rotated);
  const leave = await call('POST', '/space/leave', { token: rotated.data.token });
  check('stara aplikacja: wyjście wymaga podpisu (403)', leave.status === 403, leave);
}

/** Zdjęcia skasowanej mapy znikają z KV przy najbliższym przebiegu Crona. */
async function purge() {
  const created = await call('POST', '/spaces', { body: { name: 'Do usunięcia', member: { name: 'Test', color: 'slate' } } });
  const token = created.data.memberToken;
  const key = `${created.data.spaceId}/p-purge/full`;
  const put = await fetch(`${API}/photos/p-purge?variant=full`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
    body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  });
  check('zdjęcie wgrane', put.status === 201, put.status);

  const del = await call('DELETE', '/space', { token });
  check('mapa usunięta', del.status === 200, del);
  check('klucz zdjęcia w kolejce sprzątania', sql(`SELECT COUNT(*) AS n FROM photo_purge WHERE key = '${key}'`) === 1);

  // `wrangler d1 execute` obok `wrangler dev` potrafi na chwilę przeładować Workera — ponów
  let cron;
  for (let i = 0; i < 5 && !cron?.ok; i++) {
    cron = await fetch(`${API}/__scheduled?cron=17+3+*+*+*`).catch(() => null);
    if (!cron?.ok) await new Promise((r) => setTimeout(r, 1000));
  }
  check('Cron uruchomiony', cron?.ok, cron?.status);
  check('kolejka sprzątania pusta', sql(`SELECT COUNT(*) AS n FROM photo_purge WHERE key = '${key}'`) === 0);
  check('zdjęcie zdjęte z bezpiecznika miejsca', sql(`SELECT COUNT(*) AS n FROM photo_objects WHERE key = '${key}'`) === 0);
}

/** Założyciel nie usunie mapy, z której korzystają jeszcze niepodpisane telefony (stara aplikacja). */
async function legacyDelete() {
  const created = await call('POST', '/spaces');
  const invite = created.data.token;
  const owner = await call('POST', '/join', { token: invite, body: { name: 'Jedyny', color: 'sky' } });
  const legacySync = await call('GET', '/changes?since=0', { token: invite });
  check('stara aplikacja synchronizuje kluczem z linku', legacySync.status === 200, legacySync);
  const del = await call('DELETE', '/space', { token: owner.data.memberToken });
  check('usunięcie mapy używanej przez niepodpisany telefon: 409', del.status === 409, del);
}

/** Wykonuje zapytanie zmieniające dane w lokalnej D1 (tylko testy lokalne). */
function sqlRun(query) {
  execSync(`npx wrangler d1 execute grave-app --local --command "${query}"`, { cwd: workerDir, encoding: 'utf8' });
}

/** Każdy członek ma klucz urządzenia w member_tokens — także ci sprzed migracji (kopia). */
async function memberTokens() {
  const created = await call('POST', '/spaces', { body: { name: 'Klucze', member: { name: 'Ala', color: 'sky' } } });
  const joined = await call('POST', '/join', { token: created.data.invite, body: { name: 'Ola', color: 'rose' } });
  check('nowy członek ma klucz w member_tokens', sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${joined.data.memberId}'`) === 1);
  check('założyciel ma klucz w member_tokens', sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${created.data.memberId}'`) === 1);
  const space = await call('GET', '/space', { token: joined.data.memberToken });
  check('klucz z member_tokens działa', space.status === 200 && space.data.me?.id === joined.data.memberId, space);
  check('każdy aktywny członek ma co najmniej jeden klucz', sql('SELECT COUNT(*) AS n FROM members m WHERE m.removed_at IS NULL AND NOT EXISTS (SELECT 1 FROM member_tokens t WHERE t.member_id = m.id)') === 0);
}

/** Zakłada konto: kod z odpowiedzi trybu deweloperskiego → hasło → sesja. */
async function register(email, password) {
  const req = await call('POST', '/auth/request', { body: { email } });
  const ver = await call('POST', '/auth/verify', { body: { email, code: req.data?.dev?.code } });
  const set = await call('POST', '/auth/password', { body: { setupToken: ver.data?.setupToken, password, acceptTerms: 1 } });
  return set.data?.session;
}

/** Zakładanie konta, logowanie, blokada, nowe hasło, wylogowanie. */
async function accounts() {
  sqlRun('UPDATE login_codes SET ip_hash = NULL');
  const email = `ala-${Date.now()}@example.com`;
  const bad = await call('POST', '/auth/request', { body: { email: 'zly-adres' } });
  check('zły e-mail: 400', bad.status === 400, bad);

  const r1 = await call('POST', '/auth/request', { body: { email } });
  check('prośba o kod: 202 + kod w trybie deweloperskim', r1.status === 202 && /^\d{6}$/.test(r1.data?.dev?.code ?? ''), r1);
  const code = r1.data?.dev?.code ?? '';
  const wrongCode = code === '000000' ? '111111' : '000000';
  const wrong = await call('POST', '/auth/verify', { body: { email, code: wrongCode } });
  check('zły kod: 401', wrong.status === 401, wrong);
  const ver = await call('POST', '/auth/verify', { body: { email: ` ${email.toUpperCase()} `, code } });
  check('dobry kod (e-mail z wielkich liter i spacjami): setupToken', ver.status === 200 && typeof ver.data?.setupToken === 'string', ver);
  const again = await call('POST', '/auth/verify', { body: { email, code } });
  check('kod jednorazowy: 401', again.status === 401, again);

  const short = await call('POST', '/auth/password', { body: { setupToken: ver.data?.setupToken, password: 'krotkie' } });
  check('hasło krótsze niż 8 znaków: 400', short.status === 400, short);
  const set = await call('POST', '/auth/password', { body: { setupToken: ver.data?.setupToken, password: 'dobrehaslo1', acceptTerms: 1 } });
  check('ustawienie hasła: sesja', set.status === 200 && typeof set.data?.session === 'string' && set.data.user?.email === email, set);
  const reuseSetup = await call('POST', '/auth/password', { body: { setupToken: ver.data?.setupToken, password: 'innehaslo1' } });
  check('setupToken jednorazowy: 401', reuseSetup.status === 401, reuseSetup);

  const acc = await call('GET', '/account', { token: set.data?.session });
  check('GET /account z sesją', acc.status === 200 && acc.data?.user?.email === email, acc);

  const badPw = await call('POST', '/auth/login', { body: { email, password: 'zlehaslo00' } });
  const noUser = await call('POST', '/auth/login', { body: { email: `nikt-${Date.now()}@example.com`, password: 'dobrehaslo1' } });
  check('złe hasło i brak konta: ten sam 401', badPw.status === 401 && noUser.status === 401 && badPw.data?.error === noUser.data?.error, [badPw, noUser]);
  const okLogin = await call('POST', '/auth/login', { body: { email: email.toUpperCase(), password: 'dobrehaslo1' } });
  check('logowanie (wielkie litery w e-mailu)', okLogin.status === 200 && typeof okLogin.data?.session === 'string', okLogin);

  // Przeliczenie hasha po podniesieniu liczby iteracji
  // Prawdziwy hash z 1000 iteracji (jak zapisany kiedyś słabszymi ustawieniami)
  const weakSalt = randomBytes(16);
  const weakHash = pbkdf2Sync('dobrehaslo1', weakSalt, 1000, 32, 'sha256').toString('base64');
  sqlRun(`UPDATE users SET password_hash = '${weakHash}', password_salt = '${weakSalt.toString('base64')}', password_iterations = 1000 WHERE email = '${email}'`);
  await call('POST', '/auth/login', { body: { email, password: 'dobrehaslo1' } });
  check('słabszy hash przeliczony przy logowaniu', sql(`SELECT password_iterations AS n FROM users WHERE email = '${email}'`) === 20000);

  for (let i = 0; i < 5; i++) await call('POST', '/auth/login', { body: { email, password: 'zlehaslo00' } });
  const locked = await call('POST', '/auth/login', { body: { email, password: 'dobrehaslo1' } });
  check('blokada po 5 złych hasłach: 429', locked.status === 429, locked);

  // Nowe hasło: zdejmuje blokadę i wylogowuje inne urządzenia
  const r2 = await call('POST', '/auth/request', { body: { email } });
  const link = (r2.data?.dev?.link ?? '').split('#')[1];
  const ver2 = await call('POST', '/auth/verify', { body: { link } });
  check('potwierdzenie linkiem', ver2.status === 200 && typeof ver2.data?.setupToken === 'string', ver2);
  const reset = await call('POST', '/auth/password', { body: { setupToken: ver2.data?.setupToken, password: 'nowehaslo22' } });
  check('nowe hasło: sesja', reset.status === 200, reset);
  const oldSession = await call('GET', '/account', { token: set.data?.session });
  check('nowe hasło wylogowuje inne urządzenia', oldSession.status === 401, oldSession);
  const loginNew = await call('POST', '/auth/login', { body: { email, password: 'nowehaslo22' } });
  check('logowanie nowym hasłem po blokadzie', loginNew.status === 200, loginNew);

  // 5 złych kodów unieważnia kod
  const r3 = await call('POST', '/auth/request', { body: { email } });
  const c3 = r3.data?.dev?.code ?? '';
  for (let i = 0; i < 5; i++) await call('POST', '/auth/verify', { body: { email, code: c3 === '000000' ? '111111' : '000000' } });
  const afterAttempts = await call('POST', '/auth/verify', { body: { email, code: c3 } });
  check('po 5 złych kodach dobry kod nie działa', afterAttempts.status === 401, afterAttempts);

  // Limit 5 próśb o kod na godzinę (r1, r2, r3 + 2 = 5; szósta bez wysyłki)
  await call('POST', '/auth/request', { body: { email } });
  await call('POST', '/auth/request', { body: { email } });
  const limited = await call('POST', '/auth/request', { body: { email } });
  check('limit próśb: 202 bez kodu', limited.status === 202 && !limited.data?.dev, limited);

  const out = await call('POST', '/auth/logout', { token: loginNew.data?.session });
  const afterOut = await call('GET', '/account', { token: loginNew.data?.session });
  check('wylogowanie', out.status === 200 && afterOut.status === 401, afterOut);
}

/** Przypinanie kluczy urządzeń do konta, mapa prywatna, scalanie duplikatów, blokady mapy prywatnej. */
async function accountLink() {
  const u = await register(`u-${Date.now()}@example.com`, 'dobrehaslo1');

  // Mapa rodzinna założona bez konta (A = założyciel) + B dołącza bez konta
  const fam = await call('POST', '/spaces', { body: { name: 'Rodzina L', member: { name: 'Kacper', color: 'clay' } } });
  const b = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Bartek', color: 'sky' } });

  const l1 = await call('POST', '/account/link', { token: u, body: { tokens: [fam.data.memberToken] } });
  const famRow = l1.data?.spaces?.find((x) => x.spaceId === fam.data.spaceId);
  const personal = l1.data?.spaces?.find((x) => x.kind === 'personal');
  check('przypięcie: mapa rodzinna i prywatna', l1.status === 200 && famRow?.memberId === fam.data.memberId && famRow?.memberToken === fam.data.memberToken && personal?.name === 'Moje', l1);
  check('mapa prywatna pierwsza', l1.data?.spaces?.[0]?.kind === 'personal', l1.data?.spaces);

  const before = sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${fam.data.memberId}'`);
  const tokensNow = (l1.data?.spaces ?? []).map((x) => x.memberToken);
  const l2 = await call('POST', '/account/link', { token: u, body: { tokens: tokensNow } });
  check('ponowne link() z tego samego urządzenia nie mnoży kluczy', sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${fam.data.memberId}'`) === before && l2.data?.spaces?.length === 2, l2);

  const l3 = await call('POST', '/account/link', { token: u, body: { tokens: [] } });
  const fam3 = l3.data?.spaces?.find((x) => x.spaceId === fam.data.spaceId);
  check('nowe urządzenie: ten sam członek, nowy klucz', fam3?.memberId === fam.data.memberId && fam3?.memberToken !== fam.data.memberToken, l3);
  const viaNew = await call('GET', '/space', { token: fam3?.memberToken });
  check('nowy klucz urządzenia działa', viaNew.status === 200 && viaNew.data.me?.id === fam.data.memberId, viaNew);
  check('mapa prywatna tworzona raz', (l3.data?.spaces ?? []).filter((x) => x.kind === 'personal').length === 1 && l3.data.spaces.find((x) => x.kind === 'personal').spaceId === personal?.spaceId);

  // Duplikat: ta sama osoba dołączyła drugi raz bez konta → scalenie przy link()
  const dup = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Kacper', color: 'sage' } });
  await call('POST', '/account/link', { token: u, body: { tokens: [dup.data.memberToken] } });
  const members = await call('GET', '/members', { token: b.data.memberToken });
  check('scalenie: duplikat znika z listy członków', members.data?.members?.length === 2, members.data);
  const dupNow = await call('GET', '/space', { token: dup.data.memberToken });
  check('klucz duplikatu wskazuje teraz scalonego członka', dupNow.data?.me?.id === fam.data.memberId && dupNow.data.me.role === 'owner', dupNow);

  // Scalenie z przejęciem roli założyciela: E (konto, dołączył wcześniej) + O (później, założyciel po przekazaniu)
  const f3 = await call('POST', '/spaces', { body: { name: 'Rodzina R', member: { name: 'Celina', color: 'moss' } } });
  const e = await call('POST', '/join', { token: f3.data.invite, headers: { 'X-Session': u }, body: { name: 'Kacper', color: 'clay' } });
  const o = await call('POST', '/join', { token: f3.data.invite, body: { name: 'Kacper', color: 'sky' } });
  await call('POST', `/members/${o.data.memberId}/owner`, { token: f3.data.memberToken });
  await call('POST', '/account/link', { token: u, body: { tokens: [o.data.memberToken] } });
  const merged = await call('GET', '/space', { token: o.data.memberToken });
  check('scalenie przenosi rolę założyciela na zachowanego członka', merged.data?.me?.id === e.data.memberId && merged.data.me.role === 'owner', merged);

  // Dołączenie z sesją, gdy konto już jest w mapie → bez duplikatu
  const again = await call('POST', '/join', { token: f3.data.invite, headers: { 'X-Session': u }, body: { name: 'Kacper', color: 'clay' } });
  check('dołączenie z sesją: istniejący członek, nowy klucz', again.status === 201 && again.data.memberId === e.data.memberId, again);

  // Cudzy członek nie jest przejmowany
  const v = await register(`v-${Date.now()}@example.com`, 'dobrehaslo1');
  const lv = await call('POST', '/account/link', { token: v, body: { tokens: [fam.data.memberToken] } });
  check('klucz członka innego konta nie jest przejmowany', lv.data?.spaces?.length === 1 && lv.data.spaces[0].kind === 'personal', lv);

  // Mapa prywatna: bez zaproszeń, wyjścia i usuwania
  const p = (l1.data?.spaces ?? []).find((x) => x.kind === 'personal')?.memberToken;
  for (const [method, path] of [['POST', '/space/rotate'], ['POST', '/space/leave'], ['DELETE', '/space']]) {
    const res = await call(method, path, { token: p });
    check(`mapa prywatna: ${method} ${path} → 403`, res.status === 403, res);
  }
  const unlinked = await call('POST', '/account/link', { token: 'zla-sesja', body: { tokens: [] } });
  check('link bez ważnej sesji: 401', unlinked.status === 401, unlinked);
}

/** Poprawki po przeglądzie: klucze mapy prywatnej, wyścigi blokad, limity maili. */
async function hardening() {
  const email = `h-${Date.now()}@example.com`;
  const u = await register(email, 'dobrehaslo1');

  // Codzienne link() z kluczem mapy prywatnej nie dopisuje nowych kluczy
  const l1 = await call('POST', '/account/link', { token: u, body: { tokens: [] } });
  const personal = l1.data?.spaces?.find((x) => x.kind === 'personal');
  const before = sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${personal?.memberId}'`);
  const l2 = await call('POST', '/account/link', { token: u, body: { tokens: [personal?.memberToken] } });
  await call('POST', '/account/link', { token: u, body: { tokens: [personal?.memberToken] } });
  check('link() z kluczem mapy prywatnej nie mnoży kluczy', sql(`SELECT COUNT(*) AS n FROM member_tokens WHERE member_id = '${personal?.memberId}'`) === before && l2.data?.spaces?.find((x) => x.kind === 'personal')?.memberToken === personal?.memberToken, l2);

  // Równoległe złe hasła też blokują konto
  await Promise.all(Array.from({ length: 8 }, () => call('POST', '/auth/login', { body: { email, password: 'zlehaslo00' } })));
  const locked = await call('POST', '/auth/login', { body: { email, password: 'dobrehaslo1' } });
  check('równoległe złe hasła: blokada 429', locked.status === 429, locked);

  // Równoległe złe kody wyczerpują 5 prób
  const req = await call('POST', '/auth/request', { body: { email } });
  const code = req.data?.dev?.code ?? '';
  const wrong = code === '000000' ? '111111' : '000000';
  await Promise.all(Array.from({ length: 10 }, () => call('POST', '/auth/verify', { body: { email, code: wrong } })));
  const after = await call('POST', '/auth/verify', { body: { email, code } });
  check('równoległe złe kody: dobry kod już nie działa', after.status === 401, after);

  // Dzienny limit maili (darmowy Resend: 100/dobę) — prośba ponad limit nie wysyła maila
  const day = new Date().toISOString().slice(0, 10);
  sqlRun(`INSERT INTO usage_daily (day, mails) VALUES ('${day}', 1000) ON CONFLICT(day) DO UPDATE SET mails = 1000`);
  const capped = await call('POST', '/auth/request', { body: { email: `cap-${Date.now()}@example.com` } });
  check('dzienny limit maili: 503 bez kodu', capped.status === 503 && !capped.data?.dev, capped);
  sqlRun(`UPDATE usage_daily SET mails = 0 WHERE day = '${day}'`);

  // Limit próśb z jednego adresu IP (różne e-maile)
  sqlRun('UPDATE login_codes SET ip_hash = NULL');
  const statuses = [];
  for (let i = 0; i < 11; i++) {
    statuses.push((await call('POST', '/auth/request', { body: { email: `ip${i}-${Date.now()}@example.com` } })).status);
  }
  check('limit próśb z jednego IP: 11. prośba → 429', statuses.slice(0, 10).every((x) => x === 202) && statuses[10] === 429, statuses);
  sqlRun('UPDATE login_codes SET ip_hash = NULL');
}

/** Zgoda na regulamin: konto wymaga, reset nie; mapy zapisują wersję i datę; cron sprząta. */
async function legalConsent() {
  sqlRun('UPDATE login_codes SET ip_hash = NULL');
  const email = `zgoda-${Date.now()}@example.com`;
  const r1 = await call('POST', '/auth/request', { body: { email } });
  const v1 = await call('POST', '/auth/verify', { body: { email, code: r1.data?.dev?.code } });
  check('weryfikacja nowego adresu: exists=false', v1.status === 200 && v1.data?.exists === false, v1);
  const noTerms = await call('POST', '/auth/password', { body: { setupToken: v1.data?.setupToken, password: 'dobrehaslo1' } });
  check('nowe konto bez zgody: 400', noTerms.status === 400, noTerms);
  const withTerms = await call('POST', '/auth/password', { body: { setupToken: v1.data?.setupToken, password: 'dobrehaslo1', acceptTerms: 1 } });
  check('nowe konto ze zgodą: sesja', withTerms.status === 200 && typeof withTerms.data?.session === 'string', withTerms);
  check('wersja regulaminu zapisana przy koncie', sql(`SELECT terms_version AS n FROM users WHERE email = '${email}'`) === 1);

  const r2 = await call('POST', '/auth/request', { body: { email } });
  const v2 = await call('POST', '/auth/verify', { body: { email, code: r2.data?.dev?.code } });
  check('weryfikacja istniejącego konta: exists=true', v2.data?.exists === true, v2);
  const reset = await call('POST', '/auth/password', { body: { setupToken: v2.data?.setupToken, password: 'nowehaslo22' } });
  check('nowe hasło istniejącego konta bez zgody: OK', reset.status === 200 && reset.data?.user?.termsVersion === 1, reset);
  check('zgoda konta: data i godzina zapisane', sql(`SELECT COUNT(*) AS n FROM users WHERE email = '${email}' AND terms_accepted_at > 0`) === 1);
  const logged = await call('POST', '/auth/login', { body: { email, password: 'nowehaslo22' } });
  check('logowanie zwraca wersję zgody konta (nowe urządzenie bez ponownej zgody)', logged.data?.user?.termsVersion === 1, logged);

  const fam = await call('POST', '/spaces', { body: { name: 'Zgoda', member: { name: 'Ala', color: 'sky' }, acceptTerms: 1 } });
  check('założyciel mapy: wersja zgody zapisana', sql(`SELECT terms_version AS n FROM members WHERE id = '${fam.data.memberId}'`) === 1);
  const j = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Ola', color: 'rose', acceptTerms: 1 } });
  check('dołączający: wersja zgody zapisana', sql(`SELECT terms_version AS n FROM members WHERE id = '${j.data.memberId}'`) === 1);
  check('dołączający: data i godzina zgody zapisane', sql(`SELECT COUNT(*) AS n FROM members WHERE id = '${j.data.memberId}' AND terms_accepted_at > 0`) === 1);
  const old = await call('POST', '/join', { token: fam.data.invite, body: { name: 'Stara', color: 'sage' } });
  check('dołączenie bez pola zgody (stara aplikacja) dalej działa', old.status === 201, old);
  check('bez zgody: brak daty zgody', sql(`SELECT COUNT(*) AS n FROM members WHERE id = '${old.data.memberId}' AND terms_accepted_at IS NULL`) === 1);

  // Cron: kody starsze niż 24 h i wygasłe sesje znikają
  const uid = sql(`SELECT id AS n FROM users WHERE email = '${email}'`);
  sqlRun(`INSERT INTO login_codes (id, email, code_hash, link_hash, created_at, expires_at) VALUES ('stary-kod', 'x@example.com', 'h', 'stary-link', 1, 2)`);
  sqlRun(`INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES ('stara-sesja', '${uid}', 1, 1, 2)`);
  let cron = null;
  for (let i = 0; i < 5 && !cron; i++) cron = await fetch(`${API}/__scheduled?cron=17+3+*+*+*`).catch(() => null);
  check('cron: stary kod usunięty', sql("SELECT COUNT(*) AS n FROM login_codes WHERE id = 'stary-kod'") === 0);
  check('cron: wygasła sesja usunięta', sql("SELECT COUNT(*) AS n FROM sessions WHERE token_hash = 'stara-sesja'") === 0);
  check('cron: aktywna sesja została', sql(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = '${uid}'`) >= 1);
}

const legacyToken = await legacy();
const session = await members();
await legacyOwner(legacyToken);
await management(session);
await legacyRotate();
await legacyDelete();
await memberTokens();
await accounts();
await accountLink();
await hardening();
await legalConsent();
await purge();

console.log(failed ? `\n${failed} FAIL` : '\nwszystko ok');
process.exit(failed ? 1 : 0);
