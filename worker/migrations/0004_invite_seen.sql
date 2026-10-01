-- Kiedy ostatnio ktoś synchronizował kluczem z linku zaproszenia (stara wersja aplikacji
-- albo telefon przed podpisem). Założyciel nie usunie mapy, z której ktoś tak korzysta.
ALTER TABLE spaces ADD COLUMN invite_seen_at INTEGER;
