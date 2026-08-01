# Supabase setup for grave-app

This folder contains the database migration and the manual steps needed in the
Supabase Dashboard so the Angular frontend can talk directly to Supabase using
JWTs minted by **our SSO** (`SSO/backend`) instead of Supabase Auth.

## 1. Apply the migration

Two options:

### A. Supabase Dashboard SQL Editor (fastest, no CLI)

1. Open the Supabase Dashboard → your project → **SQL Editor** → **New query**.
2. Copy the entire contents of `migrations/20260511120000_sso_integration.sql`
   and paste it in.
3. Click **Run**. The script is idempotent — re-running it is safe.
4. Verify in **Table Editor** that:
   - `public.graves` has columns `owner_id text`, `last_visited`, `client_updated_at`, `deleted_at`
   - `public.grave_photos` exists
   - `public.users` is gone
5. Verify in **Storage** that the bucket `grave-photos` exists and is **private**.

### B. Supabase CLI (if installed)

```bash
cd grave-app
supabase link --project-ref scchquywdstchfjpxbhm
supabase db push
```

## 2. Configure Third-Party Auth (SSO → Supabase trust)

This is the step that makes Supabase accept tokens signed by our SSO.

1. Open Dashboard → **Authentication** → **Sign In / Up** → **Third Party Auth**
   (sometimes labelled "External JWT" or "Custom JWT").
2. Click **Add provider** → **Custom**.
3. Fill in:
   - **JWKS URL**: `https://<your-sso-host>/.well-known/jwks.json`
     (in dev with the SSO running locally on port 3001:
     `http://localhost:3001/.well-known/jwks.json` — but Supabase needs HTTPS,
     so for local-only testing tunnel it through `ngrok http 3001`)
   - **Issuer**: must match the `JWT_ISSUER` env var in your SSO backend.
     If it's blank in SSO, set it now (e.g. `https://sso.kubitk.eu`) so both
     sides agree. Without an issuer the integration can't disambiguate
     between multiple providers.
   - **Algorithm**: RS256 (auto-detected from JWKS).
4. Save. Supabase now caches the JWKS and will verify any
   `Authorization: Bearer <SSO JWT>` against it.

### Verify it works

Open the SQL Editor and run, replacing `<token>` with a fresh SSO access token:

```sql
select auth.jwt();
```

You should see your SSO claims (`userId`, `email`, `apps`, …). If you see
`{"role":"anon"}` instead, the JWT wasn't accepted — most likely cause is
issuer mismatch.

## 3. Register the app in SSO

In the SSO database, insert a row in `apps`:

| name        | display_name | domain                          |
|-------------|--------------|---------------------------------|
| `grave-app` | Grave App    | `https://<grave-app-host>`      |

For local dev `domain` is ignored (SSO whitelists `localhost` in non-prod).

## 4. CORS

Supabase needs your frontend origin in the allowed list. Dashboard →
**Project Settings** → **API** → **CORS allowed origins**:

```
http://localhost:4200
https://<grave-app-prod-host>
```

## 5. Smoke test (curl-style)

After steps 1–4, with an access token from SSO:

```bash
curl -H "apikey: <SUPABASE_ANON_KEY>" \
     -H "Authorization: Bearer <SSO_ACCESS_TOKEN>" \
     "https://scchquywdstchfjpxbhm.supabase.co/rest/v1/graves?select=id"
```

Expected: `[]` (empty array, RLS lets you through but you own no rows yet).
Anything else means RLS or auth is misconfigured.

## What you should NEVER do

- **Never put `SUPABASE_SERVICE_KEY` in the frontend** — it bypasses RLS.
  The frontend uses only the **anon key** (publishable, safe to ship).
- **Never disable RLS on a public-schema table** — the Data API would expose
  every row to every anonymous visitor.
- **Don't commit `.env`** — it's gitignored, but double-check before pushing.
