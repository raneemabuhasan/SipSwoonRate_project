# Backend Implementation Plan

This plan maps the backend/data pipeline onto the current Sip & Swoon app.

## Goal

Use a backend layer to collect coffee shop and menu data from trusted sources, normalize it, store it, and expose it to the React app through an API.

## Current App

The app is currently a Vite/React frontend backed by a local Express API. Supabase handles authentication, user sessions, and user identity. The backend owns cafe, drink, review, favorite, and profile-related API behavior, with repository helpers for Postgres/Supabase database access when configured. Google Places can be enabled from the backend for real cafe discovery.

## Proposed Architecture

1. Data sources
   - Google Places for coffee shop names, addresses, and coordinates
   - Yelp Fusion for extra business coverage and ratings
   - Cafe websites or menu pages for drink/menu information
   - Crowdsourced user edits for missing or outdated data

2. Ingestion and extraction
   - Backend jobs fetch raw source data
   - Menu text can later be parsed into structured drink items

3. Normalization and taxonomy
   - Convert messy data into consistent fields
   - Example fields: drink type, size, temperature, price, source, confidence

4. Database
   - Current target: Postgres through Supabase for app users, cafes, drinks, reviews, favorites, and Google Places cache data
   - Longer-term target: PostGIS-backed location/radius queries for stronger nearby search behavior

5. Query API
   - React calls backend endpoints instead of directly calling external APIs
   - Example endpoints:
     - `GET /api/health`
     - `GET /api/shops?lat=...&lng=...&radius=...`
     - `GET /api/drinks?shopId=...`
     - `POST /api/crowdsource/edit`

6. Frontend integration
   - `CoffeeShopMap.jsx` can load shops from the backend
   - `CoffeeList.jsx` can show backend shop data plus app reviews
   - `SearchBar.jsx` filters the currently loaded cafe list by text and minimum rating
   - `RecommendedSection.jsx` and `recommendationEngine.js` can use richer shop/menu data

7. Scheduled refresh
   - Periodically refresh stale shops and menu data
   - Avoid duplicate shops using source IDs such as `google_place_id`

## Implementation Phases

### Phase 1: Backend Foundation

- [x] Add a `/server` folder or a separate backend project
- [x] Create a small Node/Express API
- [x] Add `.env` for API keys
- [x] Add `/api/health`
- [x] Confirm the React app can call the backend locally

### Phase 2: Google Places Integration

- [x] Add backend-only Google Places client and environment flag
- [x] Search nearby cafes by latitude/longitude through Google Places when explicitly enabled
- [x] Cache nearby Google Places searches in memory and in Postgres when `DATABASE_URL` is configured
- [x] Add a lazy Place Details endpoint for richer cafe metadata only when a user opens a cafe
- [x] Keep Google Places fields limited to cafe metadata: name, location, rating, photos, hours, website, phone
- [x] Add local mock nearby coffee shop search by latitude/longitude
- [x] Normalize local mock shop objects for the frontend
- [x] Display backend/mock shops in the current list/map UI during development
- [x] Persist cached Google Places results in PostgreSQL when database configuration is available

### Phase 3: Database

- [x] Draft Postgres schema for cafes, drinks, cafe_drinks, and place_search_cache
- [x] Add `pg` client dependency
- [x] Add `DATABASE_URL` and SSL env placeholders
- [x] Add migration and seed scripts
- [x] Add repository functions for cafes, drinks, cafe-drink links, and Google Places search cache
- [x] Add Postgres runtime connection
- [ ] Add PostGIS runtime location queries
- [x] Store imported Google Places cafes by `place_id` when `DATABASE_URL` is configured
- [ ] Add PostGIS-backed location/radius queries
- [x] Prevent imported cafe duplicates by `place_id`

### Phase 4: Frontend Integration

- [x] Update map/list data loading to use backend cafe data
- [x] Attach backend reviews and favorites to cafes through authenticated API requests
- [x] Keep Supabase auth/profile/review behavior working with backend-sourced cafes

### Phase 5: Menu and Drink Data

