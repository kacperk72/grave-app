# Dokumentacja Projektowa - Aplikacja "GraveMap"

## 1. Opis Projektu

### 1.1 Cel Aplikacji

Aplikacja webowa (PWA) umożliwiająca użytkownikom zapisywanie precyzyjnych lokalizacji grobów bliskich na interaktywnej mapie, wraz z możliwością dodawania opisów, zdjęć i innych informacji. Aplikacja ma pomóc w szybkim odnalezieniu miejsca pochówku podczas wizyt na cmentarzu.

### 1.2 Grupa Docelowa

- Osoby odwiedzające groby bliskich
- Rodziny z wieloma miejscami pochówku
- Osoby odwiedzające nieznane cmentarze
- Seniorzy potrzebujący prostej nawigacji

### 1.3 Kluczowe Wartości

- **Precyzja**: Dokładne współrzędne GPS (±3-5 metrów)
- **Prywatność**: Dane przechowywane lokalnie lub w prywatnej chmurze
- **Dostępność**: Działanie offline po pierwszym załadowaniu
- **Prostota**: Intuicyjny interfejs dla wszystkich grup wiekowych

---

## 2. Wymagania Funkcjonalne

### 2.1 Moduł Mapy

#### 2.1.1 Wyświetlanie Mapy

- [ ] Interaktywna mapa z możliwością zoomowania i przesuwania
- [ ] Wyświetlanie pinezek grobów z ikonami
- [ ] Tryb satelitarny i mapowy
- [ ] Wskaźnik aktualnej lokalizacji użytkownika
- [ ] Kompas i orientacja mapy

#### 2.1.2 Dodawanie Pinezki

- [ ] Dodawanie pinezki przez długie naciśnięcie na mapie
- [ ] Dodawanie pinezki z aktualnej lokalizacji GPS
- [ ] Precyzyjne dostrajanie pozycji pinezki (drag & drop)
- [ ] Walidacja współrzędnych GPS
- [ ] Zapisywanie dokładności pomiaru GPS

#### 2.1.3 Nawigacja

- [ ] Wyznaczanie trasy do wybranego grobu
- [ ] Wyświetlanie odległości do grobu w czasie rzeczywistym
- [ ] Kierunek wskazujący grób (kompas AR - opcjonalnie)
- [ ] Historia ostatnio odwiedzonych grobów

### 2.2 Moduł Zarządzania Grobami

#### 2.2.1 Karta Grobu

- [ ] Imię i nazwisko osoby zmarłej
- [ ] Data urodzenia i śmierci
- [ ] Relacja do użytkownika (mama, tata, dziadek, etc.)
- [ ] Numer grobu / sektor cmentarza
- [ ] Nazwa cmentarza
- [ ] Notatki / wspomnienia
- [ ] Wielojęzyczność (PL/EN minimum)

#### 2.2.2 Galeria Zdjęć

- [ ] Dodawanie wielu zdjęć do grobu
- [ ] Robienie zdjęć bezpośrednio z kamery
- [ ] Kompresja zdjęć dla oszczędności przestrzeni
- [ ] Przeglądanie zdjęć w galerii
- [ ] Usuwanie i edycja zdjęć
- [ ] Zdjęcie główne (wyświetlane na pinezce)

#### 2.2.3 Zarządzanie Danymi

- [ ] Lista wszystkich dodanych grobów
- [ ] Wyszukiwanie grobów po nazwisku
- [ ] Filtrowanie po cmentarzach
- [ ] Sortowanie (alfabetycznie, po dacie dodania, po odległości)
- [ ] Edycja informacji o grobie
- [ ] Usuwanie grobu (z potwierdzeniem)

### 2.3 Moduł Offline i Synchronizacji

#### 2.3.1 Tryb Offline

- [ ] Działanie aplikacji bez połączenia internetowego
- [ ] Buforowanie map dla wybranych obszarów
- [ ] Lokalne przechowywanie wszystkich danych
- [ ] Kolejka zmian do synchronizacji

#### 2.3.2 Synchronizacja (opcjonalna)

- [ ] Backup danych do chmury
- [ ] Synchronizacja między urządzeniami
- [ ] Udostępnianie grobów członkom rodziny
- [ ] Import/Export danych (JSON)

### 2.4 Moduł Użytkownika

#### 2.4.1 Uwierzytelnianie (opcjonalne)

- [ ] Rejestracja przez email
- [ ] Logowanie przez Google/Facebook
- [ ] Tryb anonimowy (tylko lokalne dane)
- [ ] Resetowanie hasła

#### 2.4.2 Profil

- [ ] Ustawienia aplikacji
- [ ] Preferencje mapy (typ, zoom domyślny)
- [ ] Jednostki odległości (metry/stopy)
- [ ] Zarządzanie pamięcią cache

### 2.5 Funkcje Dodatkowe

#### 2.5.1 Przypomnienia

- [ ] Ustawianie przypomnień o rocznicach
- [ ] Powiadomienia push
- [ ] Kalendarz wizyt na cmentarzu

#### 2.5.2 Współdzielenie

- [ ] Udostępnianie lokalizacji grobu innym (link)
- [ ] Współdzielenie z członkami rodziny
- [ ] Grupowanie grobów rodzinnych

#### 2.5.3 Statystyki

- [ ] Liczba wizyt na cmentarzu
- [ ] Historia odwiedzin
- [ ] Mapa cieplna najczęściej odwiedzanych miejsc

---

## 3. Architektura Techniczna

### 3.1 Stack Technologiczny - Frontend

#### 3.1.1 Framework JavaScript

**Wybrany Stack: Angular 17+ (Standalone Components)**

**Uzasadnienie:**

- ✅ Enterprise-grade framework z pełnym ekosystemem
- ✅ TypeScript jako standard (type safety z natury)
- ✅ Angular PWA (@angular/pwa) - najlepsza integracja PWA
- ✅ RxJS - reaktywne programowanie idealne dla geolokalizacji real-time
- ✅ Dependency Injection - czysta architektura
- ✅ Angular Material - gotowe komponenty UI
- ✅ Standalone Components (Angular 17+) - lepsza modularność
- ✅ Signals (Angular 16+) - reaktywność bez Zone.js overhead
- ✅ Ionic Angular - łatwa migracja do mobile app

**Kluczowe Features Angular dla tego projektu:**

- Service Workers z @angular/service-worker
- HttpClient z interceptorami (offline queue)
- Router z lazy loading
- Forms (Reactive Forms dla formularzy grobów)
- Animations dla UX

#### 3.1.2 Biblioteka Map

**Wybrany Stack: Leaflet z Angular**

**Uzasadnienie:**

- ✅ Open-source, bez kosztów licencyjnych
- ✅ Lekka biblioteka (40KB)
- ✅ Doskonałe wsparcie offline
- ✅ Świetna integracja z Angular przez @asymmetrik/ngx-leaflet
- ✅ Wsparcie dla własnych ikon i warstw
- ✅ Wiele dostawców kafelków (OpenStreetMap, MapBox, Google)
- ✅ TypeScript definitions out-of-the-box

**Konfiguracja Angular:**

```typescript
// package.json
"leaflet": "^1.9.4"
"@asymmetrik/ngx-leaflet": "^17.0.0"
"@types/leaflet": "^1.9.8"

// angular.json - dodać do styles i scripts
"styles": [
  "node_modules/leaflet/dist/leaflet.css"
],
"scripts": [
  "node_modules/leaflet/dist/leaflet.js"
]
```

**Integracja:**

```typescript
// app.component.ts
import * as L from "leaflet";
import { LeafletModule } from "@asymmetrik/ngx-leaflet";

// Komponenty używają dyrektywy [leafletOptions]
```

#### 3.1.3 UI Framework

**Wybrany Stack: Angular Material**

**Uzasadnienie:**

- ✅ Oficjalna biblioteka Google dla Angular
- ✅ Pełna integracja z Angular (Dependency Injection, Forms, etc.)
- ✅ Komponenty responsywne out-of-the-box
- ✅ Material Design 3 (najnowsza wersja)
- ✅ Accessibility (a11y) wbudowane
- ✅ Theming system (custom palety kolorów)
- ✅ Dark mode support
- ✅ CDK (Component Dev Kit) - niski poziom abstrakcji
- ✅ Doskonała dokumentacja i przykłady

**Konfiguracja:**

```bash
ng add @angular/material
```

**Kluczowe Komponenty dla GraveMap:**

- MatCard - karty grobów
- MatList - lista grobów
- MatDialog - modale (dodawanie/edycja)
- MatBottomSheet - quick view po kliknięciu pinezki
- MatFab - floating action button "Dodaj grób"
- MatFormField - formularze
- MatChips - tagi i filtry
- MatSnackBar - powiadomienia
- MatProgressSpinner - loading states

#### 3.1.4 State Management

**Wybrany Stack: Angular Services + RxJS + Signals**

**Uzasadnienie:**

- ✅ **Services z Dependency Injection** - Angular pattern
- ✅ **RxJS** - reaktywne programowanie (ideal dla geolokalizacji real-time)
- ✅ **Signals (Angular 16+)** - nowoczesna reaktywność, lepsza performance
- ✅ **BehaviorSubject** - state management dla złożonych przypadków
- ✅ Brak dodatkowych bibliotek (NgRx nie jest potrzebny dla MVP)

**Architektura State:**

```typescript
// services/grave.service.ts
@Injectable({ providedIn: "root" })
export class GraveService {
  // Signals (Angular 16+)
  graves = signal<Grave[]>([]);
  selectedGrave = signal<Grave | null>(null);
  isLoading = signal(false);

  // RxJS dla async operations
  graves$ = new BehaviorSubject<Grave[]>([]);

  // Computed signals
  gravesCount = computed(() => this.graves().length);

  constructor(private db: IndexedDBService, private http: HttpClient) {}
}
```

**Cache Strategy:**

- Angular HttpClient Interceptor dla offline queue
- Service Worker cache (automatyczne przez @angular/pwa)
- IndexedDB dla persistent state

**Opcjonalnie (dla większych projektów):**

- NgRx (Redux dla Angular) - jeśli aplikacja urośnie
- Akita (prostsze niż NgRx)
- ELF (modułowy state management)

### 3.2 Stack Technologiczny - Backend

#### 3.2.1 Backend Framework

**Wybrany Stack: NestJS + Express + TypeScript**

**Uzasadnienie:**

- ✅ **NestJS** - enterprise framework zbudowany na Express
- ✅ Architektura wzorowana na Angular (Dependency Injection, Decorators)
- ✅ TypeScript first-class citizen
- ✅ Modułowa struktura (Controllers, Services, Modules)
- ✅ Wbudowana walidacja (class-validator, class-transformer)
- ✅ Swagger/OpenAPI out-of-the-box (@nestjs/swagger)
- ✅ Microservices ready (jeśli aplikacja urośnie)
- ✅ WebSockets support (@nestjs/websockets) - dla real-time
- ✅ Ten sam język i podobne wzorce co Angular frontend

**Konfiguracja:**

```typescript
// package.json (backend)
"@nestjs/core": "^10.3.0"
"@nestjs/common": "^10.3.0"
"@nestjs/platform-express": "^10.3.0"
"@nestjs/config": "^3.1.1"
"@nestjs/swagger": "^7.1.17"
"express": "^4.18.2"
"typescript": "^5.3.0"

// Inicjalizacja
npm i -g @nestjs/cli
nest new backend
```

**Struktura NestJS (idealna dla GraveMap):**

```
src/
├── graves/
│   ├── graves.controller.ts
│   ├── graves.service.ts
│   ├── graves.module.ts
│   ├── dto/
│   │   ├── create-grave.dto.ts
│   │   └── update-grave.dto.ts
│   └── entities/
│       └── grave.entity.ts
├── photos/
├── auth/
├── users/
└── common/
```

**Integracja z Supabase:**

```typescript
"@supabase/supabase-js": "^2.38.0"
```

#### 3.2.2 Baza Danych

**Wybrany Stack: Supabase (PostgreSQL + PostGIS)**

**Uzasadnienie:**

- ✅ **PostgreSQL** - najbardziej zaawansowana open-source baza
- ✅ **PostGIS** - rozszerzenie dla danych geoprzestrzennych (wbudowane w Supabase)
- ✅ **Supabase** - Firebase alternative z prawdziwym SQL
- ✅ Real-time subscriptions (WebSockets)
- ✅ Row Level Security (RLS) - bezpieczeństwo na poziomie wiersza
- ✅ Storage dla zdjęć (S3-compatible)
- ✅ Authentication out-of-the-box
- ✅ Auto-generated REST API
- ✅ Darmowy tier: 500MB database, 1GB file storage, 2GB bandwidth
- ✅ Hosted PostgreSQL (nie trzeba zarządzać serwerem)

**Dlaczego Supabase > Firebase:**

- ✅ SQL > NoSQL dla relacyjnych danych (groby, użytkownicy, zdjęcia)
- ✅ PostGIS dla geospatial queries
- ✅ Open-source (można self-host w przyszłości)
- ✅ Migracje SQL (lepsze dla zespołu)
- ✅ Complex queries i JOINy

**Integracja z NestJS:**

```typescript
// Opcja 1: @supabase/supabase-js (bezpośredni klient)
"@supabase/supabase-js": "^2.38.0"

// Opcja 2: TypeORM lub Prisma (ORM)
"@nestjs/typeorm": "^10.0.1"
"typeorm": "^0.3.17"
"pg": "^8.11.3"

// lub Prisma (polecane)
"prisma": "^5.7.0"
"@prisma/client": "^5.7.0"
```

**Schema Przykładowa (PostgreSQL):**

