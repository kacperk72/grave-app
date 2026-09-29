-- Bezpiecznik darmowego limitu R2. Cloudflare nie ma twardej blokady wydatków
-- (alerty budżetu tylko wysyłają maila), więc Worker sam liczy, ile zdjęć trzyma
-- i ile razy w miesiącu zapisywał do R2, i odmawia, zanim limit zostanie przekroczony.

-- Każdy obiekt w R2 (wariant zdjęcia) z rozmiarem — suma = zajęte miejsce
CREATE TABLE photo_objects (
  key TEXT PRIMARY KEY, -- <id mapy>/<id zdjęcia>/<wariant>, jak w R2
  space_id TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX photo_objects_space ON photo_objects (space_id);

-- Zapisy do R2 (operacje klasy A) w danym miesiącu kalendarzowym
CREATE TABLE usage_monthly (
  month TEXT PRIMARY KEY, -- RRRR-MM (UTC)
  photo_writes INTEGER NOT NULL DEFAULT 0
);
