# 🧭 Funkcjonalności Nawigacji w Grave App

## Przegląd

System nawigacji w aplikacji Grave App oferuje dwa główne scenariusze użycia:

1. **Nawigacja do pojedynczego grobu** - szybkie prowadzenie do wybranego nagrobka
2. **Planowanie optymalnej trasy** - inteligentne wyznaczanie najkrótszej ścieżki przez wiele grobów

---

## 1. Nawigacja do Pojedynczego Grobu

### Jak to działa?

1. Kliknij na dowolny marker grobu na mapie
2. W popup pojawi się szczegółowa karta z informacjami o grobie
3. Kliknij przycisk **"🧭 Nawiguj do grobu"**
4. Aplikacja otworzy Google Maps z już ustawioną trasą od Twojej lokalizacji do grobu

### Informacje wyświetlane w popup:

- **Imię i nazwisko** zmarłego
- **Nazwa cmentarza**
- **Sektor i numer grobu**
- **Odległość** od Twojej aktualnej pozycji (w metrach)

### Funkcjonalności techniczne:

```typescript
navigateToGrave(graveId: string): void
```

- Wykorzystuje Google Maps Navigation API
- Automatycznie przekazuje współrzędne GPS grobu
- Otwiera w nowej karcie przeglądarki
- Działa na wszystkich urządzeniach (desktop, mobile)

---

## 2. Planowanie Optymalnej Trasy

### Koncepcja

Funkcja ta rozwiązuje klasyczny **problem komiwojażera (TSP - Traveling Salesman Problem)** dla zbioru grobów w określonym promieniu. Algorytm znajduje najkrótszą możliwą trasę przez wszystkie wybrane groby.

### Jak używać?

#### Krok 1: Ustawienie promienia wyszukiwania

W panelu **"Planowanie trasy"** użyj suwaka do określenia maksymalnego promienia:

- **Zakres:** 0.5 km - 5 km
- **Krok:** 0.5 km
- **Domyślnie:** 1 km

#### Krok 2: Wygenerowanie trasy

1. Kliknij przycisk **"Zaplanuj trasę"**
2. Algorytm automatycznie:
   - Filtruje groby w określonym promieniu
   - Oblicza optymalne połączenia między punktami
   - Rysuje wizualizację trasy na mapie
   - Generuje szczegółowy plan odwiedzin

#### Krok 3: Analiza wyników

Po zaplanowaniu trasy zobaczysz:

**Podsumowanie:**

- 🚩 **Liczba grobów** na trasie
- 📏 **Całkowita odległość** (w km)
- ⏱️ **Szacowany czas** przejścia (zakładając 5 km/h)

**Lista kolejności:**
Numerowana lista grobów w optymalnej kolejności odwiedzin z informacjami:

- Numer w trasie (1, 2, 3...)
- Imię i nazwisko zmarłego
- Nazwa cmentarza

#### Krok 4: Rozpoczęcie nawigacji

Kliknij przycisk **"Rozpocznij nawigację"**, aby:

- Otworzyć Google Maps z pełną trasą
- Uwzględnić wszystkie punkty pośrednie (waypoints)
- Ustawić tryb "walking" (marsz pieszo)

**Uwaga:** Google Maps API wspiera maksymalnie 9 punktów pośrednich. Jeśli trasa ma więcej grobów, uwzględnione zostaną pierwsze 10 (start + 9 waypoints).

---

## Wizualizacja na Mapie

### Markery Trasy

Każdy grób na zaplanowanej trasie otrzymuje:

- **Pomarańczowy okrągły marker** z numerem
- **Biała obwódka** dla lepszej widoczności
- **Animacja pulse** dla atrakcyjności

### Linia Trasy (Polyline)

