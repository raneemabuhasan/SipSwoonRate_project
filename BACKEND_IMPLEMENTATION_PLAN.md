# Backend Implementation Plan

This plan maps the proposed backend/data pipeline diagram onto the current Sip & Swoon app.

## Goal

Add a backend layer that can collect coffee shop and menu data from external sources, normalize it, store it, and expose it to the React app through an API.

## Current App

The app is currently a Vite/React frontend with InstantDB for auth, users, coffee shops, reviews, profiles, recommendations, and live data.

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
   - Long-term target: Postgres + PostGIS for location/radius queries
   - Beginner-friendly transition: keep InstantDB for auth/reviews while adding Postgres for imported shop/menu/location data

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
   - `SearchBar.jsx` can filter by location, type, rating, or drink
   - `RecommendedSection.jsx` and `recommendationEngine.js` can use richer shop/menu data

7. Scheduled refresh
   - Periodically refresh stale shops and menu data
   - Avoid duplicate shops using source IDs such as `google_place_id`

## Implementation Phases

### Phase 1: Backend Foundation

- Add a `/server` folder or a separate backend project
- Create a small Node/Express API
- Add `.env` for API keys
- Add `/api/health`
- Confirm the React app can call the backend locally

### Phase 2: Google Places Integration

- Add Google Places API key
- Search nearby coffee shops by latitude/longitude
- Normalize returned shop objects
- Display those shops in the current list/map UI

### Phase 3: Database

- Add Postgres/PostGIS
- Store imported shops
- Add location/radius queries
- Prevent duplicates by source ID

### Phase 4: Frontend Integration

- Update map/list data loading
- Combine imported shop data with existing reviews
- Keep auth/profile/review behavior working

### Phase 5: Menu and Drink Data

- Add `menu_items`
- Normalize drink names, sizes, temperatures, and prices
- Add drink filters to the app

### Phase 6: Crowdsourcing

- Let users suggest edits
- Store edit suggestions
- Add admin approval later

### Phase 7: Scheduled Refresh

- Add cron/scheduled jobs
- Refresh stale source data
- Track source and confidence score

## Best First Step

Start with a small backend API plus Google Places nearby coffee shop search. This gives the app real external data without rebuilding the whole system at once.

## Current Starting Point

We are beginning with the cheapest path:

- No new paid services
- No external API keys
- No database hosting yet
- A local Express backend
- Mock coffee shop data shaped like the current frontend expects
- Vite proxies `/api` requests to the local backend during development

Initial local endpoints:

- `GET /api/health`
- `GET /api/shops`
- `GET /api/shops?lat=37.7749&lng=-122.4194&radius=10`
- `GET /api/drinks`
- `GET /api/drinks?shopId=seed-philz-mission`

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

- `src/utils/backendApi.js`

Completed frontend bridge:

- Added a development-only API Preview panel that reads `/api/health` and `/api/shops`
- Added a development-only data-source toggle so the existing list/map can render backend shop data
- Backend-sourced shops are read-only for now, so favorites/reviews are not mixed with InstantDB records yet

Completed mock menu/drink endpoint:

- Added local mock menu items with normalized drink fields
- Added `GET /api/drinks`
- Added `GET /api/drinks?shopId=...`
- Updated the development API Preview panel to show mock menu items per backend shop

The next milestone is to decide whether drink data should first appear as a preview-only section or become part of the main coffee shop cards when using backend data.
