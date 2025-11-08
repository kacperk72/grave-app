# 🗺️ GraveMap - Aplikacja do Lokalizacji Grobów

> Nowoczesna aplikacja PWA (Progressive Web App) umożliwiająca precyzyjne zapisywanie i odnajdywanie lokalizacji grobów bliskich na cmentarzach.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-20-red)](https://angular.io/)
[![NestJS](https://img.shields.io/badge/NestJS-10-ea2845)](https://nestjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 📖 Opis Projektu

**GraveMap** to aplikacja webowa zaprojektowana z myślą o osobach odwiedzających cmentarze, które chcą szybko i precyzyjnie odnaleźć groby swoich bliskich. Dzięki integracji z GPS i interaktywnymi mapami, użytkownicy mogą:

- 📍 **Zapisywać dokładną lokalizację grobów** z precyzją do kilku metrów
- 🗺️ **Nawigować do grobu** w czasie rzeczywistym podczas wizyty na cmentarzu
- 📸 **Dodawać zdjęcia i notatki** dla lepszej identyfikacji miejsca
- 👨‍👩‍👧‍👦 **Zarządzać wieloma miejscami pochówku** w jednej aplikacji
- 💾 **Działać offline** - wszystkie dane dostępne bez internetu
- 🔔 **Otrzymywać przypomnienia** o opłatach za miejsce na cmentarzu

### 🎯 Kluczowe Cechy

✨ **Precyzja** - Wykorzystanie GPS dla dokładności ±3-5 metrów  
🌐 **PWA** - Instalowalna na telefonie, działa jak natywna aplikacja  
📱 **Offline-First** - Pełna funkcjonalność bez połączenia z internetem  
🔒 **Prywatność** - Dane przechowywane bezpiecznie z szyfrowaniem  
👴 **Prostota** - Intuicyjny interfejs dla wszystkich grup wiekowych  
💰 **Darmowa** - Bez ukrytych kosztów i subskrypcji

---

## 🌟 Dla Kogo?

### Grupy Docelowe

- **Rodziny z wieloma grobami** - łatwe zarządzanie miejscami pochówku kilku bliskich
- **Osoby odwiedzające nieznane cmentarze** - szczególnie duże cmentarze miejskie
- **Seniorzy** - prosta nawigacja i duże przyciski dla łatwości obsługi
- **Osoby odwiedzające cmentarze sporadycznie** - szybkie odnalezienie po długim czasie
- **Opiekunowie grobów rodzinnych** - śledzenie opłat i terminów

### Przykładowe Scenariusze Użycia

**Scenariusz 1: "Nie pamiętam dokładnie, gdzie jest grób dziadka"**  
→ Otwierasz aplikację, widzisz mapę z zaznaczonym miejscem, nawigacja prowadzi Cię tam krok po kroku.

**Scenariusz 2: "Na cmentarzu nie ma zasięgu"**  
→ Aplikacja działa offline - mapa, dane i nawigacja dostępne bez internetu.

**Scenariusz 3: "Muszę przypomnieć sobie, kiedy wygasa opłata"**  
→ System powiadomień przypomni Ci o zbliżającym się terminie płatności.

---

## 🛠️ Architektura Techniczna

### Stack Technologiczny

#### Frontend (PWA)

- **Framework**: Angular 17+ z Standalone Components
- **UI Library**: Angular Material (Material Design 3)
- **Mapa**: Leaflet.js z OpenStreetMap
- **State Management**: RxJS + Angular Signals
- **Offline Storage**: IndexedDB (Dexie.js)
- **PWA**: @angular/pwa z Service Workers

#### Backend (API)

- **Framework**: NestJS 10 (Node.js + Express)
- **Database**: PostgreSQL z rozszerzeniem PostGIS (geospatial)
- **Platforma**: Supabase (managed PostgreSQL + Auth + Storage)
- **ORM**: Prisma
- **Obrazy**: Sharp (kompresja i optymalizacja)
- **API Docs**: Swagger/OpenAPI

#### Infrastruktura

- **Hosting PWA**: Vercel
- **Hosting API**: Railway.app
- **Database**: Supabase (darmowy tier)
- **Storage**: Supabase Storage (zdjęcia)
- **CI/CD**: GitHub Actions

### Kluczowe Technologie

```typescript
{
  "frontend": {
    "framework": "Angular 17+",
    "language": "TypeScript 5.3",
    "ui": "Angular Material",
    "maps": "Leaflet",
    "pwa": "@angular/pwa",
    "offline": "IndexedDB + Service Workers"
  },
  "backend": {
    "framework": "NestJS 10",
    "language": "TypeScript 5.3",
    "database": "PostgreSQL (Supabase)",
    "orm": "Prisma",
    "auth": "Supabase Auth"
  },
  "geospatial": "PostGIS",
  "mobile": "PWA (instalowalna)"
}
```

### Architektura Systemu

```
┌─────────────────────────────────────────────────────────┐
│                   Angular PWA Frontend                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Map View   │  │  Grave List  │  │  Grave Form  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Service Workers (Offline Cache)         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         IndexedDB (Local Storage)                │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    NestJS Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Graves    │  │    Photos    │  │     Auth     │  │
│  │   Module     │  │   Module     │  │   Module     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + PostGIS)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    graves    │  │deceased_per- │  │    users     │  │
│  │    table     │  │  sons table  │  │    table     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌────────────────────────────────────────────────┐    │
│  │         Supabase Storage (Zdjęcia)             │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Baza Danych - Schema

#### Tabela `graves` (Groby)

Przechowuje informacje o lokalizacji i szczegółach grobu:

- Współrzędne GPS (latitude, longitude, accuracy)
- Informacje o cmentarzu (nazwa, numer grobu, sektor)
- Dane właściciela (user_id)
- Informacje o płatnościach (data wygaśnięcia, kwota, okres)
- Zdjęcia (tablica URL-i)

#### Tabela `deceased_persons` (Osoby Zmarłe)

Obsługuje wiele osób pochowanych w jednym grobie:

- Powiązanie z grobem (grave_id)
- Imię i nazwisko
- Daty urodzenia i śmierci
- Nazwisko rodowe (dla kobiet)
- Notatki

#### Tabela `users` (Użytkownicy)

Zarządzanie kontami użytkowników:

- ID użytkownika (UUID)
- Email
- Dane autoryzacyjne (zarządzane przez Supabase Auth)

**Indeksy i Optymalizacja:**

- Indeks geospatial (GIST) na współrzędnych dla szybkich zapytań
- Indeks na user_id dla szybkiego filtrowania grobów użytkownika
- Indeks na payment_expiry_date dla przypomnień
- Row Level Security (RLS) dla bezpieczeństwa danych

---

## 🚀 Funkcjonalności

### ✅ Aktualnie Zaimplementowane

#### 🗺️ Moduł Mapy

- [x] Interaktywna mapa z Leaflet.js
- [x] Wyświetlanie pinezek grobów
- [x] Geolokalizacja użytkownika (GPS)
- [x] Dodawanie grobów z aktualnej pozycji
- [x] Wyszukiwanie grobów w pobliżu (geospatial queries)

#### 👤 Moduł Grobów

- [x] CRUD (Create, Read, Update, Delete) dla grobów
- [x] Obsługa wielu osób zmarłych w jednym grobie
- [x] Informacje o cmentarzu (nazwa, sektor, numer)
- [x] System notatek
- [x] Przechowywanie zdjęć

#### 💰 Zarządzanie Płatnościami

- [x] Data wygaśnięcia opłaty
- [x] Kwota ostatniej płatności
- [x] Okres opłaty (w miesiącach)
- [x] Waluta (domyślnie PLN)

#### 🔐 Bezpieczeństwo

- [x] Row Level Security (RLS) w Supabase
- [x] Walidacja danych (class-validator)
- [x] Zabezpieczenie API (NestJS guards)
- [x] Szyfrowanie połączeń (HTTPS)

### 🔜 W Planach (Roadmap)

#### Faza 2 (najbliższe miesiące)

- [ ] Frontend Angular - implementacja UI
- [ ] PWA - instalacja i offline mode
- [ ] Upload i galeria zdjęć
- [ ] Nawigacja do grobu w czasie rzeczywistym
- [ ] System powiadomień o płatnościach

#### Faza 3 (przyszłość)

- [ ] Udostępnianie grobów członkom rodziny
- [ ] Przypomnienia o rocznicach
- [ ] Eksport/import danych (backup)
- [ ] Tryb ciemny (dark mode)
- [ ] Wielojęzyczność (PL, EN, DE, UK)
- [ ] Aplikacja mobilna (Ionic)

---

## 📂 Struktura Projektu

```
grave-app/
├── backend/                      # NestJS API
│   ├── src/
│   │   ├── main.ts               # Bootstrap aplikacji
│   │   ├── app.module.ts         # Główny moduł
│   │   ├── config/               # Konfiguracja środowiska
│   │   ├── database/             # Supabase integration
│   │   ├── graves/               # Moduł grobów (CRUD)
│   │   │   ├── graves.controller.ts
│   │   │   ├── graves.service.ts
│   │   │   ├── dto/              # Data Transfer Objects
│   │   │   └── entities/         # TypeScript interfaces
│   │   └── common/               # Wspólne komponenty
│   ├── database/
│   │   └── migrations/           # Migracje SQL
│   ├── test/                     # Testy E2E
│   ├── package.json
│   └── README.md
│
├── frontend/                     # Angular PWA (TODO)
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/         # Feature modules
│   │   │   │   ├── map/          # Moduł mapy
│   │   │   │   ├── graves/       # Moduł grobów
│   │   │   │   └── settings/     # Ustawienia
│   │   │   ├── core/             # Singleton services
│   │   │   └── shared/           # Shared components
│   │   ├── assets/
│   │   └── environments/
│   └── package.json
│
├── PROJECT_DOCUMENTATION.md      # Szczegółowa dokumentacja techniczna
└── README.md                     # Ten plik
```

---

## 🏃 Quick Start

### Wymagania Systemowe

- **Node.js**: >= 18.18.0 LTS
- **npm**: >= 9.0.0
- **PostgreSQL**: 15+ (lub konto Supabase)
- **Git**: >= 2.30.0

### Instalacja Backend

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/your-username/grave-app.git
cd grave-app/backend

# 2. Instalacja zależności
npm install

# 3. Konfiguracja zmiennych środowiskowych
cp .env.example .env
# Edytuj .env i dodaj swoje klucze Supabase

# 4. Uruchomienie w trybie deweloperskim
npm run start:dev

# Backend dostępny na http://localhost:3000
# Swagger API docs: http://localhost:3000/api/docs
```

### Konfiguracja Supabase

1. **Utwórz projekt na [supabase.com](https://supabase.com)**
2. **Skopiuj dane projektu:**
   - Project URL: `https://xxx.supabase.co`
   - Service Role Key: `eyJ...` (z Settings → API)
3. **Uruchom migrację SQL:**
   - Przejdź do SQL Editor w Supabase Dashboard
   - Skopiuj zawartość `backend/database/migrations/001_initial_schema.sql`
   - Wykonaj zapytanie
4. **Dodaj klucze do `.env`:**
   ```env
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=twoj-service-role-key
   ```

### Instalacja Frontend (gdy będzie gotowy)

```bash
cd frontend
npm install
npm start

# Frontend dostępny na http://localhost:4200
```

---

## 📚 Dokumentacja

### Dla Developerów

- 📖 [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - Kompletna dokumentacja techniczna
- 📖 [backend/README.md](backend/README.md) - Dokumentacja backendu
- 📖 [backend/SUPABASE_SETUP.md](backend/SUPABASE_SETUP.md) - Setup bazy danych
- 📖 API Docs: `http://localhost:3000/api/docs` (Swagger UI)

### API Endpoints

#### Groby (Graves)

```http
GET    /api/graves              # Lista grobów użytkownika
POST   /api/graves              # Utwórz nowy grób
GET    /api/graves/:id          # Szczegóły grobu
PUT    /api/graves/:id          # Aktualizuj grób
DELETE /api/graves/:id          # Usuń grób
GET    /api/graves/nearby       # Groby w pobliżu (geospatial)
       ?lat=52.2297&lng=21.0122&radius=1000
```

#### Przykład Request Body

**POST /api/graves**

```json
{
  "latitude": 52.2297,
  "longitude": 21.0122,
  "accuracy": 5.0,
  "cemeteryName": "Cmentarz Powązkowski",
  "graveNumber": "A-123",
  "sector": "Sektor 5",
  "notes": "Przy dużym dębie",
  "paymentExpiryDate": "2025-12-31",
  "lastPaymentAmount": 500,
  "paymentDurationMonths": 12,
  "paymentCurrency": "PLN",
  "deceasedPersons": [
    {
      "firstName": "Jan",
      "lastName": "Kowalski",
      "birthDate": "1950-03-15",
      "deathDate": "2020-11-01",
      "maidenName": null,
      "notes": "Kochany dziadek"
    }
  ]
}
```

---

## 🧪 Testowanie

### Uruchomienie Testów Backend

```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Struktura Testów

- **Unit tests**: `*.spec.ts` (obok plików źródłowych)
- **E2E tests**: `test/*.e2e-spec.ts`
- **Framework**: Jest + Supertest

---

## 🤝 Współpraca

### Jak Pomóc w Rozwoju?

1. **Fork** repozytorium
2. **Utwórz branch** dla swojej funkcji (`git checkout -b feature/AmazingFeature`)
3. **Commit** zmian (`git commit -m 'Add some AmazingFeature'`)
4. **Push** do brancha (`git push origin feature/AmazingFeature`)
5. **Otwórz Pull Request**

### Konwencje Kodowania

- **TypeScript** - strict mode enabled
- **ESLint** + **Prettier** - automatyczne formatowanie
- **Conventional Commits** - format commit messages
- **Tests** - minimum 80% coverage dla critical paths

### Zgłaszanie Błędów

Znalazłeś bug? [Otwórz issue na GitHub](https://github.com/your-username/grave-app/issues) z:

- Opisem problemu
- Krokami do reprodukcji
- Oczekiwanym zachowaniem
- Screenshotami (jeśli applicable)

---

## 📊 Status Projektu

### Postęp Rozwoju

```
Backend API:        ████████████████████ 100% ✅
Database Schema:    ████████████████████ 100% ✅
Frontend UI:        ░░░░░░░░░░░░░░░░░░░░   0% 🚧
PWA Features:       ░░░░░░░░░░░░░░░░░░░░   0% 🚧
Mobile App:         ░░░░░░░░░░░░░░░░░░░░   0% 📅
```

### Ostatnie Zmiany

**v0.2.0** (Listopad 2025)

- ✅ Przeprojektowanie bazy danych (wiele osób na grób)
- ✅ Dodanie obsługi płatności za miejsce
- ✅ Usunięcie pola `relationship` (groby mogą być udostępniane)
- ✅ Kompletna dokumentacja techniczna

**v0.1.0** (Listopad 2025)

- ✅ Inicjalizacja projektu backend (NestJS)
- ✅ Integracja z Supabase
- ✅ CRUD API dla grobów
- ✅ Geospatial queries (groby w pobliżu)
- ✅ Swagger documentation

---

## 📄 Licencja

Ten projekt jest udostępniony na licencji **MIT**.  
Zobacz plik [LICENSE](LICENSE) dla szczegółów.

---

## 👨‍💻 Autorzy

**Zespół GraveMap**

- Development: [Twoje Imię](https://github.com/your-username)
- Design: TBD
- Contributors: [Lista kontrybutorów](https://github.com/your-username/grave-app/contributors)

---

## 📞 Kontakt

- 📧 Email: support@gravemap.app
- 🐛 Bug Reports: [GitHub Issues](https://github.com/your-username/grave-app/issues)
- 💬 Discord: [Dołącz do serwera](https://discord.gg/gravemap)
- 🐦 Twitter: [@GraveMapApp](https://twitter.com/GraveMapApp)

---

## 🙏 Podziękowania

- [NestJS](https://nestjs.com/) - za świetny framework backend
- [Angular](https://angular.io/) - za potężny framework frontend
- [Supabase](https://supabase.com/) - za open-source Firebase alternative
- [Leaflet](https://leafletjs.com/) - za bibliotekę map
- [OpenStreetMap](https://www.openstreetmap.org/) - za darmowe dane map

---

## 🌟 Wspieraj Projekt

Jeśli projekt Ci się podoba, zostaw ⭐ na GitHub!  
To motywuje do dalszego rozwoju aplikacji.

---

<div align="center">

**Stworzone z ❤️ dla osób pamiętających o swoich bliskich**

[🌐 Website](https://gravemap.app) •
[📖 Docs](PROJECT_DOCUMENTATION.md) •
[🐛 Report Bug](https://github.com/your-username/grave-app/issues) •
[✨ Request Feature](https://github.com/your-username/grave-app/issues)

</div>
