# GraveMap Backend

NestJS-based REST API powering the GraveMap application. This service exposes endpoints for managing graves, health monitoring, and future integrations with Supabase for persistence and media storage.

## Features

- ⚙️ NestJS 10 with modular architecture (`GravesModule`, shared utilities)
- 🔐 Environment management via `@nestjs/config` with Joi validation
- ✅ Global validation pipe with request sanitisation and implicit conversion
- 📚 Swagger UI exposed at `/api/docs`
- 🪦 Graves API aligned with project requirements (CRUD + nearby search)
- 🧪 Jest unit and e2e testing scaffolding

## Getting Started

```powershell
cd backend
npm install
npm run start:dev
```

The API will be available at `http://localhost:3000/api`. Swagger documentation is accessible at `http://localhost:3000/api/docs`.

### Useful Scripts

| Script | Description |
| --- | --- |
| `npm run start` | Start the application in production mode |
| `npm run start:dev` | Start with file watching (development) |
| `npm run build` | Compile TypeScript sources into `dist/` |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Watch and rerun unit tests |
| `npm run test:e2e` | Run end-to-end tests (uses `test/jest-e2e.json`) |
| `npm run lint` | Lint the project with ESLint |
| `npm run format` | Format sources with Prettier |

## Environment Variables

Copy `.env.example` to `.env` (or `.env.local`) and adjust:

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (defaults to 3000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key for Supabase integrations |
| `SUPABASE_PUBLIC_KEY` | Public anon key for client interactions |
| `DATABASE_URL` | PostgreSQL connection string (will leverage PostGIS in later phases) |

> All variables are validated at boot time. Missing or malformed values will stop the application.

### Database Setup

1. **Create Supabase Project**: Go to https://supabase.com and create a new project
2. **Run Migration**: In your Supabase SQL Editor, execute the migration script:
   ```sql
   -- Copy contents from: database/migrations/001_initial_schema.sql
   ```
3. **Get Credentials**: 
   - Project URL: Settings → API → Project URL
   - Service Key: Settings → API → service_role key (secret)
4. **Update .env**:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

## Project Structure

```
backend/
├── src/
│   ├── app.controller.ts        # Health check endpoint
│   ├── app.module.ts            # Root module wiring config + graves module
│   ├── app.service.ts           # Health service exposing runtime metadata
│   ├── config/                  # Configuration loaders and Joi schemas
│   ├── common/dto/              # Shared DTO building blocks
│   └── graves/                  # Graves domain module
│       ├── dto/                 # Create/Update/Response DTOs
│       ├── entities/            # Domain entities and enums
│       ├── graves.controller.ts # REST endpoints
│       └── graves.service.ts    # In-memory implementation (placeholder)
├── test/                        # E2E tests and Jest config
└── ...                          # Tooling (tsconfig, jest, eslint, etc.)
```

## Next Steps

- Integrate Supabase (PostgreSQL + storage) via Prisma ORM
- Add authentication module leveraging Supabase auth
- Replace in-memory graves repository with persistent data access layer
- Extend photo handling with upload endpoints and storage service

For additional functional and UX requirements, refer to `PROJECT_DOCUMENTATION.md` at the repository root.
