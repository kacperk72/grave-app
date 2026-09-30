-- Bezpiecznik darmowego limitu Workers KV (zdjęcia). KV na darmowym planie samo
-- odrzuca operacje ponad limit, ale bez wyjaśnienia — Worker liczy więc, ile zdjęć
-- trzyma i ile razy dziś zapisywał, i odmawia wcześniej ze zrozumiałym komunikatem.

-- Każdy wpis w KV (wariant zdjęcia) z rozmiarem — suma = zajęte miejsce
CREATE TABLE photo_objects (
  key TEXT PRIMARY KEY, -- <id mapy>/<id zdjęcia>/<wariant>, jak w KV
  space_id TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX photo_objects_space ON photo_objects (space_id);

-- Zapisy do KV w danej dobie (darmowy limit: 1000 dziennie)
CREATE TABLE usage_daily (
  day TEXT PRIMARY KEY, -- RRRR-MM-DD (UTC)
  photo_writes INTEGER NOT NULL DEFAULT 0
);
