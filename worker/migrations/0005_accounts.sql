-- Konta: użytkownicy z hasłem, sesje urządzeń, kody z maila (potwierdzenie adresu / nowe hasło).
-- Migracja tylko dodaje: istniejący członkowie, groby i zdjęcia zostają bez zmian.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- znormalizowany: małe litery, bez spacji
  password_hash TEXT NOT NULL,         -- base64 wyniku PBKDF2
  password_salt TEXT NOT NULL,         -- base64, 16 losowych bajtów
  password_algo TEXT NOT NULL,         -- 'pbkdf2-sha256'
  password_iterations INTEGER NOT NULL,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,                -- blokada po 5 błędnych hasłach (15 minut)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Sesja = token urządzenia po zalogowaniu (w bazie tylko SHA-256)
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

-- Potwierdzenie adresu (zakładanie konta / nowe hasło): kod (6 cyfr) i link jako SHA-256, ważne
-- 15 minut. Po poprawnym kodzie wiersz dostaje setup_hash — jednorazowe prawo do ustawienia hasła.
CREATE TABLE login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  link_hash TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  setup_hash TEXT UNIQUE,
  setup_expires_at INTEGER
);
CREATE INDEX login_codes_email ON login_codes (email, created_at);

-- Wiele urządzeń (kluczy) na jednego członka mapy; obecne klucze kopiujemy 1:1
CREATE TABLE member_tokens (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX member_tokens_member ON member_tokens (member_id);
INSERT INTO member_tokens (token_hash, member_id, created_at)
  SELECT token_hash, id, joined_at FROM members;

ALTER TABLE members ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE members ADD COLUMN merged_into TEXT; -- scalony z innym członkiem (ta sama osoba)
CREATE UNIQUE INDEX members_one_per_user ON members (space_id, user_id)
  WHERE user_id IS NOT NULL AND removed_at IS NULL;

ALTER TABLE spaces ADD COLUMN kind TEXT NOT NULL DEFAULT 'family'; -- 'family' | 'personal'
ALTER TABLE spaces ADD COLUMN owner_user_id TEXT REFERENCES users(id);
CREATE UNIQUE INDEX spaces_one_personal ON spaces (owner_user_id) WHERE kind = 'personal';