- **Kolor:** Pomarańczowy (#FF6B35)
- **Grubość:** 4 piksele
- **Styl:** Przerywana linia (dash array)
- **Przezroczystość:** 80%

### Interaktywność

- Mapa automatycznie dopasowuje widok do całej trasy
- Auto-centrowanie można wyłączyć aby swobodnie eksplorować mapę
- Kliknięcie "Wyczyść trasę" usuwa wizualizację i resetuje plan

---

## Algorytm Planowania Trasy

### Problem Komiwojażera (TSP)

TSP to klasyczny problem optymalizacyjny:

> "Znaleźć najkrótszą możliwą trasę odwiedzającą każdy punkt dokładnie raz i wracającą do punktu startowego"

W naszym przypadku:

- **Punkt startowy:** Twoja aktualna lokalizacja GPS
- **Punkty do odwiedzenia:** Groby w określonym promieniu
- **Cel:** Minimalizacja całkowitej odległości

### Implementacja: Algorytm Najbliższego Sąsiada

Używamy **heurystyki najbliższego sąsiada** (Nearest Neighbor):

```typescript
solveTSPNearestNeighbor(startLat, startLon, graves): Grave[]
```

**Pseudokod:**

```
1. START z aktualnej pozycji użytkownika
2. WHILE (są nieodwiedzone groby):
   a. Znajdź najbliższy nieodwiedzony grób
   b. Dodaj go do trasy
   c. Przenieś się do tego grobu
3. RETURN zoptymalizowana trasa
```

**Charakterystyka:**

- ✅ **Szybkość:** O(n²) - bardzo wydajny dla małych zbiorów
- ✅ **Praktyczność:** Daje zadowalające wyniki (zwykle 25% od optimum)
- ⚠️ **Nie gwarantuje optimum** - to aproksymacja, nie dokładne rozwiązanie
- ✅ **Deterministyczny:** Ten sam zbiór grobów = ta sama trasa

### Obliczanie Odległości: Wzór Haversine

Używamy **wzoru Haversine** do precyzyjnego obliczania odległości na powierzchni kuli (Ziemia):

```typescript
calculateDistance(lat1, lon1, lat2, lon2): number // metry
```

**Wzór matematyczny:**

```
a = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
d = R × c

gdzie:
  φ - szerokość geograficzna (latitude)
  λ - długość geograficzna (longitude)
  R - promień Ziemi (6371 km)
```

**Dokładność:** ~0.5% błędu dla typowych odległości (<10km)

---

## Przypadki Użycia

### 1. Odwiedziny rodzinne

**Scenariusz:** Rodzina ma 5 grobów na jednym cmentarzu

- Ustaw promień: 2 km
- Zaplanuj trasę
- Otrzymujesz optymalną kolejność odwiedzin
- Oszczędzasz czas i minimalizujesz chodzenie

### 2. Listopadowe święto zmarłych

**Scenariusz:** Masowe odwiedziny wielu grobów

- Wygeneruj testowe groby w okolicy
- Zaplanuj efektywną trasę
- Nawiguj przez wszystkie punkty
- Uniknij zagubienia się na dużym cmentarzu

### 3. Dokumentacja historyczna

**Scenariusz:** Badacz dokumentuje zabytkowe nagrobki

- Dodaj interesujące groby do aplikacji
- Zaplanuj trasę badawczą
- Systematycznie odwiedzaj w optymalnej kolejności
- Śledź postęp wizualnie na mapie

---

## Ograniczenia i Uwagi

### Techniczne

- **Maximum waypoints:** Google Maps wspiera do 9 punktów pośrednich
- **Promień:** Maksymalnie 5 km od aktualnej pozycji
- **GPS accuracy:** Wymaga dokładności <30m dla najlepszych wyników
- **Internet:** Potrzebny do nawigacji Google Maps

### Algorytmiczne

- **Aproksymacja:** Nie zawsze znajdzie absolutnie najkrótszą trasę
- **Lokalność:** Algorytm może utknąć w lokalnych optimach
- **Jednorazowy:** Nie uwzględnia dynamicznych zmian (ruch, przeszkody)

### UX

- **Maksymalna lista:** Ponad 10 grobów w trasie - długa lista do przewinięcia
- **Mobile:** Mniejszy ekran - kompaktowy widok podsumowania
- **Offline:** Nawigacja wymaga połączenia z internetem

---

## Przyszłe Rozszerzenia

### Potencjalne ulepszenia:

1. **Algorytm 2-opt** - dokładniejsza optymalizacja TSP
2. **Trasa okrężna** - powrót do punktu startowego
3. **Priorytetyzacja** - możliwość oznaczania ważniejszych grobów
4. **Czas odwiedzin** - planowanie z uwzględnieniem czasu spędzanego przy grobie
5. **Eksport trasy** - zapisywanie do pliku GPX/KML
6. **Offline maps** - nawigacja bez internetu używając cache'owanych map
7. **Multi-dzień** - dzielenie dużych tras na kilka dni

---

## Kod źródłowy

Kluczowe pliki implementacji:

- `map-page.component.ts` - Logika nawigacji i TSP
- `map-page.component.html` - UI panelu planowania
- `map-page.component.scss` - Style wizualizacji

### Kluczowe metody:

```typescript
// Nawigacja do pojedynczego grobu
navigateToGrave(graveId: string): void

// Planowanie trasy
planOptimalRoute(): Promise<void>

// Algorytm TSP
solveTSPNearestNeighbor(startLat, startLon, graves): Grave[]

// Obliczanie odległości
calculateDistance(lat1, lon1, lat2, lon2): number

// Wizualizacja
drawRouteOnMap(route: Grave[]): void
clearRoute(): void

// Start nawigacji
startRouteNavigation(): void
```

---

## Testowanie

### Scenariusz testowy:

1. Otwórz mapę
2. Kliknij "Testowe groby" aby wygenerować przykładowe dane
3. Ustaw promień na 1 km
4. Kliknij "Zaplanuj trasę"
5. Obserwuj wizualizację i podsumowanie
6. Kliknij marker grobu -> "Nawiguj do grobu"
7. Kliknij "Rozpocznij nawigację" dla całej trasy

### Oczekiwane rezultaty:

- ✅ Trasa jest narysowana na mapie
- ✅ Groby są ponumerowane w kolejności
- ✅ Podsumowanie pokazuje poprawną liczbę grobów i dystans
- ✅ Nawigacja do pojedynczego grobu otwiera Google Maps
- ✅ Nawigacja całej trasy uwzględnia wszystkie punkty

---

## Wsparcie i Feedback

Jeśli masz pytania lub sugestie dotyczące nawigacji:

- 📧 Zgłoś issue w repozytorium projektu
- 💡 Zaproponuj nowe funkcje
- 🐛 Raportuj znalezione błędy

**Made with ❤️ for better cemetery navigation**
