# Dokumentacja Projektowa dla Zespołu UX/UI - Aplikacja "Grave App"

## 1. Wprowadzenie

Niniejszy dokument stanowi podstawę do projektowania interfejsu użytkownika (UI) oraz doświadczeń użytkownika (UX) dla aplikacji "Grave App". Celem jest stworzenie intuicyjnego, estetycznego i funkcjonalnego narzędzia do zarządzania i lokalizowania grobów.

## 2. Cele Projektu

- **Główny cel:** Umożliwienie użytkownikom łatwego odnajdywania grobów na cmentarzu oraz zarządzania informacjami o nich.
- **Cele poboczne:**
  - Stworzenie cyfrowej mapy cmentarza.
  - Umożliwienie dodawania i edycji danych o grobach, w tym zdjęć i dodatkowych informacji.
  - Zapewnienie działania aplikacji w trybie offline.
  - Udostępnienie prostego w obsłudze interfejsu dla różnych grup wiekowych.

## 3. Persony Użytkowników

### Persona 1: Odwiedzający cmentarz (Gość)

- **Kim jest?** Osoba w różnym wieku, która odwiedza cmentarz i chce znaleźć konkretny grób (np. krewnego, postaci historycznej).
- **Potrzeby i cele:**
  - Szybkie i łatwe zlokalizowanie grobu na mapie.
  - Możliwość wyszukania grobu po imieniu i nazwisku.
  - Uzyskanie podstawowych informacji o grobie (kto jest pochowany, daty).
  - Wyznaczenie trasy do grobu od aktualnej lokalizacji.
- **Frustracje:** Gubienie się na dużym cmentarzu, trudności z odnalezieniem grobu, brak cyfrowych map.

## 4. Kluczowe Funkcjonalności

Aplikacja powinna składać się z następujących modułów funkcjonalnych:

1.  **Mapa Interaktywna:**

    - Wyświetlanie lokalizacji grobów jako pinezki/ikony.
    - Możliwość przybliżania, oddalania i przesuwania mapy.
    - Wyświetlanie aktualnej lokalizacji użytkownika (za jego zgodą).
    - Kliknięcie na pinezkę powinno wyświetlać skrócone informacje o grobie i opcję przejścia do szczegółów.

2.  **Wyszukiwarka:**

    - Pole do wpisywania imienia, nazwiska lub innych danych identyfikujących.
    - Filtry zaawansowane (np. po dacie śmierci, sektorze).
    - Wyniki wyszukiwania prezentowane w formie listy.

3.  **Lista Grobów:**

    - Przegląd wszystkich grobów w formie listy.
    - Każdy element listy powinien zawierać kluczowe informacje (imię, nazwisko, zdjęcie).
    - Możliwość sortowania listy (np. alfabetycznie).

4.  **Szczegóły Grobu:**

    - Dedykowany widok z pełnymi informacjami o grobie:
      - Zdjęcie/a.
      - Dane osób pochowanych (imię, nazwisko, daty urodzenia i śmierci).
      - Dokładna lokalizacja (współrzędne, sektor, numer).
      - Dodatkowe notatki.
    - Przycisk akcji: "Prowadź do celu".

5.  **Tryb Offline:**
    - Aplikacja powinna synchronizować dane i przechowywać je lokalnie (np. w IndexedDB), aby umożliwić działanie bez dostępu do internetu.
    - Informacja dla użytkownika o statusie połączenia.

## 5. Główne Widoki (Ekrany)

Proponowana struktura ekranów do zaprojektowania:

1.  **Ekran Główny / Mapa (`map-page`):**

    - Domyślny widok po uruchomieniu aplikacji.
    - Powinien zawierać mapę zajmującą większość ekranu.
    - Pływający przycisk (FAB) do centrowania mapy na lokalizacji użytkownika.
    - Widoczny pasek wyszukiwania lub ikona lupy prowadząca do wyszukiwarki.

2.  **Ekran Listy Grobów (`graves-list`):**

    - Dostępny z menu lub jako alternatywny widok do mapy.
    - Przewijalna lista grobów, każdy jako osobna "karta" (`grave-card`).
    - Na górze paska narzędzi opcje sortowania i filtrowania.

3.  **Ekran Szczegółów Grobu:**

    - Wyświetlany po wybraniu grobu z mapy lub listy.
    - Duże, wyraźne zdjęcie.
    - Czytelnie zaprezentowane dane.
    - Wyraźnie oznaczony przycisk akcji.

4.  **Ekran Ustawień (`settings-page`):**
    - Opcje dotyczące aplikacji (np. motyw jasny/ciemny).
    - Informacje o aplikacji (wersja, autorzy).
    - Przycisk do ręcznej synchronizacji danych.

## 6. Wymagania Niefunkcjonalne

- **Responsywność:** Interfejs musi być w pełni responsywny i działać poprawnie na urządzeniach mobilnych (smartfony) i tabletach.
- **Dostępność (a11y):** Projekt powinien uwzględniać standardy dostępności (WCAG), np. odpowiedni kontrast, opisy dla czytników ekranu.
- **Wydajność:** Aplikacja musi działać płynnie, nawet z dużą ilością danych na mapie.

## 7. Styl i Identyfikacja Wizualna

- **Styl:** Czysty, minimalistyczny, nowoczesny. Należy unikać nadmiaru ozdobników, aby interfejs był jak najbardziej czytelny i nie przytłaczał użytkownika.
- **Kolorystyka i Typografia:** Wybór palety kolorów, krojów pisma oraz ikonografii leży po stronie zespołu UX/UI. Zaleca się stosowanie stonowanych, spokojnych barw oraz czytelnych, bezszeryfowych fontów (np. Roboto, Open Sans, Lato), aby zapewnić spójność i elegancję aplikacji, jednocześnie dbając o wysoką dostępność (kontrast, czytelność).

---

Dokument ten powinien być punktem wyjścia do dalszych dyskusji i iteracji projektowych. Zespół UX/UI ma swobodę w proponowaniu kreatywnych rozwiązań, które spełnią powyższe założenia.
