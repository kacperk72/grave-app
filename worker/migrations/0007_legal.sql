-- Zgoda na regulamin: wersja oraz data i godzina — przy koncie i przy członku mapy. Migracja tylko dodaje kolumny.
ALTER TABLE users ADD COLUMN terms_version INTEGER;
ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER;
ALTER TABLE members ADD COLUMN terms_version INTEGER;
ALTER TABLE members ADD COLUMN terms_accepted_at INTEGER;
