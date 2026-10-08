-- Limity maili z kodem: dzienny licznik (darmowy Resend wysyła 100 maili na dobę) i prośby
-- z jednego adresu IP (w bazie tylko SHA-256 adresu). Migracja tylko dodaje kolumny.
ALTER TABLE usage_daily ADD COLUMN mails INTEGER NOT NULL DEFAULT 0;
ALTER TABLE login_codes ADD COLUMN ip_hash TEXT;
CREATE INDEX login_codes_ip ON login_codes (ip_hash, created_at);