```sql
CREATE EXTENSION postgis;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE graves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy FLOAT,

    -- Informacje o osobie
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    death_date DATE,
    relationship VARCHAR(50),

    -- Informacje o grobie
    cemetery_name VARCHAR(255),
    grave_number VARCHAR(50),
    sector VARCHAR(50),
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_visited TIMESTAMP
);

CREATE INDEX idx_graves_location ON graves USING GIST(location);
CREATE INDEX idx_graves_user_id ON graves(user_id);

CREATE TABLE grave_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grave_id UUID REFERENCES graves(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grave_id UUID REFERENCES graves(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    reminder_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2.3 Storage dla Zdjęć

**Wybrany Stack: Supabase Storage**

**Uzasadnienie:**

- ✅ Wbudowane w Supabase (jedna platforma dla wszystkiego)
- ✅ S3-compatible API
- ✅ Automatyczne CDN (global edge network)
- ✅ Row Level Security dla plików
- ✅ Public i private buckets
- ✅ Integracja z PostgreSQL (metadane w bazie)
- ✅ Darmowy tier: 1GB storage
- ✅ Automatyczne generowanie signed URLs
- ✅ Image transformations (resize, crop) - wbudowane

**Konfiguracja w NestJS:**

```typescript
// services/storage.service.ts
import { createClient } from "@supabase/supabase-js";

@Injectable()
export class StorageService {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  async uploadPhoto(file: Express.Multer.File, graveId: string) {
    const { data, error } = await this.supabase.storage
      .from("grave-photos")
      .upload(`${graveId}/${file.originalname}`, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    return data;
  }

