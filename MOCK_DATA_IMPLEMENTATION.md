# Implementacja Mockowych Danych Grobów

## Podsumowanie

Zaimplementowano funkcjonalność generowania mockowych danych grobów w okolicy podanych współrzędnych GPS oraz ich wyświetlanie na mapie.

## Zaimplementowane funkcje

### 1. Generator Mockowych Danych (`GraveService.generateMockGraves()`)

**Lokalizacja:** `frontend/grave-app-front/src/app/features/graves/services/grave.service.ts`

**Funkcjonalność:**

- Generuje 8 mockowych grobów w okolicy podanych współrzędnych (50.027040°, 19.936453° - Kraków)
- Rozproszenie: 10-50 metrów od punktu centralnego
- Losowy kąt rozmieszczenia (360°)

**Dane mockowe zawierają:**

- Polskie imiona i nazwiska (8 różnych osób)
- Realistyczne daty urodzenia i śmierci
- Prawdziwe krakowskie cmentarze:
  - Cmentarz Rakowicki
  - Cmentarz Podgórski
  - Cmentarz Salwatorski
  - Cmentarz Batowicki
- Losowe sektory i numery grobów
- Opłaty za utrzymanie (100-400 PLN rocznie)
- Daty ostatniej wizyty i płatności

**Algorytm pozycjonowania:**

```typescript
// 1 metr ≈ 0.00001 stopnia szerokości geograficznej
// 1 metr ≈ 0.000014 stopnia długości geograficznej (na szerokości Krakowa)
const latOffset = (offsetMeters * Math.sin(angle)) / 111000;
const lngOffset =
  (offsetMeters * Math.cos(angle)) /
  (111000 * Math.cos((centerLat * Math.PI) / 180));
```

### 2. Przycisk "Wygeneruj dane testowe"

**Lokalizacja:** `frontend/grave-app-front/src/app/features/graves/graves-page.component.ts`

**Funkcjonalność:**

- Wyświetla się tylko gdy baza danych jest pusta (`gravesCount === 0`)
- Kliknięcie generuje 8 grobów w okolicy Krakowa
- Po wygenerowaniu lista automatycznie się odświeża

**Wygląd:**

- Material Design accent color
- Ikona "science" (kolba laboratoryjna)
- Tekst: "Wygeneruj dane testowe"

### 3. Wyświetlanie Grobów na Mapie

**Lokalizacja:** `frontend/grave-app-front/src/app/features/map/map-page.component.ts`

**Funkcjonalność:**

- Automatyczne ładowanie markerów grobów przy inicjalizacji mapy
- Reaktywne odświeżanie markerów gdy zmienia się lista grobów (Angular effects)
- Różnicowanie markerów:
  - **Twoja lokalizacja:** Zielona przypinka z białym środkiem
  - **Groby:** Czerwona przypinka z białym krzyżem

**Markery grobów:**

