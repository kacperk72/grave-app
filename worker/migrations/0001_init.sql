-- Rodzinne mapy: wspólny zbiór grobów, do którego dostęp daje sam link.
--
-- Link ma postać /rodzina#<klucz>. W bazie trzymamy wyłącznie SHA-256 klucza,
-- więc nawet wyciek bazy nie ujawnia działających linków.
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  -- Licznik zmian mapy. Każdy zapis grobu dostaje kolejną wartość,
  -- a telefony pobierają „wszystko po rev N" (synchronizacja przyrostowa).
  rev INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER
);

CREATE TABLE graves (
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  -- Cały grób jako JSON (ten sam kształt co w aplikacji); NULL po usunięciu.
  data TEXT,
  -- Usunięty grób zostaje jako „nagrobek" (tombstone), żeby inne telefony
  -- dowiedziały się o usunięciu przy następnej synchronizacji.
  deleted INTEGER NOT NULL DEFAULT 0,
  rev INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (space_id, id)
);

CREATE INDEX graves_space_rev ON graves (space_id, rev);
