const DEFAULT_SEARCH_TTL_MS = 1000 * 60 * 60 * 24;
const DEFAULT_DETAILS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const searchCache = new Map();
const detailsCache = new Map();

function now() {
  return Date.now();
}

function roundCoordinate(value) {
  return Number(value).toFixed(3);
}

export function buildNearbySearchCacheKey({ latitude, longitude, radius, limit }) {
  return [
    'nearby-cafes-v2',
    roundCoordinate(latitude),
    roundCoordinate(longitude),
    Number(radius || 10),
    Number(limit || 12),
  ].join(':');
}

function readCache(cache, key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache(cache, key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: now() + ttlMs,
    savedAt: now(),
  });
}

export function getCachedNearbySearch(key) {
  return readCache(searchCache, key);
}

export function setCachedNearbySearch(key, value, ttlMs = DEFAULT_SEARCH_TTL_MS) {
  writeCache(searchCache, key, value, ttlMs);
}

export function getCachedPlaceDetails(placeId) {
  return readCache(detailsCache, placeId);
}

export function setCachedPlaceDetails(placeId, value, ttlMs = DEFAULT_DETAILS_TTL_MS) {
  writeCache(detailsCache, placeId, value, ttlMs);
}

export function getCacheStats() {
  return {
    nearbySearches: searchCache.size,
    placeDetails: detailsCache.size,
  };
}
