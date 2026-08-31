import express from 'express';
import { createServer } from 'node:http';
import { mockCoffeeShops } from './data/mockCoffeeShops.js';
import { mockDrinks } from './data/mockDrinks.js';
import { calculateDistanceMiles, isValidCoordinate } from './utils/geo.js';
import {
  getPlaceDetails,
  getPlacePhotoUrl,
  isGooglePlacesConfigured,
  searchNearbyCafes,
} from './services/googlePlaces.js';
import {
  buildNearbySearchCacheKey,
  getCacheStats,
  getCachedNearbySearch,
  getCachedPlaceDetails,
  setCachedNearbySearch,
  setCachedPlaceDetails,
} from './repositories/placeCache.js';
import { isDatabaseConfigured } from './db/client.js';
import { findCafeById, findCafeByPlaceId, upsertCafe, upsertCafes } from './repositories/cafesRepository.js';
import { attachAppDataToCafes } from './repositories/cafeAppDataRepository.js';
import { findCafeDrinks, findDrinkById, findDrinks, linkCafeDrink } from './repositories/drinksRepository.js';
import { addFavorite, findFavoritesByUserId, removeFavorite } from './repositories/favoritesRepository.js';
import {
  getCachedSearch as getPostgresCachedSearch,
  setCachedSearch as setPostgresCachedSearch,
} from './repositories/postgresPlaceCache.js';
import { createReview, deleteReview, findReviewsByUserId, updateReview } from './repositories/reviewsRepository.js';
import {
  getSupabaseClient,
  requireSupabaseUser,
  resolveSupabaseUser,
} from './middleware/supabaseAuth.js';
import { findAppUserByUsername, updateAppUser } from './repositories/usersRepository.js';
import { UsernameValidationError, validateUsername } from './utils/usernames.js';
import { createRateLimit } from './middleware/rateLimit.js';
import {
  chooseCafeResults,
  persistCafesBestEffort,
  readCacheBestEffort,
  writeCacheBestEffort,
} from './services/cafeResultResilience.js';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173';
const GENERIC_PASSWORD_LOGIN_ERROR = 'Invalid username/email or password.';
const DEFAULT_GOOGLE_SHOP_LIMIT = 12;
const MAX_GOOGLE_SHOP_LIMIT = 30;
const DEFAULT_GOOGLE_NEARBY_SEARCH_PASSES = 3;
const authRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const usernameRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Token');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=()');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