  async getPublicUrl(path: string) {
    const { data } = this.supabase.storage
      .from("grave-photos")
      .getPublicUrl(path);
    return data.publicUrl;
  }
}
```

**Alternatywnie (jeśli Supabase Storage nie wystarcza):**

- Cloudinary (transformacje obrazów on-the-fly)
- AWS S3 (jeśli potrzeba więcej kontroli)

### 3.3 PWA i Offline

#### 3.3.1 Service Worker

**Wybrany Stack: @angular/pwa + @angular/service-worker**

**Uzasadnienie:**

- ✅ Oficjalna biblioteka Angular PWA
- ✅ Automatyczna konfiguracja Service Worker
- ✅ Deklaratywna konfiguracja cache (ngsw-config.json)
- ✅ Update notifications out-of-the-box
- ✅ Offline fallback
- ✅ Precaching i runtime caching

**Instalacja:**

```bash
ng add @angular/pwa
```

**Automatycznie generuje:**

- manifest.webmanifest (PWA manifest)
- ngsw-worker.js (Service Worker)
- ngsw-config.json (konfiguracja cache)
- Icons różnych rozmiarów

**Konfiguracja ngsw-config.json:**

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-graves",
      "urls": ["/api/graves/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1d",
        "timeout": "5s"
      }
    },
    {
      "name": "api-photos",
      "urls": ["https://**.supabase.co/storage/**"],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 50,
        "maxAge": "7d"
      }
    }
  ]
}
```

**Strategia Cache:**

- **App Shell**: Prefetch (instalacja od razu)
- **API Data**: Freshness (network first, cache fallback)
- **Zdjęcia**: Performance (cache first)
- **Mapy**: Performance (cache first, pre-cache popularne obszary)

#### 3.3.2 Offline Storage

**Rekomendacja: IndexedDB przez Dexie.js**

```typescript
"dexie": "^3.2.4"
"dexie-react-hooks": "^1.1.7"
```

**Uzasadnienie:**

- ✅ Większa pojemność niż localStorage (50MB+)
- ✅ Transakcje i indeksy
- ✅ Dexie upraszcza API IndexedDB
- ✅ Reactive hooks dla React

**Schema:**

```typescript
import Dexie, { Table } from "dexie";

interface Grave {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  firstName: string;
  lastName: string;
  photos: string[];
  syncStatus: "synced" | "pending" | "conflict";
}

class GraveMapDB extends Dexie {
  graves!: Table<Grave>;

  constructor() {
    super("GraveMapDB");
    this.version(1).stores({
      graves: "id, lastName, syncStatus, [latitude+longitude]",
    });
  }
}

export const db = new GraveMapDB();
```

### 3.4 Geolokalizacja

#### 3.4.1 HTML5 Geolocation API

```typescript
navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    // Aktualizuj pozycję użytkownika
  },
  (error) => {
    // Obsługa błędów
  },
  {
    enableHighAccuracy: true, // Najwyższa precyzja
    timeout: 10000,
    maximumAge: 0,
  }
);
```

#### 3.4.2 Biblioteki Wspomagające

```typescript
"geolib": "^3.3.4" // Obliczenia odległości, kierunków
```

### 3.5 Optymalizacja Obrazów

**Frontend (Angular):**

```typescript
// Kompresja po stronie klienta przed uploadem
"ng-image-compress": "^1.0.0"
"browser-image-compression": "^2.0.2"

// Lazy loading
// Angular ma wbudowane: loading="lazy" w <img>
```

**Backend (NestJS):**

```typescript
// Przetwarzanie obrazów na serwerze
"sharp": "^0.33.0"
"@nestjs/platform-express": "^10.3.0" // Multer dla uploadów

// W NestJS controller
import * as sharp from 'sharp';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Kompresja i resize
  const compressed = await sharp(file.buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();

  // Thumbnail
  const thumbnail = await sharp(file.buffer)
    .resize(200, 200, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  // Upload do Supabase
  await this.storageService.upload(compressed, thumbnail);
}
```

**Supabase Storage Transformations:**

```typescript
// Supabase ma wbudowane transformacje
const url = supabase.storage
  .from("grave-photos")
  .getPublicUrl("path/to/image.jpg", {
    transform: {
      width: 800,
      height: 600,
      resize: "cover",
      quality: 80,
    },
  });
```

**Strategie:**

- Kompresja do WebP (90% jakości oryginał, 80% thumbnail)
- Resize do max 1920px (oryginał), 200px (thumbnail)
- Lazy loading w Angular (loading="lazy")
- Progressive loading (blur-up)

### 3.6 Testing

#### 3.6.1 Unit Testing (Angular)

```typescript
// Angular ma wbudowane Jasmine + Karma
"jasmine-core": "~5.1.0"
"karma": "~6.4.0"
"karma-jasmine": "~5.1.0"
"karma-chrome-launcher": "~3.2.0"

// Alternatywnie: Jest (szybszy)
"jest": "^29.7.0"
"@types/jest": "^29.5.11"
"jest-preset-angular": "^13.1.4"

// Uruchomienie
ng test
```

**Przykład testu Angular:**

```typescript
// grave.service.spec.ts
describe("GraveService", () => {
  let service: GraveService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GraveService],
    });
    service = TestBed.inject(GraveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it("should fetch graves", () => {
    service.getGraves().subscribe((graves) => {
      expect(graves.length).toBe(2);
    });
  });
});
```

#### 3.6.2 E2E Testing

```typescript
// Angular CLI używa Protractor (deprecated)
// Zamiana na Cypress lub Playwright

// Cypress (polecane dla Angular)
"cypress": "^13.6.2"
"@cypress/schematic": "^2.5.1"

// Instalacja
ng add @cypress/schematic

// Playwright (alternatywa)
"@playwright/test": "^1.40.1"
```

#### 3.6.3 Backend Testing (NestJS)

```typescript
// NestJS używa Jest
"jest": "^29.7.0"
"@nestjs/testing": "^10.3.0"
"supertest": "^6.3.3" // HTTP assertions

// Uruchomienie
npm run test
npm run test:e2e
npm run test:cov
```

**Przykład testu NestJS:**

```typescript
// graves.controller.spec.ts
describe("GravesController", () => {
  let controller: GravesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GravesController],
      providers: [GravesService],
    }).compile();

    controller = module.get<GravesController>(GravesController);
  });

  it("should return all graves", async () => {
    const result = await controller.findAll();
    expect(result).toBeDefined();
  });
});
```

#### 3.6.4 Type Safety

```typescript
// TypeScript (Angular i NestJS)
"typescript": "~5.2.2"

// ESLint (linting)
"@angular-eslint/eslint-plugin": "^17.0.0"
"@typescript-eslint/eslint-plugin": "^6.14.0"

// Prettier (formatting)
"prettier": "^3.1.1"
"eslint-config-prettier": "^9.1.0"
```

---

## 4. Struktura Projektu

### 4.1 Monorepo (Nx Workspace)

```
grave-app/
├── apps/
│   ├── frontend/                          # Angular PWA
│   │   ├── src/
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   ├── backend/                           # NestJS API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── graves/
│   │   │   ├── photos/
│   │   │   ├── auth/
│   │   │   └── common/
│   │   ├── test/
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                            # Ionic Angular (przyszłość)
│
├── libs/
│   ├── shared/
│   │   ├── models/                        # Wspólne modele TypeScript
│   │   │   ├── grave.model.ts
│   │   │   ├── user.model.ts
│   │   │   └── photo.model.ts
│   │   ├── dto/                           # Data Transfer Objects
│   │   ├── interfaces/
│   │   └── constants/
│   │
│   └── ui/                                # Wspólne UI komponenty (opcjonalne)
│
├── tools/
├── nx.json                                # Nx configuration
├── package.json
├── tsconfig.base.json
└── README.md
```

**Inicjalizacja Nx Workspace:**

```bash
# Instalacja Nx
npm install -g nx

# Utworzenie workspace
npx create-nx-workspace@latest grave-app

# Wybrać: Angular + NestJS preset (lub empty i dodać później)

# Dodanie aplikacji Angular
nx g @nx/angular:app frontend --routing --style=scss

# Dodanie aplikacji NestJS
nx g @nx/nest:app backend

# Dodanie biblioteki shared
nx g @nx/js:lib shared/models
```

**Zalety Nx Monorepo:**

- ✅ Wspólne typy TypeScript (DRY principle)
- ✅ Dependency graph visualization
- ✅ Affected commands (tylko zmienione projekty)
- ✅ Cache i distributed task execution
- ✅ Code generators (nx generate)
- ✅ Integrated tooling (linting, testing, building)

**Alternatywa (prostsze podejście bez monorepo):**

```
grave-app/
├── frontend/              # Osobny Angular projekt
└── backend/               # Osobny NestJS projekt
```

### 4.2 Frontend Structure (Angular)

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                          # Singleton services, guards
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts         # HTTP client wrapper
│   │   │   │   ├── auth.service.ts        # Supabase Auth
│   │   │   │   ├── indexeddb.service.ts   # Offline storage
│   │   │   │   ├── geolocation.service.ts # GPS tracking
│   │   │   │   └── sync.service.ts        # Offline sync
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── offline.interceptor.ts
│   │   │   └── core.module.ts
│   │   │
│   │   ├── shared/                        # Shared components, directives, pipes
│   │   │   ├── components/
│   │   │   │   ├── confirm-dialog/
│   │   │   │   ├── image-upload/
│   │   │   │   └── loading-spinner/
│   │   │   ├── directives/
│   │   │   │   └── lazy-load-image.directive.ts
│   │   │   ├── pipes/
│   │   │   │   ├── distance.pipe.ts       # Formatowanie odległości
│   │   │   │   └── date-format.pipe.ts
│   │   │   └── shared.module.ts
│   │   │
│   │   ├── features/                      # Feature modules (lazy loaded)
│   │   │   ├── map/
│   │   │   │   ├── components/
│   │   │   │   │   ├── map-view/
│   │   │   │   │   │   ├── map-view.component.ts
│   │   │   │   │   │   ├── map-view.component.html
│   │   │   │   │   │   ├── map-view.component.scss
│   │   │   │   │   │   └── map-view.component.spec.ts
│   │   │   │   │   ├── grave-marker/
│   │   │   │   │   ├── user-location/
│   │   │   │   │   └── navigation-controls/
│   │   │   │   ├── pages/
│   │   │   │   │   └── map-page/
│   │   │   │   ├── services/
│   │   │   │   │   └── map.service.ts
│   │   │   │   ├── map-routing.module.ts
│   │   │   │   └── map.module.ts
│   │   │   │
│   │   │   ├── graves/
│   │   │   │   ├── components/
│   │   │   │   │   ├── grave-list/
│   │   │   │   │   ├── grave-card/
│   │   │   │   │   ├── grave-form/
│   │   │   │   │   ├── grave-detail/
│   │   │   │   │   └── photo-gallery/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── graves-page/
│   │   │   │   │   ├── grave-detail-page/
│   │   │   │   │   └── add-grave-page/
│   │   │   │   ├── services/
│   │   │   │   │   └── grave.service.ts
│   │   │   │   ├── models/
│   │   │   │   │   └── grave.model.ts
│   │   │   │   ├── graves-routing.module.ts
│   │   │   │   └── graves.module.ts
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── pages/
│   │   │   │   │   └── settings-page/
│   │   │   │   ├── settings-routing.module.ts
│   │   │   │   └── settings.module.ts
│   │   │   │
│   │   │   └── auth/
│   │   │       ├── pages/
│   │   │       │   ├── login-page/
│   │   │       │   └── register-page/
│   │   │       ├── auth-routing.module.ts
│   │   │       └── auth.module.ts
│   │   │
│   │   ├── layout/                        # Layout components
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   ├── sidenav/
│   │   │   └── bottom-nav/
│   │   │
│   │   ├── app-routing.module.ts
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   └── app.module.ts
│   │
│   ├── assets/
│   │   ├── icons/
│   │   ├── images/
│   │   └── i18n/                          # Tłumaczenia
│   │       ├── en.json
│   │       └── pl.json
│   │
│   ├── environments/
│   │   ├── environment.ts                 # Development
│   │   └── environment.prod.ts            # Production
│   │
│   ├── styles/
│   │   ├── _variables.scss
│   │   ├── _mixins.scss
│   │   ├── _theme.scss                    # Angular Material theme
│   │   └── styles.scss                    # Global styles
│   │
│   ├── index.html
│   ├── main.ts
│   ├── polyfills.ts
│   └── manifest.webmanifest               # PWA manifest
│
├── angular.json                           # Angular CLI config
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── package.json
├── ngsw-config.json                       # Service Worker config
└── karma.conf.js                          # Test config
```

**Standalone Components (Angular 17+ - alternative approach):**

```
src/app/
├── components/                            # Wszystkie komponenty jako standalone
│   ├── map/
│   ├── graves/
│   └── shared/
├── services/
├── guards/
├── models/
├── app.routes.ts                          # Routes bez NgModule
└── app.config.ts                          # App configuration
```

---

## 5. User Stories i Priorityzacja

### 5.1 MVP (Minimum Viable Product) - Faza 1

**Sprint 1 (2 tygodnie):**

- [ ] US-001: Jako użytkownik mogę zobaczyć mapę mojej lokalizacji
- [ ] US-002: Jako użytkownik mogę dodać pinezkę grobu z aktualnej lokalizacji
- [ ] US-003: Jako użytkownik mogę dodać podstawowe info (imię, nazwisko, daty)
- [ ] US-004: Jako użytkownik mogę zobaczyć listę moich grobów

**Sprint 2 (2 tygodnie):**

- [ ] US-005: Jako użytkownik mogę dodać zdjęcie do grobu
- [ ] US-006: Jako użytkownik mogę edytować informacje o grobie
- [ ] US-007: Jako użytkownik mogę usunąć grób
- [ ] US-008: Jako użytkownik mogę zobaczyć odległość do grobu

**Sprint 3 (2 tygodnie):**

- [ ] US-009: Jako użytkownik mogę używać aplikacji offline
- [ ] US-010: Jako użytkownik mogę wyszukać grób po nazwisku
- [ ] US-011: Aplikacja działa jako PWA (instalowalna)
- [ ] US-012: Responsywny design (mobile-first)

### 5.2 Faza 2 - Rozszerzenie funkcjonalności

**Sprint 4:**

- [ ] US-013: Nawigacja do grobu w czasie rzeczywistym
- [ ] US-014: Wiele zdjęć w galerii
- [ ] US-015: Notatki i wspomnienia
- [ ] US-016: Filtrowanie i sortowanie grobów

**Sprint 5:**

- [ ] US-017: Uwierzytelnianie użytkowników
- [ ] US-018: Synchronizacja w chmurze
- [ ] US-019: Backup i restore danych
- [ ] US-020: Udostępnianie lokalizacji grobu

### 5.3 Faza 3 - Funkcje zaawansowane

**Sprint 6+:**

- [ ] US-021: Przypomnienia o rocznicach
- [ ] US-022: Współdzielenie z rodziną
- [ ] US-023: Tryb offline z pre-cache map
- [ ] US-024: Statystyki i historia wizyt
- [ ] US-025: Wielojęzyczność
- [ ] US-026: Tryb ciemny

---

## 6. Specyfikacja API (REST)

### 6.1 Endpoints

#### Graves

```
GET    /api/graves              - Lista grobów użytkownika
POST   /api/graves              - Dodaj nowy grób
GET    /api/graves/:id          - Szczegóły grobu
PUT    /api/graves/:id          - Aktualizuj grób
DELETE /api/graves/:id          - Usuń grób
GET    /api/graves/nearby       - Groby w pobliżu (query: lat, lng, radius)
```

#### Photos

```
POST   /api/graves/:id/photos   - Upload zdjęcia
DELETE /api/graves/:id/photos/:photoId - Usuń zdjęcie
PUT    /api/graves/:id/photos/:photoId - Ustaw jako główne
```

#### Sync

```
POST   /api/sync                - Synchronizuj zmiany offline
GET    /api/sync/status         - Status synchronizacji
```

#### User

```
POST   /api/auth/register       - Rejestracja
POST   /api/auth/login          - Logowanie
GET    /api/user/profile        - Profil użytkownika
PUT    /api/user/settings       - Ustawienia
```

### 6.2 Request/Response Examples

**POST /api/graves**

```json
{
  "latitude": 52.2297,
  "longitude": 21.0122,
  "accuracy": 5.2,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "birthDate": "1950-03-15",
  "deathDate": "2020-11-01",
  "relationship": "Dziadek",
  "cemeteryName": "Cmentarz Powązkowski",
  "graveNumber": "A-123",
  "sector": "Sektor 5",
  "notes": "Przy dużym dębie"
}
```

**Response 201:**

```json
{
  "id": "uuid-v4",
  "latitude": 52.2297,
  "longitude": 21.0122,
  "accuracy": 5.2,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "birthDate": "1950-03-15",
  "deathDate": "2020-11-01",
  "relationship": "Dziadek",
  "cemeteryName": "Cmentarz Powązkowski",
  "graveNumber": "A-123",
  "sector": "Sektor 5",
  "notes": "Przy dużym dębie",
  "photos": [],
  "createdAt": "2025-11-06T10:30:00Z",
  "updatedAt": "2025-11-06T10:30:00Z"
}
```

---

## 7. Design System i UX

### 7.1 Kolorystyka

```scss
// Primary colors
$primary: #2e7d32; // Zielony (życie, nadzieja)
$secondary: #424242; // Szary (powaga, spokój)
$accent: #ffb300; // Amber (światło, pamięć)

// Functional colors
$success: #43a047;
$error: #e53935;
$warning: #fb8c00;
$info: #1976d2;

// Neutrals
$background: #fafafa;
$surface: #ffffff;
$text-primary: #212121;
$text-secondary: #757575;
```

### 7.2 Typografia

```scss
// Font family
$font-primary: "Roboto", sans-serif;
$font-secondary: "Lato", sans-serif;

// Font sizes (mobile-first)
$h1: 28px;
$h2: 24px;
$h3: 20px;
$body: 16px;
$small: 14px;
$tiny: 12px;
```

### 7.3 Ikony

- Material Icons lub Lucide Icons
- SVG dla ikon pinezek (custom)
- Rozróżnialne ikony dla różnych typów grobów

### 7.4 Główne Ekrany (Wireframes description)

#### Ekran 1: Mapa (Home)

- **Header**: Logo + Menu hamburger + Search
- **Mapa**: Pełnoekranowa z pinezkami
- **FAB (Floating)**: "Dodaj grób" (GPS pin icon)
- **Bottom Sheet**: Miniaturka grobu po kliknięciu pinezki
- **Controls**: Zoom, Current Location, Compass

#### Ekran 2: Lista Grobów

- **Header**: Tytuł + Search + Filter
- **Lista**: Cards z:
  - Zdjęciem głównym
  - Imieniem i nazwiskiem
  - Cmentarzem
  - Odległością
  - Akcjami (Edytuj, Usuń)
- **Bottom Nav**: Mapa | Lista | Ustawienia

#### Ekran 3: Szczegóły Grobu

- **Hero Image**: Główne zdjęcie
- **Info Card**:
  - Dane osoby
  - Daty
  - Relacja
- **Mapa**: Mini mapa z lokalizacją
- **Galeria**: Carousel zdjęć
- **Actions**: Nawiguj | Edytuj | Udostępnij
- **Notes**: Rozwijalna sekcja

#### Ekran 4: Dodawanie Grobu

- **Step 1**: Wybierz lokalizację (mapa)
- **Step 2**: Dane osoby (formularz)
- **Step 3**: Dodaj zdjęcia
- **Step 4**: Notatki (opcjonalne)
- **Progress Bar**: 1/4, 2/4, 3/4, 4/4

---

## 8. Bezpieczeństwo i Prywatność

### 8.1 Wymagania Bezpieczeństwa

- [ ] HTTPS wszędzie (SSL/TLS)
- [ ] Hashowanie haseł (bcrypt, salt rounds >= 10)
- [ ] JWT tokens (access + refresh)
- [ ] Rate limiting API (express-rate-limit)
- [ ] Input validation (Zod / Yup)
- [ ] XSS protection (Content Security Policy)
- [ ] CSRF tokens

### 8.2 Prywatność Danych

- [ ] RODO compliance
- [ ] Zgoda na przetwarzanie danych osobowych
- [ ] Prawo do usunięcia danych
- [ ] Szyfrowanie danych wrażliwych
- [ ] Anonimizacja logów
- [ ] Polityka prywatności
- [ ] Cookies consent

### 8.3 Przechowywanie Lokalnie

- [ ] IndexedDB (dla danych strukturalnych)
- [ ] Blob storage (dla zdjęć offline)
- [ ] Encrypted storage dla wrażliwych danych

---

## 9. Performance i Optymalizacja

### 9.1 Metryki

**Target:**

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.0s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

### 9.2 Strategie Optymalizacji

#### Frontend

- [ ] Code splitting (React.lazy)
- [ ] Tree shaking (Vite automatycznie)
- [ ] Image lazy loading
- [ ] Virtual scrolling dla długich list (react-window)
- [ ] Debouncing search inputs
- [ ] Memoization (React.memo, useMemo)

#### Backend

- [ ] Database indexing (geospatial)
- [ ] Query optimization
- [ ] Caching (Redis dla popularnych zapytań)
- [ ] CDN dla zdjęć
- [ ] Compression (gzip/brotli)

#### PWA

- [ ] App shell caching
- [ ] Precaching critical assets
- [ ] Background sync
- [ ] Push notifications (opt-in)

### 9.3 Bundle Size Targets

- Initial bundle: < 200KB (gzipped)
- Total app: < 1MB
- Each lazy chunk: < 100KB

---

## 10. Accessibility (A11y)

### 10.1 WCAG 2.1 Level AA Compliance

- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] Color contrast >= 4.5:1
- [ ] Screen reader support
- [ ] Alt text dla obrazów
- [ ] Skip links

### 10.2 Szczególne Wymagania

- [ ] Duże przyciski (min 44x44px) dla seniorów
- [ ] Opcja zwiększenia fontów
- [ ] Wysoki kontrast mode
- [ ] Voice commands (opcjonalnie)

---

## 11. Internacjonalizacja (i18n)

### 11.1 Biblioteka

```typescript
"react-i18next": "^13.5.0"
"i18next": "^23.7.0"
```

### 11.2 Języki (Faza 1)

- Polski (domyślny)
- English

### 11.3 Przyszłe języki

- Niemiecki
- Ukraiński
- Rosyjski

---

## 12. Monitoring i Analytics

### 12.1 Error Tracking

**Rekomendacja: Sentry**

```typescript
"@sentry/react": "^7.85.0"
```

### 12.2 Analytics

**Rekomendacja: Plausible lub Google Analytics 4**

- Anonimowe statystyki użycia
- GDPR compliant
- Event tracking:
  - Dodanie grobu
  - Użycie nawigacji
  - Upload zdjęcia
  - Offline usage

### 12.3 Performance Monitoring

- Lighthouse CI
- Web Vitals reporting
- Real User Monitoring (RUM)

---

## 13. DevOps i Deployment

### 13.1 CI/CD Pipeline

**Rekomendacja: GitHub Actions**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Install deps
      - Run tests
      - Build
      - Deploy to Vercel/Netlify
```

### 13.2 Hosting

**Frontend (PWA):**

- Vercel (rekomendowane)
- Netlify
- Firebase Hosting
- AWS Amplify

**Backend:**

- Railway.app (łatwe, tanie)
- Render.com
- AWS ECS/Fargate
- DigitalOcean App Platform

**Database:**

- Supabase (darmowy tier)
- AWS RDS
- PlanetScale (MySQL)
- Neon (PostgreSQL serverless)

### 13.3 Environments

- **Development**: localhost
- **Staging**: staging.gravemap.app
- **Production**: app.gravemap.app

### 13.4 Backup Strategy

- Daily automated backups
- Point-in-time recovery
- Export user data na żądanie

---

## 14. Roadmap i Timeline

### 14.1 Faza MVP (6 tygodni)

**Tygodnie 1-2:**

- Setup projektu (Vite + React + TypeScript)
- Konfiguracja Leaflet
- Podstawowa mapa z geolokalizacją
- Dodawanie pinezek

**Tygodnie 3-4:**

- Formularz dodawania grobu
- IndexedDB setup
- Upload zdjęć (frontend)
- Lista grobów

**Tygodnie 5-6:**

- PWA configuration
- Offline mode
- Testing i bugfixing
- MVP release

### 14.2 Faza 2 (4 tygodnie)

- Backend API (jeśli potrzebne)
- Synchronizacja w chmurze
- Uwierzytelnianie
- Nawigacja do grobu

### 14.3 Faza 3 (ongoing)

- Przypomnienia
- Współdzielenie
- Statystyki
- Mobile app (React Native)

---

## 15. Zespół i Role

### 15.1 Zalecana Wielkość Zespołu (MVP)

- **1x Frontend Developer** (React/TypeScript)
- **1x Backend Developer** (Node.js/Firebase) - opcjonalne dla MVP
- **1x UI/UX Designer** (part-time)
- **1x QA Tester** (part-time)
- **1x Project Manager/Product Owner**

### 15.2 Umiejętności Kluczowe

- React + TypeScript
- PWA development
- Leaflet / Maps APIs
- IndexedDB
- Service Workers
- Mobile-first design
- RESTful API design (jeśli backend)

### 15.3 Onboarding

- **Dokumentacja**: Ten dokument + README
- **Setup guide**: Krok po kroku instalacja
- **Code style guide**: ESLint + Prettier config
- **Git workflow**: Feature branches + PR reviews
- **Testing requirements**: Min 80% coverage dla critical paths

---

## 16. Ryzyka i Mitigacje

### 16.1 Ryzyka Techniczne

| Ryzyko                      | Prawdopodobieństwo | Wpływ  | Mitigacja                               |
| --------------------------- | ------------------ | ------ | --------------------------------------- |
| Niska dokładność GPS        | Wysokie            | Wysoki | Umożliwić manualne dostrajanie pinezek  |
| Brak internetu na cmentarzu | Wysokie            | Średni | Offline-first architecture + pre-cache  |
| Duży rozmiar zdjęć          | Średnie            | Średni | Kompresja WebP, resize, lazy loading    |
| Problemy z baterią (GPS)    | Średnie            | Średni | Optymalizacja watchPosition, throttling |
| Cross-browser compatibility | Niskie             | Średni | Testing na wielu przeglądarkach         |

### 16.2 Ryzyka Biznesowe

| Ryzyko                     | Prawdopodobieństwo | Wpływ  | Mitigacja                                |
| -------------------------- | ------------------ | ------ | ---------------------------------------- |
| Niska adopcja użytkowników | Średnie            | Wysoki | Beta testing, marketing, prosta UX       |
| Koszty infrastruktury      | Niskie             | Średni | Serverless, pay-as-you-go modele         |
| Problemy prawne (RODO)     | Niskie             | Wysoki | Konsultacja prawna, compliance od startu |
| Konkurencja                | Niskie             | Średni | Unikalne features (precyzja, offline)    |

---

## 17. Koszty Szacunkowe

### 17.1 Infrastruktura (miesięcznie)

**Opcja 1: Minimal (Firebase)**

- Firebase (Spark - darmowy): $0
- Cloudinary (darmowy tier): $0
- Domain: ~$1/miesiąc
- **Total: ~$1/miesiąc** (do 1000 użytkowników)

**Opcja 2: Scalable (AWS/Supabase)**

- Vercel (Hobby): $0
- Supabase (darmowy): $0
- AWS S3 + CloudFront: ~$5-10/miesiąc
- Domain: ~$1/miesiąc
- **Total: ~$6-11/miesiąc** (do 5000 użytkowników)

**Opcja 3: Production (własny backend)**

- VPS (DigitalOcean): $12/miesiąc
- Database (managed): $15/miesiąc
- S3: $5/miesiąc
- Domain: $1/miesiąc
- **Total: ~$33/miesiąc**

### 17.2 Development (one-time)

- Design (UI/UX): 40h x $50 = $2,000
- Frontend MVP: 200h x $60 = $12,000
- Backend MVP: 80h x $60 = $4,800
- Testing & QA: 40h x $40 = $1,600
- **Total MVP: ~$20,400**

### 17.3 Maintenance (miesięcznie)

- Bugfixes: 10h x $60 = $600
- Updates: 5h x $60 = $300
- Monitoring: $50
- **Total: ~$950/miesiąc**

---

## 18. Success Metrics (KPIs)

### 18.1 Metryki Techniczne

- [ ] PWA Lighthouse score > 90
- [ ] Bundle size < 200KB (gzipped)
- [ ] 99.9% uptime
- [ ] < 1% error rate
- [ ] GPS accuracy < 10 metrów (90% przypadków)

### 18.2 Metryki Użytkownika

- [ ] 100 aktywnych użytkowników w miesiąc 1
- [ ] 1000 dodanych grobów w miesiąc 3
- [ ] 70% retention rate (7-day)
- [ ] 4.5+ rating w PWA reviews
- [ ] < 5% bounce rate

### 18.3 Metryki Biznesowe (jeśli monetyzacja)

- [ ] 10% conversion do premium
- [ ] $5 ARPU (Average Revenue Per User)
- [ ] < $10 CAC (Customer Acquisition Cost)

---

## 19. Dokumentacja Dodatkowa

### 19.1 Dla Developerów

- [ ] README.md - Quick start
- [ ] CONTRIBUTING.md - Guidelines
- [ ] API.md - API documentation
- [ ] ARCHITECTURE.md - System design
- [ ] TESTING.md - Testing strategy

### 19.2 Dla Użytkowników

- [ ] User Guide (FAQ)
- [ ] Video tutorials
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Contact/Support

---

## 20. Next Steps - Plan Implementacji

### 20.1 Krok 1: Setup (Tydzień 1)

#### Opcja A: Nx Monorepo (zalecane)

```bash
# 1. Inicjalizacja Nx workspace
npx create-nx-workspace@latest grave-app
# Wybierz: apps [empty]
cd grave-app

# 2. Dodaj Angular frontend
nx g @nx/angular:app frontend --routing --style=scss --standalone=false
# Dodaj PWA support
cd apps/frontend
ng add @angular/pwa
cd ../..

# 3. Dodaj NestJS backend
nx g @nx/nest:app backend

# 4. Dodaj shared library
nx g @nx/js:lib shared-models

# 5. Instalacja zależności Angular
npm install @angular/material @angular/cdk
npm install leaflet @asymmetrik/ngx-leaflet
npm install @types/leaflet
npm install dexie
npm install geolib

# 6. Instalacja zależności NestJS
npm install @nestjs/config @nestjs/swagger
npm install @supabase/supabase-js
npm install class-validator class-transformer
npm install sharp
npm install @nestjs/typeorm typeorm pg
# lub Prisma
npm install prisma @prisma/client

# 7. Dev dependencies
npm install -D @types/node
npm install -D prettier eslint
npm install -D @angular-eslint/eslint-plugin
npm install -D @typescript-eslint/eslint-plugin
```

#### Opcja B: Separate Projects (prostsze)

```bash
# 1. Frontend - Angular
npm install -g @angular/cli
ng new frontend --routing --style=scss --standalone=false
cd frontend

# Dodaj PWA
ng add @angular/pwa

# Dodaj Angular Material
ng add @angular/material

# Dodaj pozostałe zależności
npm install leaflet @asymmetrik/ngx-leaflet @types/leaflet
npm install dexie geolib
npm install @supabase/supabase-js

cd ..

# 2. Backend - NestJS
npm install -g @nestjs/cli
nest new backend
cd backend

# Dodaj zależności
npm install @nestjs/config @nestjs/swagger
npm install @supabase/supabase-js
npm install class-validator class-transformer
npm install sharp multer
npm install @nestjs/platform-express

# Prisma (ORM)
npm install prisma @prisma/client
npx prisma init

cd ..
```

### 20.2 Krok 2: Struktura Projektu

- Utworzenie folderów według struktury w sekcji 4.2
- Konfiguracja TypeScript, ESLint, Prettier
- Setup Git repository
- Inicjalizacja CI/CD

### 20.3 Krok 3: Prototyp (Tydzień 2-3)

#### Frontend (Angular)

```bash
# Generowanie komponentów
ng g module features/map --routing
ng g component features/map/components/map-view
ng g component features/map/components/grave-marker
ng g service features/map/services/map

ng g module features/graves --routing
ng g component features/graves/components/grave-form
ng g component features/graves/components/grave-list
ng g service features/graves/services/grave

ng g service core/services/geolocation
ng g service core/services/indexeddb
```

**Przykład: map-view.component.ts**

```typescript
import { Component, OnInit } from "@angular/core";
import * as L from "leaflet";
import { GeolocationService } from "../../../core/services/geolocation.service";

@Component({
  selector: "app-map-view",
  templateUrl: "./map-view.component.html",
  styleUrls: ["./map-view.component.scss"],
})
export class MapViewComponent implements OnInit {
  map!: L.Map;
  options: L.MapOptions = {
    layers: [
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }),
    ],
    zoom: 15,
    center: L.latLng(52.2297, 21.0122), // Warszawa
  };

  constructor(private geoService: GeolocationService) {}

  ngOnInit() {
    this.geoService.getCurrentPosition().subscribe((pos) => {
      if (this.map) {
        this.map.setView([pos.latitude, pos.longitude], 15);
      }
    });
  }

  onMapReady(map: L.Map) {
    this.map = map;
  }

  addMarker(lat: number, lng: number) {
    L.marker([lat, lng]).addTo(this.map);
  }
}
```

**map-view.component.html**

```html
<div class="map-container">
  <div
    leaflet
    [leafletOptions]="options"
    (leafletMapReady)="onMapReady($event)"
    class="map"
  ></div>
</div>
```

#### Backend (NestJS)

```bash
# Generowanie modułów
nest g module graves
nest g controller graves
nest g service graves

nest g module photos
nest g controller photos
nest g service photos

nest g module auth
nest g service auth
```

**Przykład: graves.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { GravesService } from "./graves.service";
import { CreateGraveDto } from "./dto/create-grave.dto";

@ApiTags("graves")
@Controller("api/graves")
export class GravesController {
  constructor(private readonly gravesService: GravesService) {}

