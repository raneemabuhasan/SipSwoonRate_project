# Coffee Rating App

A React + Express coffee rating app. Supabase Auth handles identity, while the local backend and Postgres own cafes, reviews, favorites, profiles, preferences, and drink data.

## Features

- Sign up/sign in with Supabase email auth or Google OAuth
- Browse backend cafes from seeded data or Google Places
- Rate cafes and write reviews tied directly to backend cafe IDs
- Save favorite cafes
- Edit and delete your own reviews
- Store profile details and preference questionnaire answers in Postgres
- Search, filter, sort, and view cafes on a map

## Prerequisites

- Node.js v20 or higher
- npm
- Postgres connection string
- Supabase project with Auth enabled

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env`:
   ```bash
   DATABASE_URL=postgres://...
   DATABASE_SSL=true
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
   CLIENT_ORIGIN=http://127.0.0.1:5173
   ```

   For local application traffic, use the Supabase **Session pooler** connection string on port `5432` for `DATABASE_URL`. Copy the exact value from the project dashboard's **Connect** panel. The direct `db.<project-ref>.supabase.co` URL requires working IPv6 and can be unreliable on IPv4-only networks.

   `SUPABASE_SERVICE_ROLE_KEY` is used only by the Express backend to create the app profile row after signup, so username login works right after email confirmation. Never prefix it with `VITE_` or expose it in frontend code.

3. Apply the Postgres schema:
   ```bash
   npm run db:migrate
   ```

4. Start the backend:
   ```bash
   npm run server
   ```

5. Start the frontend:
   ```bash
   npm run dev
   ```

6. Open `http://127.0.0.1:5173`.

## Supabase Google Sign-In

Enable Google in the Supabase Auth providers dashboard and add the local redirect URL:

```txt
http://127.0.0.1:5173
```

Also add your deployed site URL later before production launch.

## Available Scripts

- `npm run dev` - Start the Vite frontend
- `npm run server` - Start the Express API
- `npm run db:migrate` - Apply Postgres schema changes
- `npm run db:verify-security` - Verify RLS and client-role grants
- `npm run db:verify-data-api` - Verify the publishable key cannot read server-only tables
- `npm run db:seed` - Seed backend cafe/drink data
- `npm test` - Run automated tests
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technologies

- React
- Vite
- Express
- Postgres
- Supabase Auth
- Google Places API, optional

## Database Security

Application tables are server-only. Browser clients use Supabase Auth, while the Express API accesses PostgreSQL through `DATABASE_URL`. The schema enables RLS and revokes direct Data API access for `anon` and `authenticated`.

After each production migration, run `npm run db:verify-security` and `npm run db:verify-data-api`. See `SECURITY_REMEDIATION_CHECKLIST.md` for the complete remediation and credential-rotation checklist.

Nearby Google Places results do not depend on a successful database cache write. If PostgreSQL is temporarily unavailable, the API returns live results and reports a cache warning while preserving RLS and direct Data API restrictions.