function getMockFilteredShops(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const radius = Number(query.radius || 10);
  const hasLocation = isValidCoordinate(lat) && isValidCoordinate(lng);

  let shops = mockCoffeeShops.map((shop) => ({ ...shop }));

  if (hasLocation) {
    shops = shops
      .map((shop) => ({
        ...shop,
        distance: calculateDistanceMiles(
          { latitude: lat, longitude: lng },
          { latitude: shop.latitude, longitude: shop.longitude }
        ),
      }))
      .filter((shop) => shop.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  return {
    data: shops,
    meta: {
      count: shops.length,
      source: 'mock',
      radius: hasLocation ? radius : null,
    },
  };
}

function shouldUseGooglePlaces(query) {
  return query.source === 'google' || process.env.GOOGLE_PLACES_ENABLED === 'true';
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function getGoogleShopLimit(query) {
  return Math.round(clampNumber(query.limit, DEFAULT_GOOGLE_SHOP_LIMIT, 1, MAX_GOOGLE_SHOP_LIMIT));
}

function getGoogleNearbySearchPasses() {
  return Math.round(clampNumber(
    process.env.GOOGLE_PLACES_NEARBY_SEARCH_PASSES,
    DEFAULT_GOOGLE_NEARBY_SEARCH_PASSES,
    1,
    5
  ));
}

function buildNearbySearchCenters(latitude, longitude, radius, maxSearches) {
  const offsetMiles = Math.max(Math.min(Number(radius) * 0.35, 3), 1);
  const latitudeOffset = offsetMiles / 69;
  const longitudeOffset = offsetMiles / (69 * Math.max(Math.cos(latitude * (Math.PI / 180)), 0.2));
  const centers = [
    { latitude, longitude },
    { latitude: latitude + latitudeOffset, longitude },
    { latitude: latitude - latitudeOffset, longitude },
    { latitude, longitude: longitude + longitudeOffset },
    { latitude, longitude: longitude - longitudeOffset },
  ];

  return centers.slice(0, maxSearches);
}

function dedupeGoogleShops(shops) {
  const seen = new Set();

  return shops.filter((shop) => {
    const key = shop.placeId || shop.id || `${shop.name}-${shop.location}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function searchNearbyCafeCandidates({ latitude, longitude, radius, limit }) {
  const centers = buildNearbySearchCenters(latitude, longitude, radius, getGoogleNearbySearchPasses());
  const candidates = [];

  for (const center of centers) {
    const shops = await searchNearbyCafes({
      latitude: center.latitude,
      longitude: center.longitude,
      radius,
      maxResultCount: 20,
    });
    candidates.push(...shops);

    const acceptedCount = filterGoogleCafeResults(dedupeGoogleShops(candidates)).length;
    if (acceptedCount >= limit) {
      break;
    }
  }

  return dedupeGoogleShops(candidates);
}

function addDistances(shops, latitude, longitude, radius) {
  return shops
    .map((shop) => ({
      ...shop,
      distance: isValidCoordinate(shop.latitude) && isValidCoordinate(shop.longitude)
        ? calculateDistanceMiles(
          { latitude, longitude },
          { latitude: shop.latitude, longitude: shop.longitude }
        )
        : null,
    }))
    .filter((shop) => shop.distance === null || shop.distance <= radius)
    .sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE));
}

async function getGoogleFilteredShops(query) {
  const latitude = Number(query.lat);
  const longitude = Number(query.lng);
  const radius = Number(query.radius || 10);
  const limit = getGoogleShopLimit(query);
  const includeCoffeeDebug = query.debugCoffee === 'true';

  if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
    return {
      status: 400,
      body: {
        error: 'Google Places search requires valid lat and lng query params',
      },
    };
  }

  if (!isGooglePlacesConfigured()) {
    return {
      status: 400,
      body: {
        error: 'GOOGLE_PLACES_API_KEY is not configured on the backend',
      },
    };
  }

  const cacheKey = buildNearbySearchCacheKey({ latitude, longitude, radius, limit });
  const databaseConfigured = isDatabaseConfigured();
  const postgresCacheResult = databaseConfigured
    ? await readCacheBestEffort(() => getPostgresCachedSearch(cacheKey))
    : { value: null, cacheWarning: null };
  const postgresCached = postgresCacheResult.value;

  if (postgresCached) {
    const selection = chooseCafeResults(postgresCached, evaluateGoogleCoffeeFit);
    const sorted = sortGoogleCafeResults(addDistances(selection.cafes, latitude, longitude, radius));
    const limited = sorted.slice(0, limit);

    return {
      status: 200,
      body: {
        data: includeCoffeeDebug ? limited.map(addCoffeeDebugFields) : limited,
        meta: {
          count: limited.length,
          availableCount: sorted.length,
          source: 'postgres_cache',
          cache: 'hit',
          filterFallback: selection.filterFallback,
          radius,
          limit,
          ...(includeCoffeeDebug ? { coffeeDebug: buildCoffeeDebugSummary(postgresCached) } : {}),
        },
      },
    };
  }

  const cached = getCachedNearbySearch(cacheKey);

  if (cached) {
    const selection = chooseCafeResults(cached, evaluateGoogleCoffeeFit);
    const sorted = sortGoogleCafeResults(addDistances(selection.cafes, latitude, longitude, radius));
    const limited = sorted.slice(0, limit);

    return {
      status: 200,
      body: {
        data: includeCoffeeDebug ? limited.map(addCoffeeDebugFields) : limited,
        meta: {
          count: limited.length,
          availableCount: sorted.length,
          source: 'google_places',
          cache: 'hit',
          cacheWarning: postgresCacheResult.cacheWarning,
          filterFallback: selection.filterFallback,
          radius,
          limit,
          ...(includeCoffeeDebug ? { coffeeDebug: buildCoffeeDebugSummary(cached) } : {}),
        },
      },
    };
  }

  const shops = await searchNearbyCafeCandidates({ latitude, longitude, radius, limit });
  const selection = chooseCafeResults(shops, evaluateGoogleCoffeeFit);
  const persistence = await persistCafesBestEffort(selection.cafes, {
    databaseConfigured,
    persist: upsertCafes,
  });
  const returnedShops = persistence.cafes;
  const sorted = sortGoogleCafeResults(addDistances(returnedShops, latitude, longitude, radius));
  const limited = sorted.slice(0, limit);
  setCachedNearbySearch(cacheKey, returnedShops);

  const writeWarning = databaseConfigured
    ? await writeCacheBestEffort(() => setPostgresCachedSearch({
        cacheKey,
        latitude,
        longitude,
        radius,
        response: returnedShops,
      }))
    : null;
  const cacheWarning = persistence.cacheWarning || postgresCacheResult.cacheWarning || writeWarning;

  return {
    status: 200,
    body: {
      data: includeCoffeeDebug ? limited.map(addCoffeeDebugFields) : limited,
      meta: {
        count: limited.length,
        availableCount: sorted.length,
        source: 'google_places',
        cache: 'miss',
        cacheWarning,
        filterFallback: selection.filterFallback,
        radius,
        limit,
        ...(includeCoffeeDebug ? { coffeeDebug: buildCoffeeDebugSummary(shops) } : {}),
      },
    },
  };
}

async function getStoredFilteredShops(query) {
  if (isDatabaseConfigured()) {
    const persistedShops = await upsertCafes(mockCoffeeShops);
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    const radius = Number(query.radius || 10);
    const limit = getGoogleShopLimit(query);
    const hasLocation = isValidCoordinate(lat) && isValidCoordinate(lng);
    const shops = hasLocation ? addDistances(persistedShops, lat, lng, radius) : persistedShops;
    const limited = shops.slice(0, limit);

    return {
      status: 200,
      body: {
        data: limited,
        meta: {
          count: limited.length,
          availableCount: shops.length,
          source: 'postgres_seed',
          radius: hasLocation ? radius : null,
          limit,
        },
      },
    };
  }

  const fallback = getMockFilteredShops(query);
  const limit = getGoogleShopLimit(query);
  const limited = fallback.data.slice(0, limit);

  return {
    status: 200,
    body: {
      data: limited,
      meta: {
        ...fallback.meta,
        count: limited.length,
        availableCount: fallback.data.length,
        limit,
      },
    },
  };
}

async function getFilteredShops(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const hasLocation = isValidCoordinate(lat) && isValidCoordinate(lng);

  if (!shouldUseGooglePlaces(query) || !hasLocation) {
    return getStoredFilteredShops(query);
  }

  try {
    return await getGoogleFilteredShops(query);
  } catch (error) {
    console.error('Google Places search failed; falling back to mock shops.', error);

    const fallback = getMockFilteredShops(query);
    return {
      status: 200,
      body: {
        ...fallback,
        meta: {
          ...fallback.meta,
          source: 'mock',
          fallbackFrom: 'google_places',
          warning: error.message || 'Google Places search failed',
        },
      },
    };
  }
}

function getDrinks(query) {
  const shopId = query.shopId;
  const type = query.type?.toLowerCase();

  let drinks = mockDrinks.map((drink) => ({ ...drink }));

  if (shopId) {
    drinks = drinks.filter((drink) => drink.shopId === shopId);
  }

  if (type) {
    drinks = drinks.filter((drink) => drink.normalizedType.toLowerCase() === type);
  }

  return {
    data: drinks,
    meta: {
      count: drinks.length,
      source: 'mock',
      shopId: shopId || null,
      type: type || null,
    },
  };
}

const VALID_AVAILABILITY_STATUSES = new Set(['available', 'seasonal', 'unavailable', 'unknown']);
const EXCLUDED_GOOGLE_PLACE_TYPES = new Set([
  'fast_food_restaurant',
  'hamburger_restaurant',
  'pizza_restaurant',
  'sandwich_shop',
  'convenience_store',
  'gas_station',
  'parking',
  'bank',
  'bar',
  'pub',
  'wine_bar',
  'brewery',
  'distillery',
  'liquor_store',
]);
const EXPLICIT_EXCLUSION_SCORE = -10;
const ALLOWLIST_SCORE = 8;
const FOOD_FIRST_PENALTY = -4;
const ACCEPTANCE_SCORE = 4;
const PRIMARY_COFFEE_PLACE_TYPES = new Set([
  'coffee_shop',
  'coffee_roastery',
  'coffee_stand',
]);
const FOOD_FIRST_PLACE_TYPES = new Set([
  'bakery',
  'bagel_shop',
  'dessert_shop',
  'donut_shop',
  'cake_shop',
  'ice_cream_shop',
]);
const STRONG_COFFEE_NAME_PATTERNS = [
  /\bcoffee\b/i,
  /\bespresso\b/i,
  /\broasters?\b/i,
  /\broastery\b/i,
  /\bcold brew\b/i,
];
const DRINK_CAFE_NAME_PATTERNS = [
  /\blatte\b/i,
  /\bcappuccino\b/i,
  /\bmatcha\b/i,
];
const WEAK_CAFE_NAME_PATTERNS = [
  /\bcaf[eé]\b/i,
];
const ALLOWED_GOOGLE_PLACE_NAME_PATTERNS = [
  /\bdunkin'?\b/i,
];
const EXCLUDED_GOOGLE_PLACE_NAME_PATTERNS = [
  /\bmcdonald'?s\b/i,
  /\bstarbucks\b/i,
  /\btatte bakery\b/i,
  /\btatte bakery\s*&\s*cafe\b/i,
  /\bpressed cafe\b/i,
  /\bbakey\b/i,
  /\bcafe landwer\b/i,
  /\bpanera bread\b/i,
  /\bmarylou'?s coffee\b/i,
  /\bburger king\b/i,
  /\bwendy'?s\b/i,
  /\btaco bell\b/i,
  /\bkfc\b/i,
  /\bsubway\b/i,
  /\b7-eleven\b/i,
  /\b7 eleven\b/i,
  /\bmason o'?farrell garage\b/i,
  /\bbrew(ing|ery|pub)\b/i,
  /\bbrewing company\b/i,
  /\bbeer\b/i,
  /\btaproom\b/i,
  /\btavern\b/i,
  /\bpub\b/i,
  /\bwine bar\b/i,
  /\bcocktail\b/i,
  /\bdistill(ery|ing)\b/i,
];
const DEPRIORITIZED_GOOGLE_PLACE_NAME_PATTERNS = [
  /\bcoffee bean\b/i,
  /\bla colombe\b/i,
  /\bjoe\s*&?\s*the juice\b/i,
];

function parsePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseDrinkId(value) {
  if (typeof value === 'string' && value.startsWith('postgres-drink-')) {
    return parsePositiveInteger(value.replace('postgres-drink-', ''));
  }

  return parsePositiveInteger(value);
}

function parseCafeId(value) {
  if (typeof value === 'string' && value.startsWith('postgres-cafe-')) {
    return parsePositiveInteger(value.replace('postgres-cafe-', ''));
  }

  return parsePositiveInteger(value);
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function evaluateGoogleCoffeeFit(shop) {
  const name = shop.name || '';
  const googleTypes = shop.types || shop.rawPlace?.types || [];
  const types = new Set(googleTypes);
  const allowedByName = ALLOWED_GOOGLE_PLACE_NAME_PATTERNS.some((pattern) => pattern.test(name));
  const excludedByName = EXCLUDED_GOOGLE_PLACE_NAME_PATTERNS.some((pattern) => pattern.test(name));
  const excludedTypes = [...types].filter((type) => EXCLUDED_GOOGLE_PLACE_TYPES.has(type));
  const primaryCoffeeTypes = [...types].filter((type) => PRIMARY_COFFEE_PLACE_TYPES.has(type));
  const foodFirstTypes = [...types].filter((type) => FOOD_FIRST_PLACE_TYPES.has(type));
  const hasStrongCoffeeName = STRONG_COFFEE_NAME_PATTERNS.some((pattern) => pattern.test(name));
  const hasDrinkCafeName = DRINK_CAFE_NAME_PATTERNS.some((pattern) => pattern.test(name));
  const hasWeakCafeName = WEAK_CAFE_NAME_PATTERNS.some((pattern) => pattern.test(name));
  const reasons = [];
  let score = 0;

  if (excludedByName) {
    score += EXPLICIT_EXCLUSION_SCORE;
    reasons.push('explicitly excluded by name');
  }

  if (excludedTypes.length > 0) {
    score += EXPLICIT_EXCLUSION_SCORE;
    reasons.push(`excluded Google type: ${excludedTypes.join(', ')}`);
  }

  if (allowedByName) {
    score += ALLOWLIST_SCORE;
    reasons.push('allowed coffee chain exception');
  }

  if (primaryCoffeeTypes.length > 0) {
    score += 5;
    reasons.push(`coffee-specific Google type: ${primaryCoffeeTypes.join(', ')}`);
  }

  if (hasStrongCoffeeName) {
    score += 4;
    reasons.push('name includes strong coffee wording');
  }

  if (hasDrinkCafeName) {
    score += 3;
    reasons.push('name includes coffee-shop drink wording');
  }

  if (hasWeakCafeName) {
    score += 2;
    reasons.push('name includes cafe/café');
  }

  if (foodFirstTypes.length > 0) {
    score += FOOD_FIRST_PENALTY;
    reasons.push(`food-first Google type: ${foodFirstTypes.join(', ')}`);
  }

  if (reasons.length === 0) {
    reasons.push('no clear coffee/cafe evidence');
  }

  return {
    accepted: score >= ACCEPTANCE_SCORE && !excludedByName && excludedTypes.length === 0,
    hardRejected: excludedByName || excludedTypes.length > 0,
    score,
    reasons,
    googleTypes,
  };
}

function getCoffeeConfidenceScore(shop) {
  return evaluateGoogleCoffeeFit(shop).score;
}

function filterGoogleCafeResults(shops) {
  return shops.filter((shop) => evaluateGoogleCoffeeFit(shop).accepted);
}

function addCoffeeDebugFields(shop) {
  const evaluation = evaluateGoogleCoffeeFit(shop);

  return {
    ...shop,
    coffeeConfidenceScore: evaluation.score,
    coffeeConfidenceReasons: evaluation.reasons,
    googleTypes: evaluation.googleTypes,
  };
}

function buildCoffeeDebugSummary(shops) {
  return shops.map((shop) => {
    const evaluation = evaluateGoogleCoffeeFit(shop);

    return {
      name: shop.name,
      decision: evaluation.accepted ? 'accepted' : 'rejected',
      coffeeConfidenceScore: evaluation.score,
      coffeeConfidenceReasons: evaluation.reasons,
      googleTypes: evaluation.googleTypes,
    };
  });
}

function getGoogleCafePriority(shop) {
  const name = shop.name || '';
  const isDeprioritized = DEPRIORITIZED_GOOGLE_PLACE_NAME_PATTERNS.some((pattern) => pattern.test(name));

  return isDeprioritized ? 1 : 0;
}

function sortGoogleCafeResults(shops) {
  return [...shops].sort((a, b) => {
    const priorityDelta = getGoogleCafePriority(a) - getGoogleCafePriority(b);
    if (priorityDelta !== 0) return priorityDelta;

    const confidenceDelta = getCoffeeConfidenceScore(b) - getCoffeeConfidenceScore(a);
    if (confidenceDelta !== 0) return confidenceDelta;

    return (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE);
  });
}

function sendUsernameUpdateError(error, res, next) {
  if (error instanceof UsernameValidationError) {
    res.status(error.status || 409).json({ error: error.message });
    return;
  }

  if (error.code === '23505') {
    res.status(409).json({ error: 'That username is already taken.' });
    return;
  }

  next(error);
}

function buildReviewInput(body) {
  const rating = Number(body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return {
      error: 'rating must be an integer between 1 and 5.',
    };
  }

  return {
    value: {
      rating,
      text: body.text?.trim() || null,
      photoUrl: body.photoUrl || null,
    },
  };
}

function requireDatabase(req, res) {
  if (!isDatabaseConfigured()) {
    res.status(503).json({
      error: 'DATABASE_URL is not configured. Cafe-drink links require Postgres.',
    });
    return false;
  }

  return true;
}

function canWriteCafeDrinkLinks(req) {
  const adminToken = process.env.CAFE_DRINK_ADMIN_TOKEN?.trim();

  if (adminToken) {
    return req.get('x-admin-token') === adminToken;
  }

  return process.env.NODE_ENV !== 'production';
}

function buildCafeDrinkInput(body) {
  const drinkId = parseDrinkId(body.drinkId);
  const availabilityStatus = body.availabilityStatus || 'unknown';
  const source = body.source || 'admin';
  const confidence = body.confidence === undefined ? 0.9 : Number(body.confidence);
  const notes = body.notes?.trim() || null;
  const lastVerifiedAt = body.lastVerifiedAt ? new Date(body.lastVerifiedAt) : new Date();

  if (!drinkId) {
    return {
      error: 'drinkId is required and must be an existing numeric Postgres drink id.',
    };
  }

  if (!VALID_AVAILABILITY_STATUSES.has(availabilityStatus)) {
    return {
      error: 'availabilityStatus must be one of: available, seasonal, unavailable, unknown.',
    };
  }

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return {
      error: 'confidence must be a number between 0 and 1.',
    };
  }

  if (Number.isNaN(lastVerifiedAt.getTime())) {
    return {
      error: 'lastVerifiedAt must be a valid date when provided.',
    };
  }

  return {
    value: {
      drinkId,
      availabilityStatus,
      source,
      confidence,
      notes,
      lastVerifiedAt,
    },
  };
}

async function getCafeByNumericId(cafeId, res) {
  const cafe = await findCafeById(cafeId);

  if (!cafe) {
    res.status(404).json({
      error: `Cafe ${cafeId} was not found in Postgres.`,
    });
    return null;
  }

  return cafe;
}

async function getCafeByGooglePlaceId(placeId, res) {
  const cafe = await findCafeByPlaceId(placeId);

  if (!cafe) {
    res.status(404).json({
      error: `Cafe with Google place id ${placeId} was not found in Postgres.`,
    });
    return null;
  }

  return cafe;
}

async function createCafeDrinkLink(cafe, req, res) {
  if (!canWriteCafeDrinkLinks(req)) {
    res.status(403).json({
      error: 'Cafe-drink link writes are admin/dev only.',
    });
    return;
  }

  const input = buildCafeDrinkInput(req.body || {});

  if (input.error) {
    res.status(400).json({ error: input.error });
    return;
  }

  const drink = await findDrinkById(input.value.drinkId);

  if (!drink) {
    res.status(404).json({
      error: `Drink ${input.value.drinkId} was not found in Postgres.`,
    });
    return;
  }

  const linkedDrink = await linkCafeDrink({
    cafeId: cafe.postgresId,
    ...input.value,
  });

  res.status(201).json({
    data: linkedDrink,
    meta: {
      source: 'postgres',
      cafeId: cafe.postgresId,
      placeId: cafe.placeId || null,
    },
  });
}

async function getPostgresDrinks(query) {
  const shopId = query.shopId;
  const type = query.type?.toLowerCase();

  if (shopId?.startsWith('postgres-cafe-')) {
    const cafeId = Number(shopId.replace('postgres-cafe-', ''));
    const cafeDrinks = await findCafeDrinks({ cafeId, type });

    return {
      data: cafeDrinks,
      meta: {
        count: cafeDrinks.length,
        source: 'postgres',
        shopId,
        type: type || null,
      },
    };
  }

  if (shopId?.startsWith('google-')) {
    const placeId = shopId.replace('google-', '');
    const cafe = await findCafeByPlaceId(placeId);
    const cafeDrinks = cafe?.postgresId ? await findCafeDrinks({ cafeId: cafe.postgresId, type }) : [];

    return {
      data: cafeDrinks,
      meta: {
        count: cafeDrinks.length,
        source: 'postgres',
        shopId,
        type: type || null,
      },
    };
  }

  if (shopId) {
    return {
      data: [],
      meta: {
        count: 0,
        source: 'postgres',
        shopId,
        type: type || null,
      },
    };
  }

  const drinks = await findDrinks({ type });

  return {
    data: drinks,
    meta: {
      count: drinks.length,
      source: 'postgres',
      shopId: shopId || null,
      type: type || null,
    },
  };
}

async function getDrinksResponse(query) {
  if (!isDatabaseConfigured()) {
    return getDrinks(query);
  }

  try {
    const postgresDrinks = await getPostgresDrinks(query);

    if (postgresDrinks.data.length > 0 || !query.shopId) {
      return postgresDrinks;
    }
  } catch (error) {
    console.error('Postgres drinks lookup failed; falling back to mock drinks.', error);
  }

  return getDrinks(query);
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'sip-swoon-api',
    framework: 'express',
    dataSource: process.env.GOOGLE_PLACES_ENABLED === 'true' ? 'google_places' : 'mock',
    googlePlacesConfigured: isGooglePlacesConfigured(),
    databaseConfigured: isDatabaseConfigured(),
    cache: getCacheStats(),
  });
});

app.get('/api/shops', async (req, res, next) => {
  try {
    const appUser = await resolveSupabaseUser(req);
    const result = await getFilteredShops(req.query);
    if (Array.isArray(result.body?.data)) {
      result.body.data = await attachAppDataToCafes(result.body.data, appUser);
    }
    res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/signup-profile', requireSupabaseUser, async (req, res, next) => {
  try {
    const username = req.body.username?.trim() || null;
    const appUser = await updateAppUser(req.user.appUserId, {
      username,
    });

    res.status(201).json({
      data: appUser,
    });
  } catch (error) {
    sendUsernameUpdateError(error, res, next);
  }
});

app.post('/api/auth/password-login', authRateLimit, async (req, res, next) => {
  try {
    const client = getSupabaseClient();

    if (!client) {
      res.status(503).json({ error: 'Supabase auth is not configured on the backend.' });
      return;
    }

    const identifier = req.body.identifier?.trim();
    const password = req.body.password;

    if (!identifier || !password) {
      res.status(401).json({ error: GENERIC_PASSWORD_LOGIN_ERROR });
      return;
    }

    let email = identifier.toLowerCase();

    if (!looksLikeEmail(identifier)) {
      if (!isDatabaseConfigured()) {
        res.status(503).json({ error: 'DATABASE_URL is required for username login.' });
        return;
      }

      const appUser = await findAppUserByUsername(identifier);

      if (!appUser?.email) {
        res.status(401).json({ error: GENERIC_PASSWORD_LOGIN_ERROR });
        return;
      }

      email = appUser.email;
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      res.status(401).json({ error: GENERIC_PASSWORD_LOGIN_ERROR });
      return;
    }

    res.json({
      data: {
        session: data.session,
        user: data.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/check-username', usernameRateLimit, async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ error: 'DATABASE_URL is required for username checks.' });
      return;
    }

    const username = req.body.username?.trim();

    try {
      validateUsername(username);
    } catch (error) {
      sendUsernameUpdateError(error, res, next);
      return;
    }

    const existingUser = await findAppUserByUsername(username);

    if (existingUser) {
      res.status(409).json({ error: 'That username is already taken.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/me', requireSupabaseUser, (req, res) => {
  res.json({
    data: req.user,
  });
});

app.patch('/api/me', requireSupabaseUser, async (req, res, next) => {
  try {
    const updatedUser = await updateAppUser(req.user.appUserId, {
      username: req.body.username,
      profilePhotoUrl: req.body.profilePhotoUrl,
      preferences: req.body.preferences,
      questionnaireCompleted: req.body.questionnaireCompleted,
    });

    res.json({
      data: updatedUser,
    });
  } catch (error) {
    sendUsernameUpdateError(error, res, next);
  }
});

app.get('/api/me/reviews', requireSupabaseUser, async (req, res, next) => {
  try {
    const reviews = await findReviewsByUserId(req.user.appUserId);
    res.json({
      data: reviews,
      meta: {
        count: reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/favorites', requireSupabaseUser, async (req, res, next) => {
  try {
    const favorites = await findFavoritesByUserId(req.user.appUserId);
    res.json({
      data: favorites,
      meta: {
        count: favorites.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/me/favorites/:cafeId', requireSupabaseUser, async (req, res, next) => {
  try {
    const cafeId = parseCafeId(req.params.cafeId);

    if (!cafeId) {
      res.status(400).json({ error: 'cafeId must be a positive numeric Postgres cafe id.' });
      return;
    }

    const cafe = await getCafeByNumericId(cafeId, res);
    if (!cafe) return;

    await addFavorite({ appUserId: req.user.appUserId, cafeId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/favorites/:cafeId', requireSupabaseUser, async (req, res, next) => {
  try {
    const cafeId = parseCafeId(req.params.cafeId);

    if (!cafeId) {
      res.status(400).json({ error: 'cafeId must be a positive numeric Postgres cafe id.' });
      return;
    }

    await removeFavorite({ appUserId: req.user.appUserId, cafeId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/cafes/:cafeId/reviews', requireSupabaseUser, async (req, res, next) => {
  try {
    const cafeId = parseCafeId(req.params.cafeId);

    if (!cafeId) {
      res.status(400).json({ error: 'cafeId must be a positive numeric Postgres cafe id.' });
      return;
    }

    const cafe = await getCafeByNumericId(cafeId, res);
    if (!cafe) return;

    const input = buildReviewInput(req.body || {});

    if (input.error) {
      res.status(400).json({ error: input.error });
      return;
    }

    const review = await createReview({
      cafeId,
      appUserId: req.user.appUserId,
      ...input.value,
    });

    res.status(201).json({ data: review });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/reviews/:reviewId', requireSupabaseUser, async (req, res, next) => {
  try {
    const reviewId = parsePositiveInteger(req.params.reviewId);

    if (!reviewId) {
      res.status(400).json({ error: 'reviewId must be a positive numeric id.' });
      return;
    }

    const input = buildReviewInput(req.body || {});

    if (input.error) {
      res.status(400).json({ error: input.error });
      return;
    }

    const review = await updateReview({
      reviewId,
      appUserId: req.user.appUserId,
      ...input.value,
    });

    if (!review) {
      res.status(404).json({ error: 'Review not found for the current user.' });
      return;
    }

    res.json({ data: review });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/reviews/:reviewId', requireSupabaseUser, async (req, res, next) => {
  try {
    const reviewId = parsePositiveInteger(req.params.reviewId);

    if (!reviewId) {
      res.status(400).json({ error: 'reviewId must be a positive numeric id.' });
      return;
    }

    const deleted = await deleteReview({
      reviewId,
      appUserId: req.user.appUserId,
    });

    if (!deleted) {
      res.status(404).json({ error: 'Review not found for the current user.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/places/photos/:photoName', async (req, res, next) => {
  try {
    const { photoName } = req.params;
    const photoResponse = await fetch(getPlacePhotoUrl(decodeURIComponent(photoName)));

    if (!photoResponse.ok) {
      res.sendStatus(photoResponse.status);
      return;
    }

    const contentType = photoResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const buffer = Buffer.from(await photoResponse.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

app.get('/api/places/:placeId', async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const cached = getCachedPlaceDetails(placeId);

    if (cached) {
      res.json({
        data: cached,
        meta: {
          source: 'google_places',
          cache: 'hit',
        },
      });
      return;
    }

    const details = await getPlaceDetails(placeId);
    if (isDatabaseConfigured()) {
      await upsertCafe(details, { detailsFetched: true });
    }
    setCachedPlaceDetails(placeId, details);

    res.json({
      data: details,
      meta: {
        source: 'google_places',
        cache: 'miss',
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/cafes/by-place/:placeId/drinks', async (req, res, next) => {
  try {
    if (!requireDatabase(req, res)) return;

    const cafe = await getCafeByGooglePlaceId(req.params.placeId, res);
    if (!cafe) return;

    const cafeDrinks = await findCafeDrinks({
      cafeId: cafe.postgresId,
      type: req.query.type,
    });

    res.json({
      data: cafeDrinks,
      meta: {
        count: cafeDrinks.length,
        source: 'postgres',
        cafeId: cafe.postgresId,
        placeId: cafe.placeId,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/cafes/by-place/:placeId/drinks', requireSupabaseUser, async (req, res, next) => {
  try {
    if (!requireDatabase(req, res)) return;

    const cafe = await getCafeByGooglePlaceId(req.params.placeId, res);
    if (!cafe) return;

    await createCafeDrinkLink(cafe, req, res);
  } catch (error) {
    next(error);
  }
});

app.get('/api/cafes/:cafeId/drinks', async (req, res, next) => {
  try {
    if (!requireDatabase(req, res)) return;

    const cafeId = parsePositiveInteger(req.params.cafeId);

    if (!cafeId) {
      res.status(400).json({
        error: 'cafeId must be a positive numeric Postgres cafe id.',
      });
      return;
    }

    const cafe = await getCafeByNumericId(cafeId, res);
    if (!cafe) return;

    const cafeDrinks = await findCafeDrinks({
      cafeId,
      type: req.query.type,
    });

    res.json({
      data: cafeDrinks,
      meta: {
        count: cafeDrinks.length,
        source: 'postgres',
        cafeId,
        placeId: cafe.placeId || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/cafes/:cafeId/drinks', requireSupabaseUser, async (req, res, next) => {
  try {
    if (!requireDatabase(req, res)) return;

    const cafeId = parsePositiveInteger(req.params.cafeId);

    if (!cafeId) {
      res.status(400).json({
        error: 'cafeId must be a positive numeric Postgres cafe id.',
      });
      return;
    }

    const cafe = await getCafeByNumericId(cafeId, res);
    if (!cafe) return;

    await createCafeDrinkLink(cafe, req, res);
  } catch (error) {
    next(error);
  }
});

app.get('/api/drinks', async (req, res, next) => {
  try {
    res.json(await getDrinksResponse(req.query));
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: [
      '/api/health',
      '/api/shops',
      '/api/auth/signup-profile',
      '/api/auth/password-login',
      '/api/auth/check-username',
      '/api/me',
      '/api/me/reviews',
      '/api/me/favorites',
      '/api/places/:placeId',
      '/api/cafes/:cafeId/reviews',
      '/api/cafes/:cafeId/drinks',
      '/api/cafes/by-place/:placeId/drinks',
      '/api/reviews/:reviewId',
      '/api/drinks',
    ],
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: 'Unexpected server error',
  });
});

const server = createServer(app);

await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
  server.listen(PORT, HOST);
});
server.ref();

console.log(`Sip & Swoon API listening on http://${HOST}:${PORT}`);

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Sip & Swoon API stopped');
  });
});