- Kolor: Czerwony (#C62828) z ciemniejszym obramowaniem
- Ikona: Krzyż (symbol cmentarza)
- Rozmiar: 28x38 px
- Animacja hover: Powiększenie o 10%

**Popupy informacyjne zawierają:**

- Imię i nazwisko zmarłych (pogrubione)
- Nazwa cmentarza (z ikoną 📍)
- Sektor i numer grobu
- Stylizacja: Zaokrąglone rogi, czerwone obramowanie, cień

### 4. Automatyczne Odświeżanie

**Implementacja:**

```typescript
constructor() {
  effect(() => {
    const graves = this.graveService.graves();
    if (this.mapInstance && graves.length > 0) {
      this.addGraveMarkers();
    }
  });
}
```

**Efekt:**

- Gdy użytkownik wygeneruje dane testowe na stronie grobów
- I przejdzie do mapy
- Markery automatycznie się pojawią
- Bez konieczności przeładowania strony

## Użycie

### Krok 1: Generowanie danych

1. Otwórz aplikację
2. Przejdź do strony "Moje groby"
3. Kliknij przycisk "Wygeneruj dane testowe"
4. Poczekaj na wygenerowanie 8 grobów

### Krok 2: Wyświetlanie na mapie

1. Przejdź do zakładki "Mapa"
2. Czerwone markery pojawią się automatycznie
3. Kliknij marker aby zobaczyć informacje o grobie
4. Zielony marker pokazuje Twoją lokalizację

### Krok 3: Przeglądanie listy

1. Wróć do "Moje groby"
2. Zobacz wszystkie 8 wygenerowanych grobów
3. Użyj wyszukiwarki aby znaleźć konkretne nazwisko
4. Sortuj według odległości (wymaga GPS)

## Szczegóły Techniczne

### Struktura danych

```typescript
interface Grave {
  id: string;
  latitude: number;
  longitude: number;
  cemeteryName: string;
  sector?: string;
  graveNumber?: string;
  lastPaymentAmount?: number;
  paymentPeriodMonths?: number;
  currency: string;
  paymentDueDate?: string;
  lastVisited?: string;
  notes?: string;
  deceasedPersons: DeceasedPerson[];
  photos: GravePhoto[];
  createdAt: string;
  updatedAt: string;
}
```

### Współrzędne testowe

- **Centrum:** 50.027040°N, 19.936453°E (Kraków)
- **Promień:** 10-50 metrów
- **Rozmieszczenie:** Losowe, równomierne rozkłady kątowe

### Przechowywanie danych

- **Baza:** IndexedDB (Dexie.js)
- **Trwałość:** Dane pozostają po zamknięciu przeglądarki
- **Synchronizacja:** Automatyczna między komponentami dzięki Angular Signals

## Przykładowe dane

### Przykład 1: Jan Kowalski

- **Cmentarz:** Cmentarz Rakowicki
- **Sektor:** Sektor 23
- **Numer:** 47
- **Urodzony:** 1945
- **Zmarły:** 2020
- **Opłata:** 234 PLN/rok

### Przykład 2: Maria Nowak

- **Cmentarz:** Cmentarz Podgórski
- **Sektor:** Sektor 8
- **Numer:** 91
- **Urodzony:** 1952
- **Zmarły:** 2018
- **Opłata:** 187 PLN/rok

## Możliwe rozszerzenia

1. **Więcej danych:**

   - Dodać zdjęcia grobów (obecnie puste)
   - Dodać więcej osób pochowanych w jednym grobie
   - Dodać więcej szczegółowych notatek

2. **Interaktywność:**

   - Kliknięcie markera → otwarcie szczegółów grobu
   - Nawigacja z mapy do formularza edycji
   - Wyświetlanie trasy do grobu

3. **Wizualizacja:**

   - Różne kolory markerów wg statusu opłat
   - Grupowanie bliskich markerów (clustering)
   - Linie łączące użytkownika z grobami

4. **Dane:**
   - Import/Export danych testowych
   - Różne lokalizacje (Warszawa, Gdańsk, etc.)
   - Konfigurowalny promień rozmieszczenia

## Weryfikacja

Aby zweryfikować poprawność implementacji:

```bash
# 1. Sprawdź czy aplikacja się kompiluje
cd frontend/grave-app-front
npm run dev

# 2. Otwórz http://localhost:59530
# 3. Kliknij "Wygeneruj dane testowe"
# 4. Przejdź do zakładki "Mapa"
# 5. Powinieneś zobaczyć 8 czerwonych markerów w okolicy Twojej lokalizacji
```

## Status: ✅ UKOŃCZONE

Wszystkie funkcjonalności zostały zaimplementowane i przetestowane:

- ✅ Generator mockowych danych
- ✅ Przycisk w UI
- ✅ Markery na mapie
- ✅ Popupy z informacjami
- ✅ Reaktywne odświeżanie
- ✅ Polskie dane testowe
- ✅ Brak błędów kompilacji

---

**Data implementacji:** 2024-01-XX  
**Wersja Angular:** 21.0.0  
**Autor:** GitHub Copilot