- [x] Add local mock drink/menu data
- [x] Normalize mock drink names, sizes, temperatures, and prices
- [x] Add `GET /api/drinks`
- [x] Add `GET /api/drinks?shopId=...`
- [x] Add `GET /api/cafes/:cafeId/drinks`
- [x] Add `POST /api/cafes/:cafeId/drinks`
- [x] Add `GET /api/cafes/by-place/:placeId/drinks`
- [x] Add `POST /api/cafes/by-place/:placeId/drinks`
- [x] Use backend drink/shop data in the homepage "What's brewing?" suggestion feature
- [ ] Add persistent `menu_items`
- [ ] Add drink filters to the main browse UI

### Phase 6: Crowdsourcing

- [ ] Let users suggest edits
- [ ] Store edit suggestions
- [ ] Add admin approval later

### Phase 7: Scheduled Refresh

- [ ] Add cron/scheduled jobs
- [ ] Refresh stale source data
- [ ] Track source and confidence score

## Current Focus

The app now has the small backend API, Supabase auth flow, Postgres repository layer, and Google Places integration in place. Current work is focused on improving Google Places cafe quality, location-aware browse behavior, review/favorite UX, and future drink/menu browsing.

## Current Implementation Snapshot

The current implementation keeps development cost low while allowing real backend data:

- [x] No new paid services
- [x] External API keys stay backend-only and are configured through `.env`
- [x] Supabase/Postgres can be used when `DATABASE_URL` and Supabase keys are configured
- [x] A local Express backend
- [x] Mock coffee shop data shaped like the current frontend expects
- [x] Vite proxies `/api` requests to the local backend during development
- [x] Add private `.env` and safe `.env.example` template

Implemented local endpoints include:

- [x] `GET /api/health`
- [x] `GET /api/shops`
- [x] `GET /api/shops?lat=37.7749&lng=-122.4194&radius=10`
- [x] `GET /api/shops?lat=37.7749&lng=-122.4194&radius=10&source=google`
- [x] `GET /api/places/:placeId`
- [x] `GET /api/drinks`
- [x] `GET /api/drinks?shopId=seed-philz-mission`
- [x] `POST /api/auth/signup-profile`
- [x] `POST /api/auth/password-login`
- [x] `GET /api/me`
- [x] `PATCH /api/me`
- [x] Review and favorite endpoints for authenticated users

Cost guardrails for Google Places:

- Keep all Google calls on the backend so the API key is never exposed to React
- Keep mock data available as a fallback; use Google Places when `GOOGLE_PLACES_ENABLED=true` or `source=google` is requested
- Use a small nearby-search field mask and avoid `*` field masks
- Cache nearby searches by rounded latitude/longitude/radius
- Fetch Place Details lazily only when a user opens a cafe
- Never use Google Places as the menu source; drink availability belongs in `drinks` and `cafe_drinks`

Postgres setup commands:

- [x] `npm run db:migrate`
- [x] `npm run db:seed`
- [x] Add the Supabase `DATABASE_URL` to `.env`
- [x] Run migrations and seed data against Supabase

Seed data boundaries:

- `server/data/seedCafes.js` is the starter backend/Postgres cafe catalog.
- `server/data/mockCoffeeShops.js` derives from `server/data/seedCafes.js` for cheap local backend responses.
- `src/utils/seedCoffeeShops.js` has been removed; seed cafe data now lives on the backend side.
- Future official cafe data should enter Postgres through Google Places imports, admin tools, or approved suggestions.

Run the frontend and backend separately:

```bash
npm run dev
npm run server
```

In development, the React app can call relative API paths:

- `/api/health`
- `/api/shops`
- `/api/drinks`

Vite forwards those calls to `http://127.0.0.1:8787`.

Frontend helper added:

- [x] `src/utils/backendApi.js`

Completed frontend bridge:

- [x] Added a development-only API Preview panel that reads `/api/health` and `/api/shops`
- [x] Updated the browse list/map to render backend shop data
- [x] Backend-sourced shops support app reviews and favorites through the backend/Supabase auth flow

Completed mock menu/drink endpoint:

- [x] Added local mock menu items with normalized drink fields
- [x] Added `GET /api/drinks`
- [x] Added `GET /api/drinks?shopId=...`
- [x] Updated the development API Preview panel to show mock menu items per backend shop

New homepage experiment:

- [x] Added a homepage "What's brewing?" generator that uses backend shop/drink data to suggest a cafe or drink

The next milestone is to decide whether drink data should become part of the main coffee shop cards when using backend data, or first appear as a dedicated browse-page drink filter.
