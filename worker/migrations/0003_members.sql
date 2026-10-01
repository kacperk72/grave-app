-- Członkowie rodzinnych map: każdy telefon ma własny klucz, imię i kolor awatara.
-- Klucz z linku (`spaces.token_hash`) od teraz jest ZAPROSZENIEM — daje prawo
-- do dołączenia; przejściowo (ALLOW_INVITE_AS_MEMBER) także do synchronizacji,
-- żeby stare wersje aplikacji działały do aktualizacji.
ALTER TABLE spaces ADD COLUMN name TEXT NOT NULL DEFAULT 'Rodzinna mapa';

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 klucza członka; sam klucz zna tylko jego telefon
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  removed_at INTEGER -- usunięty przez założyciela albo sam wyszedł
);

CREATE INDEX members_space ON members (space_id);
-- Najwyżej jeden aktywny założyciel na mapę (chroni przed wyścigiem dwóch pierwszych dołączeń)
CREATE UNIQUE INDEX members_one_owner ON members (space_id) WHERE role = 'owner' AND removed_at IS NULL;

-- Kto ostatnio zapisał grób (id członka); NULL dla zapisów sprzed migracji i starych aplikacji
ALTER TABLE graves ADD COLUMN updated_by TEXT;

-- Bajty zdjęć skasowanej mapy czekające na usunięcie z KV (darmowe KV: 1000 usunięć/dobę)
CREATE TABLE photo_purge (
  key TEXT PRIMARY KEY,
  queued_at INTEGER NOT NULL
);

ALTER TABLE usage_daily ADD COLUMN photo_deletes INTEGER NOT NULL DEFAULT 0;