  @Get()
  @ApiOperation({ summary: "Get all graves" })
  async findAll() {
    return this.gravesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: "Create new grave" })
  async create(@Body() createGraveDto: CreateGraveDto) {
    return this.gravesService.create(createGraveDto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.gravesService.findOne(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() updateGraveDto: any) {
    return this.gravesService.update(id, updateGraveDto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.gravesService.remove(id);
  }
}
```

**Prisma Schema (prisma/schema.prisma):**

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [postgis]
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  graves    Grave[]
}

model Grave {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Geolocation - PostGIS
  latitude    Float
  longitude   Float
  accuracy    Float?

  // Person info
  firstName   String
  lastName    String
  birthDate   DateTime?
  deathDate   DateTime?
  relationship String?

  // Location info
  cemeteryName String?
  graveNumber  String?
  sector       String?
  notes        String?

  photos      Photo[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastVisited DateTime?

  @@index([userId])
}

model Photo {
  id         String   @id @default(uuid())
  graveId    String
  grave      Grave    @relation(fields: [graveId], references: [id], onDelete: Cascade)
  photoUrl   String
  thumbnailUrl String?
  isPrimary  Boolean  @default(false)
  uploadedAt DateTime @default(now())

  @@index([graveId])
}
```

**Inicjalizacja Prisma:**

```bash
cd backend
npx prisma init
# Edytuj .env i schema.prisma
npx prisma migrate dev --name init
npx prisma generate
```

### 20.4 Krok 4: MVP Features (Tydzień 4-6)

- IndexedDB integration
- Upload zdjęć
- Lista grobów
- Wyszukiwanie
- PWA configuration

### 20.5 Krok 5: Testing i Launch (Tydzień 6)

- Unit tests
- E2E tests
- Beta testing z użytkownikami
- Bugfixes
- Production deployment

---

## 21. Kontakt i Wsparcie

### 21.1 Dla Zespołu

- **Project Repository**: GitHub/GitLab
- **Communication**: Slack/Discord
- **Project Management**: Jira/Linear/Trello
- **Documentation**: Notion/Confluence

### 21.2 Dla Użytkowników

- **Email**: support@gravemap.app
- **FAQ**: app.gravemap.app/faq
- **Feedback**: Formularz w aplikacji

---

## 22. Podsumowanie i Rekomendacje

### 22.1 Kluczowe Rekomendacje dla Zespołu

#### Stack Technologiczny (Wybrany)

**Frontend:**

1. ✅ **Angular 17+** (Standalone Components)
2. ✅ **Angular Material** - UI components
3. ✅ **Leaflet + @asymmetrik/ngx-leaflet** - mapa
4. ✅ **@angular/pwa** - PWA support
5. ✅ **Dexie.js** - IndexedDB dla offline
6. ✅ **RxJS + Signals** - state management
7. ✅ **TypeScript** - type safety

**Backend:**

1. ✅ **NestJS** - framework (Express pod spodem)
2. ✅ **Supabase** - PostgreSQL + PostGIS + Auth + Storage
3. ✅ **Prisma** - ORM (alternatywa: TypeORM)
4. ✅ **Sharp** - przetwarzanie obrazów
5. ✅ **Swagger** - dokumentacja API (@nestjs/swagger)
6. ✅ **JWT** - authentication
7. ✅ **TypeScript** - type safety

**Infrastruktura:**

1. ✅ **Supabase** - database, auth, storage (darmowy tier)
2. ✅ **Vercel/Netlify** - hosting Angular PWA (darmowy tier)
3. ✅ **Railway/Render** - hosting NestJS (darmowy tier)
4. ✅ **GitHub Actions** - CI/CD

### 22.2 Dlaczego Ten Stack?

✅ **Enterprise-grade**: Angular + NestJS = stabilność i wsparcie  
✅ **Type Safety**: TypeScript wszędzie (frontend + backend + shared models)  
✅ **Podobne wzorce**: Angular i NestJS używają tych samych konceptów (DI, decorators, modules)  
✅ **Offline-first**: @angular/pwa + Service Workers + IndexedDB  
✅ **Skalowalne**: Monorepo Nx + microservices ready (NestJS)  
✅ **Geospatial**: PostGIS w Supabase = najlepsza opcja dla map  
✅ **Tanie**: Supabase darmowy tier + Vercel/Railway free tier  
✅ **Mobile-friendly**: PWA + łatwa migracja do Ionic Angular  
✅ **Zespół**: Jeden stack TypeScript = łatwiejsze onboarding  
✅ **Testowanie**: Jasmine/Jest + Cypress wbudowane

### 22.3 Porównanie z Alternatywami

| Cecha            | Angular + NestJS | React + Express | Vue + Fastify |
| ---------------- | ---------------- | --------------- | ------------- |
| Type Safety      | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐        | ⭐⭐⭐⭐      |
| PWA Support      | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐        | ⭐⭐⭐⭐      |
| Enterprise Ready | ⭐⭐⭐⭐⭐       | ⭐⭐⭐          | ⭐⭐⭐        |
| Learning Curve   | ⭐⭐⭐           | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐      |
| Mobile (Ionic)   | ⭐⭐⭐⭐⭐       | ⭐⭐⭐          | ⭐⭐⭐        |
| Community        | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐      |
| Bundle Size      | ⭐⭐⭐           | ⭐⭐⭐⭐        | ⭐⭐⭐⭐⭐    |

### 22.3 Potencjalne Rozszerzenia

- 🚀 React Native mobile app (iOS/Android)
- 🤖 AI rozpoznawanie nagrobków ze zdjęć
- 🌍 Crowdsourced database cmentarzy
- 👥 Social features (udostępnianie wspomnień)
- 💐 Integracja z kwiaciarniami
- 🕯️ Wirtualne znicze i kwiaty

---

**Dokument przygotowany**: 6 listopada 2025
**Wersja**: 1.0
**Autor**: AI Assistant dla projektu GraveMap
**Status**: Draft - wymaga review zespołu

---

## Licencja i Copyright

© 2025 GraveMap Project. Wszelkie prawa zastrzeżone.
Dokumentacja na użytek wewnętrzny zespołu deweloperskiego.

# Dokumentacja Projektowa - Aplikacja "GraveMap"

## 1. Opis Projektu

### 1.1 Cel Aplikacji

Aplikacja webowa (PWA) umożliwiająca użytkownikom zapisywanie precyzyjnych lokalizacji grobów bliskich na interaktywnej mapie, wraz z możliwością dodawania opisów, zdjęć i innych informacji. Aplikacja ma pomóc w szybkim odnalezieniu miejsca pochówku podczas wizyt na cmentarzu.

### 1.2 Grupa Docelowa

- Osoby odwiedzające groby bliskich
- Rodziny z wieloma miejscami pochówku
- Osoby odwiedzające nieznane cmentarze
- Seniorzy potrzebujący prostej nawigacji

### 1.3 Kluczowe Wartości

- **Precyzja**: Dokładne współrzędne GPS (±3-5 metrów)
- **Prywatność**: Dane przechowywane lokalnie lub w prywatnej chmurze
- **Dostępność**: Działanie offline po pierwszym załadowaniu
- **Prostota**: Intuicyjny interfejs dla wszystkich grup wiekowych

---

## 2. Wymagania Funkcjonalne

### 2.1 Moduł Mapy

#### 2.1.1 Wyświetlanie Mapy

- [ ] Interaktywna mapa z możliwością zoomowania i przesuwania
- [ ] Wyświetlanie pinezek grobów z ikonami
- [ ] Tryb satelitarny i mapowy
- [ ] Wskaźnik aktualnej lokalizacji użytkownika
- [ ] Kompas i orientacja mapy

#### 2.1.2 Dodawanie Pinezki

- [ ] Dodawanie pinezki przez długie naciśnięcie na mapie
- [ ] Dodawanie pinezki z aktualnej lokalizacji GPS
- [ ] Precyzyjne dostrajanie pozycji pinezki (drag & drop)
- [ ] Walidacja współrzędnych GPS
- [ ] Zapisywanie dokładności pomiaru GPS

#### 2.1.3 Nawigacja

- [ ] Wyznaczanie trasy do wybranego grobu
- [ ] Wyświetlanie odległości do grobu w czasie rzeczywistym
- [ ] Kierunek wskazujący grób (kompas AR - opcjonalnie)
- [ ] Historia ostatnio odwiedzonych grobów

### 2.2 Moduł Zarządzania Grobami

#### 2.2.1 Karta Grobu

- [ ] Imię i nazwisko osoby zmarłej
- [ ] Data urodzenia i śmierci
- [ ] Relacja do użytkownika (mama, tata, dziadek, etc.)
- [ ] Numer grobu / sektor cmentarza
- [ ] Nazwa cmentarza
- [ ] Notatki / wspomnienia
- [ ] Wielojęzyczność (PL/EN minimum)

#### 2.2.2 Galeria Zdjęć

- [ ] Dodawanie wielu zdjęć do grobu
- [ ] Robienie zdjęć bezpośrednio z kamery
- [ ] Kompresja zdjęć dla oszczędności przestrzeni
- [ ] Przeglądanie zdjęć w galerii
- [ ] Usuwanie i edycja zdjęć
- [ ] Zdjęcie główne (wyświetlane na pinezce)

#### 2.2.3 Zarządzanie Danymi

- [ ] Lista wszystkich dodanych grobów
- [ ] Wyszukiwanie grobów po nazwisku
- [ ] Filtrowanie po cmentarzach
- [ ] Sortowanie (alfabetycznie, po dacie dodania, po odległości)
- [ ] Edycja informacji o grobie
- [ ] Usuwanie grobu (z potwierdzeniem)

### 2.3 Moduł Offline i Synchronizacji

#### 2.3.1 Tryb Offline

- [ ] Działanie aplikacji bez połączenia internetowego
- [ ] Buforowanie map dla wybranych obszarów
- [ ] Lokalne przechowywanie wszystkich danych
- [ ] Kolejka zmian do synchronizacji

#### 2.3.2 Synchronizacja (opcjonalna)

- [ ] Backup danych do chmury
- [ ] Synchronizacja między urządzeniami
- [ ] Udostępnianie grobów członkom rodziny
- [ ] Import/Export danych (JSON)

### 2.4 Moduł Użytkownika

#### 2.4.1 Uwierzytelnianie (opcjonalne)

- [ ] Rejestracja przez email
- [ ] Logowanie przez Google/Facebook
- [ ] Tryb anonimowy (tylko lokalne dane)
- [ ] Resetowanie hasła

#### 2.4.2 Profil

- [ ] Ustawienia aplikacji
- [ ] Preferencje mapy (typ, zoom domyślny)
- [ ] Jednostki odległości (metry/stopy)
- [ ] Zarządzanie pamięcią cache

### 2.5 Funkcje Dodatkowe

#### 2.5.1 Przypomnienia

- [ ] Ustawianie przypomnień o rocznicach
- [ ] Powiadomienia push
- [ ] Kalendarz wizyt na cmentarzu

#### 2.5.2 Współdzielenie

- [ ] Udostępnianie lokalizacji grobu innym (link)
- [ ] Współdzielenie z członkami rodziny
- [ ] Grupowanie grobów rodzinnych

#### 2.5.3 Statystyki

- [ ] Liczba wizyt na cmentarzu
- [ ] Historia odwiedzin
- [ ] Mapa cieplna najczęściej odwiedzanych miejsc

---

## 3. Architektura Techniczna

### 3.1 Stack Technologiczny - Frontend

#### 3.1.1 Framework JavaScript

**Wybrany Stack: Angular 17+ (Standalone Components)**

**Uzasadnienie:**

- ✅ Enterprise-grade framework z pełnym ekosystemem
- ✅ TypeScript jako standard (type safety z natury)
- ✅ Angular PWA (@angular/pwa) - najlepsza integracja PWA
- ✅ RxJS - reaktywne programowanie idealne dla geolokalizacji real-time
- ✅ Dependency Injection - czysta architektura
- ✅ Angular Material - gotowe komponenty UI
- ✅ Standalone Components (Angular 17+) - lepsza modularność
- ✅ Signals (Angular 16+) - reaktywność bez Zone.js overhead
- ✅ Ionic Angular - łatwa migracja do mobile app

**Kluczowe Features Angular dla tego projektu:**

- Service Workers z @angular/service-worker
- HttpClient z interceptorami (offline queue)
- Router z lazy loading
- Forms (Reactive Forms dla formularzy grobów)
- Animations dla UX

#### 3.1.2 Biblioteka Map

**Wybrany Stack: Leaflet z Angular**

**Uzasadnienie:**

- ✅ Open-source, bez kosztów licencyjnych
- ✅ Lekka biblioteka (40KB)
- ✅ Doskonałe wsparcie offline
- ✅ Świetna integracja z Angular przez @asymmetrik/ngx-leaflet
- ✅ Wsparcie dla własnych ikon i warstw
- ✅ Wiele dostawców kafelków (OpenStreetMap, MapBox, Google)
- ✅ TypeScript definitions out-of-the-box

**Konfiguracja Angular:**

```typescript
// package.json
"leaflet": "^1.9.4"
"@asymmetrik/ngx-leaflet": "^17.0.0"
"@types/leaflet": "^1.9.8"

// angular.json - dodać do styles i scripts
"styles": [
  "node_modules/leaflet/dist/leaflet.css"
],
"scripts": [
  "node_modules/leaflet/dist/leaflet.js"
]
```

**Integracja:**

```typescript
// app.component.ts
import * as L from "leaflet";
import { LeafletModule } from "@asymmetrik/ngx-leaflet";

// Komponenty używają dyrektywy [leafletOptions]
```

#### 3.1.3 UI Framework

**Wybrany Stack: Angular Material**

**Uzasadnienie:**

- ✅ Oficjalna biblioteka Google dla Angular
- ✅ Pełna integracja z Angular (Dependency Injection, Forms, etc.)
- ✅ Komponenty responsywne out-of-the-box
- ✅ Material Design 3 (najnowsza wersja)
- ✅ Accessibility (a11y) wbudowane
- ✅ Theming system (custom palety kolorów)
- ✅ Dark mode support
- ✅ CDK (Component Dev Kit) - niski poziom abstrakcji
- ✅ Doskonała dokumentacja i przykłady

**Konfiguracja:**

```bash
ng add @angular/material
```

**Kluczowe Komponenty dla GraveMap:**

- MatCard - karty grobów
- MatList - lista grobów
- MatDialog - modale (dodawanie/edycja)
- MatBottomSheet - quick view po kliknięciu pinezki
- MatFab - floating action button "Dodaj grób"
- MatFormField - formularze
- MatChips - tagi i filtry
- MatSnackBar - powiadomienia
- MatProgressSpinner - loading states

#### 3.1.4 State Management

**Wybrany Stack: Angular Services + RxJS + Signals**

**Uzasadnienie:**

- ✅ **Services z Dependency Injection** - Angular pattern
- ✅ **RxJS** - reaktywne programowanie (ideal dla geolokalizacji real-time)
- ✅ **Signals (Angular 16+)** - nowoczesna reaktywność, lepsza performance
- ✅ **BehaviorSubject** - state management dla złożonych przypadków
- ✅ Brak dodatkowych bibliotek (NgRx nie jest potrzebny dla MVP)

**Architektura State:**

```typescript
// services/grave.service.ts
@Injectable({ providedIn: "root" })
export class GraveService {
  // Signals (Angular 16+)
  graves = signal<Grave[]>([]);
  selectedGrave = signal<Grave | null>(null);
  isLoading = signal(false);

  // RxJS dla async operations
  graves$ = new BehaviorSubject<Grave[]>([]);

  // Computed signals
  gravesCount = computed(() => this.graves().length);

  constructor(private db: IndexedDBService, private http: HttpClient) {}
}
```

**Cache Strategy:**

- Angular HttpClient Interceptor dla offline queue
- Service Worker cache (automatyczne przez @angular/pwa)
- IndexedDB dla persistent state

**Opcjonalnie (dla większych projektów):**

- NgRx (Redux dla Angular) - jeśli aplikacja urośnie
- Akita (prostsze niż NgRx)
- ELF (modułowy state management)

### 3.2 Stack Technologiczny - Backend

#### 3.2.1 Backend Framework

**Wybrany Stack: NestJS + Express + TypeScript**

**Uzasadnienie:**

- ✅ **NestJS** - enterprise framework zbudowany na Express
- ✅ Architektura wzorowana na Angular (Dependency Injection, Decorators)
- ✅ TypeScript first-class citizen
- ✅ Modułowa struktura (Controllers, Services, Modules)
- ✅ Wbudowana walidacja (class-validator, class-transformer)
- ✅ Swagger/OpenAPI out-of-the-box (@nestjs/swagger)
- ✅ Microservices ready (jeśli aplikacja urośnie)
- ✅ WebSockets support (@nestjs/websockets) - dla real-time
- ✅ Ten sam język i podobne wzorce co Angular frontend

**Konfiguracja:**

```typescript
// package.json (backend)
"@nestjs/core": "^10.3.0"
"@nestjs/common": "^10.3.0"
"@nestjs/platform-express": "^10.3.0"
"@nestjs/config": "^3.1.1"
"@nestjs/swagger": "^7.1.17"
"express": "^4.18.2"
"typescript": "^5.3.0"

// Inicjalizacja
npm i -g @nestjs/cli
nest new backend
```

**Struktura NestJS (idealna dla GraveMap):**

```
src/
├── graves/
│   ├── graves.controller.ts
│   ├── graves.service.ts
│   ├── graves.module.ts
│   ├── dto/
│   │   ├── create-grave.dto.ts
│   │   └── update-grave.dto.ts
│   └── entities/
│       └── grave.entity.ts
├── photos/
├── auth/
├── users/
└── common/
```

**Integracja z Supabase:**

```typescript
"@supabase/supabase-js": "^2.38.0"
```

#### 3.2.2 Baza Danych

**Wybrany Stack: Supabase (PostgreSQL + PostGIS)**

**Uzasadnienie:**

- ✅ **PostgreSQL** - najbardziej zaawansowana open-source baza
- ✅ **PostGIS** - rozszerzenie dla danych geoprzestrzennych (wbudowane w Supabase)
- ✅ **Supabase** - Firebase alternative z prawdziwym SQL
- ✅ Real-time subscriptions (WebSockets)
- ✅ Row Level Security (RLS) - bezpieczeństwo na poziomie wiersza
- ✅ Storage dla zdjęć (S3-compatible)
- ✅ Authentication out-of-the-box
- ✅ Auto-generated REST API
- ✅ Darmowy tier: 500MB database, 1GB file storage, 2GB bandwidth
- ✅ Hosted PostgreSQL (nie trzeba zarządzać serwerem)

**Dlaczego Supabase > Firebase:**

- ✅ SQL > NoSQL dla relacyjnych danych (groby, użytkownicy, zdjęcia)
- ✅ PostGIS dla geospatial queries
- ✅ Open-source (można self-host w przyszłości)
- ✅ Migracje SQL (lepsze dla zespołu)
- ✅ Complex queries i JOINy

**Integracja z NestJS:**

```typescript
// Opcja 1: @supabase/supabase-js (bezpośredni klient)
"@supabase/supabase-js": "^2.38.0"

// Opcja 2: TypeORM lub Prisma (ORM)
"@nestjs/typeorm": "^10.0.1"
"typeorm": "^0.3.17"
"pg": "^8.11.3"

// lub Prisma (polecane)
"prisma": "^5.7.0"
"@prisma/client": "^5.7.0"
```

**Schema Przykładowa (PostgreSQL):**

```sql
CREATE EXTENSION postgis;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE graves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy FLOAT,

    -- Informacje o osobie
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    death_date DATE,
    relationship VARCHAR(50),

    -- Informacje o grobie
    cemetery_name VARCHAR(255),
    grave_number VARCHAR(50),
    sector VARCHAR(50),
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_visited TIMESTAMP
);

CREATE INDEX idx_graves_location ON graves USING GIST(location);
CREATE INDEX idx_graves_user_id ON graves(user_id);

CREATE TABLE grave_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grave_id UUID REFERENCES graves(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grave_id UUID REFERENCES graves(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    reminder_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2.3 Storage dla Zdjęć

**Wybrany Stack: Supabase Storage**

**Uzasadnienie:**

- ✅ Wbudowane w Supabase (jedna platforma dla wszystkiego)
- ✅ S3-compatible API
- ✅ Automatyczne CDN (global edge network)
- ✅ Row Level Security dla plików
- ✅ Public i private buckets
- ✅ Integracja z PostgreSQL (metadane w bazie)
- ✅ Darmowy tier: 1GB storage
- ✅ Automatyczne generowanie signed URLs
- ✅ Image transformations (resize, crop) - wbudowane

**Konfiguracja w NestJS:**

```typescript
// services/storage.service.ts
import { createClient } from "@supabase/supabase-js";

@Injectable()
export class StorageService {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  async uploadPhoto(file: Express.Multer.File, graveId: string) {
    const { data, error } = await this.supabase.storage
      .from("grave-photos")
      .upload(`${graveId}/${file.originalname}`, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    return data;
  }

  async getPublicUrl(path: string) {
    const { data } = this.supabase.storage
      .from("grave-photos")
      .getPublicUrl(path);
    return data.publicUrl;
  }
}
```

**Alternatywnie (jeśli Supabase Storage nie wystarcza):**

- Cloudinary (transformacje obrazów on-the-fly)
- AWS S3 (jeśli potrzeba więcej kontroli)

### 3.3 PWA i Offline

#### 3.3.1 Service Worker

**Wybrany Stack: @angular/pwa + @angular/service-worker**

**Uzasadnienie:**

- ✅ Oficjalna biblioteka Angular PWA
- ✅ Automatyczna konfiguracja Service Worker
- ✅ Deklaratywna konfiguracja cache (ngsw-config.json)
- ✅ Update notifications out-of-the-box
- ✅ Offline fallback
- ✅ Precaching i runtime caching

**Instalacja:**

```bash
ng add @angular/pwa
```

**Automatycznie generuje:**

- manifest.webmanifest (PWA manifest)
- ngsw-worker.js (Service Worker)
- ngsw-config.json (konfiguracja cache)
- Icons różnych rozmiarów

**Konfiguracja ngsw-config.json:**

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-graves",
      "urls": ["/api/graves/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1d",
        "timeout": "5s"
      }
    },
    {
      "name": "api-photos",
      "urls": ["https://**.supabase.co/storage/**"],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 50,
        "maxAge": "7d"
      }
    }
  ]
}
```

**Strategia Cache:**

- **App Shell**: Prefetch (instalacja od razu)
- **API Data**: Freshness (network first, cache fallback)
- **Zdjęcia**: Performance (cache first)
- **Mapy**: Performance (cache first, pre-cache popularne obszary)

#### 3.3.2 Offline Storage

**Rekomendacja: IndexedDB przez Dexie.js**

```typescript
"dexie": "^3.2.4"
"dexie-react-hooks": "^1.1.7"
```

**Uzasadnienie:**

- ✅ Większa pojemność niż localStorage (50MB+)
- ✅ Transakcje i indeksy
- ✅ Dexie upraszcza API IndexedDB
- ✅ Reactive hooks dla React

**Schema:**

```typescript
import Dexie, { Table } from "dexie";

interface Grave {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  firstName: string;
  lastName: string;
  photos: string[];
  syncStatus: "synced" | "pending" | "conflict";
}

class GraveMapDB extends Dexie {
  graves!: Table<Grave>;

  constructor() {
    super("GraveMapDB");
    this.version(1).stores({
      graves: "id, lastName, syncStatus, [latitude+longitude]",
    });
  }
}

export const db = new GraveMapDB();
```

### 3.4 Geolokalizacja

#### 3.4.1 HTML5 Geolocation API

```typescript
navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    // Aktualizuj pozycję użytkownika
  },
  (error) => {
    // Obsługa błędów
  },
  {
    enableHighAccuracy: true, // Najwyższa precyzja
    timeout: 10000,
    maximumAge: 0,
  }
);
```

#### 3.4.2 Biblioteki Wspomagające

```typescript
"geolib": "^3.3.4" // Obliczenia odległości, kierunków
```

### 3.5 Optymalizacja Obrazów

**Frontend (Angular):**

```typescript
// Kompresja po stronie klienta przed uploadem
"ng-image-compress": "^1.0.0"
"browser-image-compression": "^2.0.2"

// Lazy loading
// Angular ma wbudowane: loading="lazy" w <img>
```

**Backend (NestJS):**

```typescript
// Przetwarzanie obrazów na serwerze
"sharp": "^0.33.0"
"@nestjs/platform-express": "^10.3.0" // Multer dla uploadów

// W NestJS controller
import * as sharp from 'sharp';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Kompresja i resize
  const compressed = await sharp(file.buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();

  // Thumbnail
  const thumbnail = await sharp(file.buffer)
    .resize(200, 200, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  // Upload do Supabase
  await this.storageService.upload(compressed, thumbnail);
}
```

**Supabase Storage Transformations:**

```typescript
// Supabase ma wbudowane transformacje
const url = supabase.storage
  .from("grave-photos")
  .getPublicUrl("path/to/image.jpg", {
    transform: {
      width: 800,
      height: 600,
      resize: "cover",
      quality: 80,
    },
  });
```

**Strategie:**

- Kompresja do WebP (90% jakości oryginał, 80% thumbnail)
- Resize do max 1920px (oryginał), 200px (thumbnail)
- Lazy loading w Angular (loading="lazy")
- Progressive loading (blur-up)

### 3.6 Testing

#### 3.6.1 Unit Testing (Angular)

```typescript
// Angular ma wbudowane Jasmine + Karma
"jasmine-core": "~5.1.0"
"karma": "~6.4.0"
"karma-jasmine": "~5.1.0"
"karma-chrome-launcher": "~3.2.0"

// Alternatywnie: Jest (szybszy)
"jest": "^29.7.0"
"@types/jest": "^29.5.11"
"jest-preset-angular": "^13.1.4"

// Uruchomienie
ng test
```

**Przykład testu Angular:**

```typescript
// grave.service.spec.ts
describe("GraveService", () => {
  let service: GraveService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GraveService],
    });
    service = TestBed.inject(GraveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it("should fetch graves", () => {
    service.getGraves().subscribe((graves) => {
      expect(graves.length).toBe(2);
    });
  });
});
```

#### 3.6.2 E2E Testing

```typescript
// Angular CLI używa Protractor (deprecated)
// Zamiana na Cypress lub Playwright

// Cypress (polecane dla Angular)
"cypress": "^13.6.2"
"@cypress/schematic": "^2.5.1"

// Instalacja
ng add @cypress/schematic

// Playwright (alternatywa)
"@playwright/test": "^1.40.1"
```

#### 3.6.3 Backend Testing (NestJS)

```typescript
// NestJS używa Jest
"jest": "^29.7.0"
"@nestjs/testing": "^10.3.0"
"supertest": "^6.3.3" // HTTP assertions

// Uruchomienie
npm run test
npm run test:e2e
npm run test:cov
```

**Przykład testu NestJS:**

```typescript
// graves.controller.spec.ts
describe("GravesController", () => {
  let controller: GravesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GravesController],
      providers: [GravesService],
    }).compile();

    controller = module.get<GravesController>(GravesController);
  });

  it("should return all graves", async () => {
    const result = await controller.findAll();
    expect(result).toBeDefined();
  });
});
```

#### 3.6.4 Type Safety

```typescript
// TypeScript (Angular i NestJS)
"typescript": "~5.2.2"

// ESLint (linting)
"@angular-eslint/eslint-plugin": "^17.0.0"
"@typescript-eslint/eslint-plugin": "^6.14.0"

// Prettier (formatting)
"prettier": "^3.1.1"
"eslint-config-prettier": "^9.1.0"
```

---

## 4. Struktura Projektu

### 4.1 Monorepo (Nx Workspace)

```
grave-app/
├── apps/
│   ├── frontend/                          # Angular PWA
│   │   ├── src/
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   ├── backend/                           # NestJS API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── graves/
│   │   │   ├── photos/
│   │   │   ├── auth/
│   │   │   └── common/
│   │   ├── test/
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                            # Ionic Angular (przyszłość)
│
├── libs/
│   ├── shared/
│   │   ├── models/                        # Wspólne modele TypeScript
│   │   │   ├── grave.model.ts
│   │   │   ├── user.model.ts
│   │   │   └── photo.model.ts
│   │   ├── dto/                           # Data Transfer Objects
│   │   ├── interfaces/
│   │   └── constants/
│   │
│   └── ui/                                # Wspólne UI komponenty (opcjonalne)
│
├── tools/
├── nx.json                                # Nx configuration
├── package.json
├── tsconfig.base.json
└── README.md
```

**Inicjalizacja Nx Workspace:**

```bash
# Instalacja Nx
npm install -g nx

# Utworzenie workspace
npx create-nx-workspace@latest grave-app

# Wybrać: Angular + NestJS preset (lub empty i dodać później)

# Dodanie aplikacji Angular
nx g @nx/angular:app frontend --routing --style=scss

# Dodanie aplikacji NestJS
nx g @nx/nest:app backend

# Dodanie biblioteki shared
nx g @nx/js:lib shared/models
```

**Zalety Nx Monorepo:**

- ✅ Wspólne typy TypeScript (DRY principle)
- ✅ Dependency graph visualization
- ✅ Affected commands (tylko zmienione projekty)
- ✅ Cache i distributed task execution
- ✅ Code generators (nx generate)
- ✅ Integrated tooling (linting, testing, building)

**Alternatywa (prostsze podejście bez monorepo):**

```
grave-app/
├── frontend/              # Osobny Angular projekt
└── backend/               # Osobny NestJS projekt
```

### 4.2 Frontend Structure (Angular)

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                          # Singleton services, guards
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts         # HTTP client wrapper
│   │   │   │   ├── auth.service.ts        # Supabase Auth
│   │   │   │   ├── indexeddb.service.ts   # Offline storage
│   │   │   │   ├── geolocation.service.ts # GPS tracking
│   │   │   │   └── sync.service.ts        # Offline sync
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── offline.interceptor.ts
│   │   │   └── core.module.ts
│   │   │
│   │   ├── shared/                        # Shared components, directives, pipes
│   │   │   ├── components/
│   │   │   │   ├── confirm-dialog/
│   │   │   │   ├── image-upload/
│   │   │   │   └── loading-spinner/
│   │   │   ├── directives/
│   │   │   │   └── lazy-load-image.directive.ts
│   │   │   ├── pipes/
│   │   │   │   ├── distance.pipe.ts       # Formatowanie odległości
│   │   │   │   └── date-format.pipe.ts
│   │   │   └── shared.module.ts
│   │   │
│   │   ├── features/                      # Feature modules (lazy loaded)
│   │   │   ├── map/
│   │   │   │   ├── components/
│   │   │   │   │   ├── map-view/
│   │   │   │   │   │   ├── map-view.component.ts
│   │   │   │   │   │   ├── map-view.component.html
│   │   │   │   │   │   ├── map-view.component.scss
│   │   │   │   │   │   └── map-view.component.spec.ts
│   │   │   │   │   ├── grave-marker/
│   │   │   │   │   ├── user-location/
│   │   │   │   │   └── navigation-controls/
│   │   │   │   ├── pages/
│   │   │   │   │   └── map-page/
│   │   │   │   ├── services/
│   │   │   │   │   └── map.service.ts
│   │   │   │   ├── map-routing.module.ts
│   │   │   │   └── map.module.ts
│   │   │   │
│   │   │   ├── graves/
│   │   │   │   ├── components/
│   │   │   │   │   ├── grave-list/
│   │   │   │   │   ├── grave-card/
│   │   │   │   │   ├── grave-form/
│   │   │   │   │   ├── grave-detail/
│   │   │   │   │   └── photo-gallery/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── graves-page/
│   │   │   │   │   ├── grave-detail-page/
│   │   │   │   │   └── add-grave-page/
│   │   │   │   ├── services/
│   │   │   │   │   └── grave.service.ts
│   │   │   │   ├── models/
│   │   │   │   │   └── grave.model.ts
│   │   │   │   ├── graves-routing.module.ts
│   │   │   │   └── graves.module.ts
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── pages/
│   │   │   │   │   └── settings-page/
│   │   │   │   ├── settings-routing.module.ts
│   │   │   │   └── settings.module.ts
│   │   │   │
│   │   │   └── auth/
│   │   │       ├── pages/
│   │   │       │   ├── login-page/
│   │   │       │   └── register-page/
│   │   │       ├── auth-routing.module.ts
│   │   │       └── auth.module.ts
│   │   │
│   │   ├── layout/                        # Layout components
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   ├── sidenav/
│   │   │   └── bottom-nav/
│   │   │
│   │   ├── app-routing.module.ts
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   └── app.module.ts
│   │
│   ├── assets/
│   │   ├── icons/
│   │   ├── images/
│   │   └── i18n/                          # Tłumaczenia
│   │       ├── en.json
│   │       └── pl.json
│   │
│   ├── environments/
│   │   ├── environment.ts                 # Development
│   │   └── environment.prod.ts            # Production
│   │
│   ├── styles/
│   │   ├── _variables.scss
│   │   ├── _mixins.scss
│   │   ├── _theme.scss                    # Angular Material theme
│   │   └── styles.scss                    # Global styles
│   │
│   ├── index.html
│   ├── main.ts
│   ├── polyfills.ts
│   └── manifest.webmanifest               # PWA manifest
│
├── angular.json                           # Angular CLI config
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── package.json
├── ngsw-config.json                       # Service Worker config
└── karma.conf.js                          # Test config
```

**Standalone Components (Angular 17+ - alternative approach):**

```
src/app/
├── components/                            # Wszystkie komponenty jako standalone
│   ├── map/
│   ├── graves/
│   └── shared/
├── services/
├── guards/
├── models/
├── app.routes.ts                          # Routes bez NgModule
└── app.config.ts                          # App configuration
```

---

## 5. User Stories i Priorityzacja

### 5.1 MVP (Minimum Viable Product) - Faza 1

**Sprint 1 (2 tygodnie):**

- [ ] US-001: Jako użytkownik mogę zobaczyć mapę mojej lokalizacji
- [ ] US-002: Jako użytkownik mogę dodać pinezkę grobu z aktualnej lokalizacji
- [ ] US-003: Jako użytkownik mogę dodać podstawowe info (imię, nazwisko, daty)
- [ ] US-004: Jako użytkownik mogę zobaczyć listę moich grobów

**Sprint 2 (2 tygodnie):**

- [ ] US-005: Jako użytkownik mogę dodać zdjęcie do grobu
- [ ] US-006: Jako użytkownik mogę edytować informacje o grobie
- [ ] US-007: Jako użytkownik mogę usunąć grób
- [ ] US-008: Jako użytkownik mogę zobaczyć odległość do grobu

**Sprint 3 (2 tygodnie):**

- [ ] US-009: Jako użytkownik mogę używać aplikacji offline
- [ ] US-010: Jako użytkownik mogę wyszukać grób po nazwisku
- [ ] US-011: Aplikacja działa jako PWA (instalowalna)
- [ ] US-012: Responsywny design (mobile-first)

### 5.2 Faza 2 - Rozszerzenie funkcjonalności

**Sprint 4:**

- [ ] US-013: Nawigacja do grobu w czasie rzeczywistym
- [ ] US-014: Wiele zdjęć w galerii
- [ ] US-015: Notatki i wspomnienia
- [ ] US-016: Filtrowanie i sortowanie grobów

**Sprint 5:**

- [ ] US-017: Uwierzytelnianie użytkowników
- [ ] US-018: Synchronizacja w chmurze
- [ ] US-019: Backup i restore danych
- [ ] US-020: Udostępnianie lokalizacji grobu

### 5.3 Faza 3 - Funkcje zaawansowane

**Sprint 6+:**

- [ ] US-021: Przypomnienia o rocznicach
- [ ] US-022: Współdzielenie z rodziną
- [ ] US-023: Tryb offline z pre-cache map
- [ ] US-024: Statystyki i historia wizyt
- [ ] US-025: Wielojęzyczność
- [ ] US-026: Tryb ciemny

---

## 6. Specyfikacja API (REST)

### 6.1 Endpoints

#### Graves

```
GET    /api/graves              - Lista grobów użytkownika
POST   /api/graves              - Dodaj nowy grób
GET    /api/graves/:id          - Szczegóły grobu
PUT    /api/graves/:id          - Aktualizuj grób
DELETE /api/graves/:id          - Usuń grób
GET    /api/graves/nearby       - Groby w pobliżu (query: lat, lng, radius)
```

#### Photos

```
POST   /api/graves/:id/photos   - Upload zdjęcia
DELETE /api/graves/:id/photos/:photoId - Usuń zdjęcie
PUT    /api/graves/:id/photos/:photoId - Ustaw jako główne
```

#### Sync

```
POST   /api/sync                - Synchronizuj zmiany offline
GET    /api/sync/status         - Status synchronizacji
```

#### User

```
POST   /api/auth/register       - Rejestracja
POST   /api/auth/login          - Logowanie
GET    /api/user/profile        - Profil użytkownika
PUT    /api/user/settings       - Ustawienia
```

### 6.2 Request/Response Examples

**POST /api/graves**

```json
{
  "latitude": 52.2297,
  "longitude": 21.0122,
  "accuracy": 5.2,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "birthDate": "1950-03-15",
  "deathDate": "2020-11-01",
  "relationship": "Dziadek",
  "cemeteryName": "Cmentarz Powązkowski",
  "graveNumber": "A-123",
  "sector": "Sektor 5",
  "notes": "Przy dużym dębie"
}
```

**Response 201:**

```json
{
  "id": "uuid-v4",
  "latitude": 52.2297,
  "longitude": 21.0122,
  "accuracy": 5.2,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "birthDate": "1950-03-15",
  "deathDate": "2020-11-01",
  "relationship": "Dziadek",
  "cemeteryName": "Cmentarz Powązkowski",
  "graveNumber": "A-123",
  "sector": "Sektor 5",
  "notes": "Przy dużym dębie",
  "photos": [],
  "createdAt": "2025-11-06T10:30:00Z",
  "updatedAt": "2025-11-06T10:30:00Z"
}
```

---

## 7. Design System i UX

### 7.1 Kolorystyka

```scss
// Primary colors
$primary: #2e7d32; // Zielony (życie, nadzieja)
$secondary: #424242; // Szary (powaga, spokój)
$accent: #ffb300; // Amber (światło, pamięć)

// Functional colors
$success: #43a047;
$error: #e53935;
$warning: #fb8c00;
$info: #1976d2;

// Neutrals
$background: #fafafa;
$surface: #ffffff;
$text-primary: #212121;
$text-secondary: #757575;
```

### 7.2 Typografia

```scss
// Font family
$font-primary: "Roboto", sans-serif;
$font-secondary: "Lato", sans-serif;

// Font sizes (mobile-first)
$h1: 28px;
$h2: 24px;
$h3: 20px;
$body: 16px;
$small: 14px;
$tiny: 12px;
```

### 7.3 Ikony

- Material Icons lub Lucide Icons
- SVG dla ikon pinezek (custom)
- Rozróżnialne ikony dla różnych typów grobów

### 7.4 Główne Ekrany (Wireframes description)

#### Ekran 1: Mapa (Home)

- **Header**: Logo + Menu hamburger + Search
- **Mapa**: Pełnoekranowa z pinezkami
- **FAB (Floating)**: "Dodaj grób" (GPS pin icon)
- **Bottom Sheet**: Miniaturka grobu po kliknięciu pinezki
- **Controls**: Zoom, Current Location, Compass

#### Ekran 2: Lista Grobów

- **Header**: Tytuł + Search + Filter
- **Lista**: Cards z:
  - Zdjęciem głównym
  - Imieniem i nazwiskiem
  - Cmentarzem
  - Odległością
  - Akcjami (Edytuj, Usuń)
- **Bottom Nav**: Mapa | Lista | Ustawienia

#### Ekran 3: Szczegóły Grobu

- **Hero Image**: Główne zdjęcie
- **Info Card**:
  - Dane osoby
  - Daty
  - Relacja
- **Mapa**: Mini mapa z lokalizacją
- **Galeria**: Carousel zdjęć
- **Actions**: Nawiguj | Edytuj | Udostępnij
- **Notes**: Rozwijalna sekcja

#### Ekran 4: Dodawanie Grobu

- **Step 1**: Wybierz lokalizację (mapa)
- **Step 2**: Dane osoby (formularz)
- **Step 3**: Dodaj zdjęcia
- **Step 4**: Notatki (opcjonalne)
- **Progress Bar**: 1/4, 2/4, 3/4, 4/4

---

## 8. Bezpieczeństwo i Prywatność

### 8.1 Wymagania Bezpieczeństwa

- [ ] HTTPS wszędzie (SSL/TLS)
- [ ] Hashowanie haseł (bcrypt, salt rounds >= 10)
- [ ] JWT tokens (access + refresh)
- [ ] Rate limiting API (express-rate-limit)
- [ ] Input validation (Zod / Yup)
- [ ] XSS protection (Content Security Policy)
- [ ] CSRF tokens

### 8.2 Prywatność Danych

- [ ] RODO compliance
- [ ] Zgoda na przetwarzanie danych osobowych
- [ ] Prawo do usunięcia danych
- [ ] Szyfrowanie danych wrażliwych
- [ ] Anonimizacja logów
- [ ] Polityka prywatności
- [ ] Cookies consent

### 8.3 Przechowywanie Lokalnie

- [ ] IndexedDB (dla danych strukturalnych)
- [ ] Blob storage (dla zdjęć offline)
- [ ] Encrypted storage dla wrażliwych danych

---

## 9. Performance i Optymalizacja

### 9.1 Metryki

**Target:**

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.0s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

### 9.2 Strategie Optymalizacji

#### Frontend

- [ ] Code splitting (React.lazy)
- [ ] Tree shaking (Vite automatycznie)
- [ ] Image lazy loading
- [ ] Virtual scrolling dla długich list (react-window)
- [ ] Debouncing search inputs
- [ ] Memoization (React.memo, useMemo)

#### Backend

- [ ] Database indexing (geospatial)
- [ ] Query optimization
- [ ] Caching (Redis dla popularnych zapytań)
- [ ] CDN dla zdjęć
- [ ] Compression (gzip/brotli)

#### PWA

- [ ] App shell caching
- [ ] Precaching critical assets
- [ ] Background sync
- [ ] Push notifications (opt-in)

### 9.3 Bundle Size Targets

- Initial bundle: < 200KB (gzipped)
- Total app: < 1MB
- Each lazy chunk: < 100KB

---

## 10. Accessibility (A11y)

### 10.1 WCAG 2.1 Level AA Compliance

- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] Color contrast >= 4.5:1
- [ ] Screen reader support
- [ ] Alt text dla obrazów
- [ ] Skip links

### 10.2 Szczególne Wymagania

- [ ] Duże przyciski (min 44x44px) dla seniorów
- [ ] Opcja zwiększenia fontów
- [ ] Wysoki kontrast mode
- [ ] Voice commands (opcjonalnie)

---

## 11. Internacjonalizacja (i18n)

### 11.1 Biblioteka

```typescript
"react-i18next": "^13.5.0"
"i18next": "^23.7.0"
```

### 11.2 Języki (Faza 1)

- Polski (domyślny)
- English

### 11.3 Przyszłe języki

- Niemiecki
- Ukraiński
- Rosyjski

---

## 12. Monitoring i Analytics

### 12.1 Error Tracking

**Rekomendacja: Sentry**

```typescript
"@sentry/react": "^7.85.0"
```

### 12.2 Analytics

**Rekomendacja: Plausible lub Google Analytics 4**

- Anonimowe statystyki użycia
- GDPR compliant
- Event tracking:
  - Dodanie grobu
  - Użycie nawigacji
  - Upload zdjęcia
  - Offline usage

### 12.3 Performance Monitoring

- Lighthouse CI
- Web Vitals reporting
- Real User Monitoring (RUM)

---

## 13. DevOps i Deployment

### 13.1 CI/CD Pipeline

**Rekomendacja: GitHub Actions**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Install deps
      - Run tests
      - Build
      - Deploy to Vercel/Netlify
```

### 13.2 Hosting

**Frontend (PWA):**

- Vercel (rekomendowane)
- Netlify
- Firebase Hosting
- AWS Amplify

**Backend:**

- Railway.app (łatwe, tanie)
- Render.com
- AWS ECS/Fargate
- DigitalOcean App Platform

**Database:**

- Supabase (darmowy tier)
- AWS RDS
- PlanetScale (MySQL)
- Neon (PostgreSQL serverless)

### 13.3 Environments

- **Development**: localhost
- **Staging**: staging.gravemap.app
- **Production**: app.gravemap.app

### 13.4 Backup Strategy

- Daily automated backups
- Point-in-time recovery
- Export user data na żądanie

---

## 14. Roadmap i Timeline

### 14.1 Faza MVP (6 tygodni)

**Tygodnie 1-2:**

- Setup projektu (Vite + React + TypeScript)
- Konfiguracja Leaflet
- Podstawowa mapa z geolokalizacją
- Dodawanie pinezek

**Tygodnie 3-4:**

- Formularz dodawania grobu
- IndexedDB setup
- Upload zdjęć (frontend)
- Lista grobów

**Tygodnie 5-6:**

- PWA configuration
- Offline mode
- Testing i bugfixing
- MVP release

### 14.2 Faza 2 (4 tygodnie)

- Backend API (jeśli potrzebne)
- Synchronizacja w chmurze
- Uwierzytelnianie
- Nawigacja do grobu

### 14.3 Faza 3 (ongoing)

- Przypomnienia
- Współdzielenie
- Statystyki
- Mobile app (React Native)

---

## 15. Zespół i Role

### 15.1 Zalecana Wielkość Zespołu (MVP)

- **1x Frontend Developer** (React/TypeScript)
- **1x Backend Developer** (Node.js/Firebase) - opcjonalne dla MVP
- **1x UI/UX Designer** (part-time)
- **1x QA Tester** (part-time)
- **1x Project Manager/Product Owner**

### 15.2 Umiejętności Kluczowe

- React + TypeScript
- PWA development
- Leaflet / Maps APIs
- IndexedDB
- Service Workers
- Mobile-first design
- RESTful API design (jeśli backend)

### 15.3 Onboarding

- **Dokumentacja**: Ten dokument + README
- **Setup guide**: Krok po kroku instalacja
- **Code style guide**: ESLint + Prettier config
- **Git workflow**: Feature branches + PR reviews
- **Testing requirements**: Min 80% coverage dla critical paths

---

## 16. Ryzyka i Mitigacje

### 16.1 Ryzyka Techniczne

| Ryzyko                      | Prawdopodobieństwo | Wpływ  | Mitigacja                               |
| --------------------------- | ------------------ | ------ | --------------------------------------- |
| Niska dokładność GPS        | Wysokie            | Wysoki | Umożliwić manualne dostrajanie pinezek  |
| Brak internetu na cmentarzu | Wysokie            | Średni | Offline-first architecture + pre-cache  |
| Duży rozmiar zdjęć          | Średnie            | Średni | Kompresja WebP, resize, lazy loading    |
| Problemy z baterią (GPS)    | Średnie            | Średni | Optymalizacja watchPosition, throttling |
| Cross-browser compatibility | Niskie             | Średni | Testing na wielu przeglądarkach         |

### 16.2 Ryzyka Biznesowe

| Ryzyko                     | Prawdopodobieństwo | Wpływ  | Mitigacja                                |
| -------------------------- | ------------------ | ------ | ---------------------------------------- |
| Niska adopcja użytkowników | Średnie            | Wysoki | Beta testing, marketing, prosta UX       |
| Koszty infrastruktury      | Niskie             | Średni | Serverless, pay-as-you-go modele         |
| Problemy prawne (RODO)     | Niskie             | Wysoki | Konsultacja prawna, compliance od startu |
| Konkurencja                | Niskie             | Średni | Unikalne features (precyzja, offline)    |

---

## 17. Koszty Szacunkowe

### 17.1 Infrastruktura (miesięcznie)

**Opcja 1: Minimal (Firebase)**

- Firebase (Spark - darmowy): $0
- Cloudinary (darmowy tier): $0
- Domain: ~$1/miesiąc
- **Total: ~$1/miesiąc** (do 1000 użytkowników)

**Opcja 2: Scalable (AWS/Supabase)**

- Vercel (Hobby): $0
- Supabase (darmowy): $0
- AWS S3 + CloudFront: ~$5-10/miesiąc
- Domain: ~$1/miesiąc
- **Total: ~$6-11/miesiąc** (do 5000 użytkowników)

**Opcja 3: Production (własny backend)**

- VPS (DigitalOcean): $12/miesiąc
- Database (managed): $15/miesiąc
- S3: $5/miesiąc
- Domain: $1/miesiąc
- **Total: ~$33/miesiąc**

### 17.2 Development (one-time)

- Design (UI/UX): 40h x $50 = $2,000
- Frontend MVP: 200h x $60 = $12,000
- Backend MVP: 80h x $60 = $4,800
- Testing & QA: 40h x $40 = $1,600
- **Total MVP: ~$20,400**

### 17.3 Maintenance (miesięcznie)

- Bugfixes: 10h x $60 = $600
- Updates: 5h x $60 = $300
- Monitoring: $50
- **Total: ~$950/miesiąc**

---

## 18. Success Metrics (KPIs)

### 18.1 Metryki Techniczne

- [ ] PWA Lighthouse score > 90
- [ ] Bundle size < 200KB (gzipped)
- [ ] 99.9% uptime
- [ ] < 1% error rate
- [ ] GPS accuracy < 10 metrów (90% przypadków)

### 18.2 Metryki Użytkownika

- [ ] 100 aktywnych użytkowników w miesiąc 1
- [ ] 1000 dodanych grobów w miesiąc 3
- [ ] 70% retention rate (7-day)
- [ ] 4.5+ rating w PWA reviews
- [ ] < 5% bounce rate

### 18.3 Metryki Biznesowe (jeśli monetyzacja)

- [ ] 10% conversion do premium
- [ ] $5 ARPU (Average Revenue Per User)
- [ ] < $10 CAC (Customer Acquisition Cost)

---

## 19. Dokumentacja Dodatkowa

### 19.1 Dla Developerów

- [ ] README.md - Quick start
- [ ] CONTRIBUTING.md - Guidelines
- [ ] API.md - API documentation
- [ ] ARCHITECTURE.md - System design
- [ ] TESTING.md - Testing strategy

### 19.2 Dla Użytkowników

- [ ] User Guide (FAQ)
- [ ] Video tutorials
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Contact/Support

---

## 20. Next Steps - Plan Implementacji

### 20.1 Krok 1: Setup (Tydzień 1)

#### Opcja A: Nx Monorepo (zalecane)

```bash
# 1. Inicjalizacja Nx workspace
npx create-nx-workspace@latest grave-app
# Wybierz: apps [empty]
cd grave-app

# 2. Dodaj Angular frontend
nx g @nx/angular:app frontend --routing --style=scss --standalone=false
# Dodaj PWA support
cd apps/frontend
ng add @angular/pwa
cd ../..

# 3. Dodaj NestJS backend
nx g @nx/nest:app backend

# 4. Dodaj shared library
nx g @nx/js:lib shared-models

# 5. Instalacja zależności Angular
npm install @angular/material @angular/cdk
npm install leaflet @asymmetrik/ngx-leaflet
npm install @types/leaflet
npm install dexie
npm install geolib

# 6. Instalacja zależności NestJS
npm install @nestjs/config @nestjs/swagger
npm install @supabase/supabase-js
npm install class-validator class-transformer
npm install sharp
npm install @nestjs/typeorm typeorm pg
# lub Prisma
npm install prisma @prisma/client

# 7. Dev dependencies
npm install -D @types/node
npm install -D prettier eslint
npm install -D @angular-eslint/eslint-plugin
npm install -D @typescript-eslint/eslint-plugin
```

#### Opcja B: Separate Projects (prostsze)

```bash
# 1. Frontend - Angular
npm install -g @angular/cli
ng new frontend --routing --style=scss --standalone=false
cd frontend

# Dodaj PWA
ng add @angular/pwa

# Dodaj Angular Material
ng add @angular/material

# Dodaj pozostałe zależności
npm install leaflet @asymmetrik/ngx-leaflet @types/leaflet
npm install dexie geolib
npm install @supabase/supabase-js

cd ..

# 2. Backend - NestJS
npm install -g @nestjs/cli
nest new backend
cd backend

# Dodaj zależności
npm install @nestjs/config @nestjs/swagger
npm install @supabase/supabase-js
npm install class-validator class-transformer
npm install sharp multer
npm install @nestjs/platform-express

# Prisma (ORM)
npm install prisma @prisma/client
npx prisma init

cd ..
```

### 20.2 Krok 2: Struktura Projektu

- Utworzenie folderów według struktury w sekcji 4.2
- Konfiguracja TypeScript, ESLint, Prettier
- Setup Git repository
- Inicjalizacja CI/CD

### 20.3 Krok 3: Prototyp (Tydzień 2-3)

#### Frontend (Angular)

```bash
# Generowanie komponentów
ng g module features/map --routing
ng g component features/map/components/map-view
ng g component features/map/components/grave-marker
ng g service features/map/services/map

ng g module features/graves --routing
ng g component features/graves/components/grave-form
ng g component features/graves/components/grave-list
ng g service features/graves/services/grave

ng g service core/services/geolocation
ng g service core/services/indexeddb
```

**Przykład: map-view.component.ts**

```typescript
import { Component, OnInit } from "@angular/core";
import * as L from "leaflet";
import { GeolocationService } from "../../../core/services/geolocation.service";

@Component({
  selector: "app-map-view",
  templateUrl: "./map-view.component.html",
  styleUrls: ["./map-view.component.scss"],
})
export class MapViewComponent implements OnInit {
  map!: L.Map;
  options: L.MapOptions = {
    layers: [
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }),
    ],
    zoom: 15,
    center: L.latLng(52.2297, 21.0122), // Warszawa
  };

  constructor(private geoService: GeolocationService) {}

  ngOnInit() {
    this.geoService.getCurrentPosition().subscribe((pos) => {
      if (this.map) {
        this.map.setView([pos.latitude, pos.longitude], 15);
      }
    });
  }

  onMapReady(map: L.Map) {
    this.map = map;
  }

  addMarker(lat: number, lng: number) {
    L.marker([lat, lng]).addTo(this.map);
  }
}
```

**map-view.component.html**

```html
<div class="map-container">
  <div
    leaflet
    [leafletOptions]="options"
    (leafletMapReady)="onMapReady($event)"
    class="map"
  ></div>
</div>
```

#### Backend (NestJS)

```bash
# Generowanie modułów
nest g module graves
nest g controller graves
nest g service graves

nest g module photos
nest g controller photos
nest g service photos

nest g module auth
nest g service auth
```

**Przykład: graves.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { GravesService } from "./graves.service";
import { CreateGraveDto } from "./dto/create-grave.dto";

@ApiTags("graves")
@Controller("api/graves")
export class GravesController {
  constructor(private readonly gravesService: GravesService) {}

  @Get()
  @ApiOperation({ summary: "Get all graves" })
  async findAll() {
    return this.gravesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: "Create new grave" })
  async create(@Body() createGraveDto: CreateGraveDto) {
    return this.gravesService.create(createGraveDto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.gravesService.findOne(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() updateGraveDto: any) {
    return this.gravesService.update(id, updateGraveDto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.gravesService.remove(id);
  }
}
```

**Prisma Schema (prisma/schema.prisma):**

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [postgis]
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  graves    Grave[]
}

model Grave {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Geolocation - PostGIS
  latitude    Float
  longitude   Float
  accuracy    Float?

  // Person info
  firstName   String
  lastName    String
  birthDate   DateTime?
  deathDate   DateTime?
  relationship String?

  // Location info
  cemeteryName String?
  graveNumber  String?
  sector       String?
  notes        String?

  photos      Photo[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastVisited DateTime?

  @@index([userId])
}

model Photo {
  id         String   @id @default(uuid())
  graveId    String
  grave      Grave    @relation(fields: [graveId], references: [id], onDelete: Cascade)
  photoUrl   String
  thumbnailUrl String?
  isPrimary  Boolean  @default(false)
  uploadedAt DateTime @default(now())

  @@index([graveId])
}
```

**Inicjalizacja Prisma:**

```bash
cd backend
npx prisma init
# Edytuj .env i schema.prisma
npx prisma migrate dev --name init
npx prisma generate
```

### 20.4 Krok 4: MVP Features (Tydzień 4-6)

- IndexedDB integration
- Upload zdjęć
- Lista grobów
- Wyszukiwanie
- PWA configuration

### 20.5 Krok 5: Testing i Launch (Tydzień 6)

- Unit tests
- E2E tests
- Beta testing z użytkownikami
- Bugfixes
- Production deployment

---

## 21. Kontakt i Wsparcie

### 21.1 Dla Zespołu

- **Project Repository**: GitHub/GitLab
- **Communication**: Slack/Discord
- **Project Management**: Jira/Linear/Trello
- **Documentation**: Notion/Confluence

### 21.2 Dla Użytkowników

- **Email**: support@gravemap.app
- **FAQ**: app.gravemap.app/faq
- **Feedback**: Formularz w aplikacji

---

## 22. Podsumowanie i Rekomendacje

### 22.1 Kluczowe Rekomendacje dla Zespołu

#### Stack Technologiczny (Wybrany)

**Frontend:**

1. ✅ **Angular 17+** (Standalone Components)
2. ✅ **Angular Material** - UI components
3. ✅ **Leaflet + @asymmetrik/ngx-leaflet** - mapa
4. ✅ **@angular/pwa** - PWA support
5. ✅ **Dexie.js** - IndexedDB dla offline
6. ✅ **RxJS + Signals** - state management
7. ✅ **TypeScript** - type safety

**Backend:**

1. ✅ **NestJS** - framework (Express pod spodem)
2. ✅ **Supabase** - PostgreSQL + PostGIS + Auth + Storage
3. ✅ **Prisma** - ORM (alternatywa: TypeORM)
4. ✅ **Sharp** - przetwarzanie obrazów
5. ✅ **Swagger** - dokumentacja API (@nestjs/swagger)
6. ✅ **JWT** - authentication
7. ✅ **TypeScript** - type safety

**Infrastruktura:**

1. ✅ **Supabase** - database, auth, storage (darmowy tier)
2. ✅ **Vercel/Netlify** - hosting Angular PWA (darmowy tier)
3. ✅ **Railway/Render** - hosting NestJS (darmowy tier)
4. ✅ **GitHub Actions** - CI/CD

### 22.2 Dlaczego Ten Stack?

✅ **Enterprise-grade**: Angular + NestJS = stabilność i wsparcie  
✅ **Type Safety**: TypeScript wszędzie (frontend + backend + shared models)  
✅ **Podobne wzorce**: Angular i NestJS używają tych samych konceptów (DI, decorators, modules)  
✅ **Offline-first**: @angular/pwa + Service Workers + IndexedDB  
✅ **Skalowalne**: Monorepo Nx + microservices ready (NestJS)  
✅ **Geospatial**: PostGIS w Supabase = najlepsza opcja dla map  
✅ **Tanie**: Supabase darmowy tier + Vercel/Railway free tier  
✅ **Mobile-friendly**: PWA + łatwa migracja do Ionic Angular  
✅ **Zespół**: Jeden stack TypeScript = łatwiejsze onboarding  
✅ **Testowanie**: Jasmine/Jest + Cypress wbudowane

### 22.3 Porównanie z Alternatywami

| Cecha            | Angular + NestJS | React + Express | Vue + Fastify |
| ---------------- | ---------------- | --------------- | ------------- |
| Type Safety      | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐        | ⭐⭐⭐⭐      |
| PWA Support      | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐        | ⭐⭐⭐⭐      |
| Enterprise Ready | ⭐⭐⭐⭐⭐       | ⭐⭐⭐          | ⭐⭐⭐        |
| Learning Curve   | ⭐⭐⭐           | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐      |
| Mobile (Ionic)   | ⭐⭐⭐⭐⭐       | ⭐⭐⭐          | ⭐⭐⭐        |
| Community        | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐      |
| Bundle Size      | ⭐⭐⭐           | ⭐⭐⭐⭐        | ⭐⭐⭐⭐⭐    |

### 22.3 Potencjalne Rozszerzenia

- 🚀 React Native mobile app (iOS/Android)
- 🤖 AI rozpoznawanie nagrobków ze zdjęć
- 🌍 Crowdsourced database cmentarzy
- 👥 Social features (udostępnianie wspomnień)
- 💐 Integracja z kwiaciarniami
- 🕯️ Wirtualne znicze i kwiaty

---

**Dokument przygotowany**: 6 listopada 2025
**Wersja**: 1.0
**Autor**: AI Assistant dla projektu GraveMap
**Status**: Draft - wymaga review zespołu

---

## Licencja i Copyright

© 2025 GraveMap Project. Wszelkie prawa zastrzeżone.
Dokumentacja na użytek wewnętrzny zespołu deweloperskiego.
