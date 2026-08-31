import { query } from '../db/client.js';

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24;

export async function getCachedSearch(cacheKey) {
  const result = await query(
    `
      select response
      from place_search_cache
      where cache_key = $1
        and expires_at > now()
      limit 1
    `,
    [cacheKey]
  );

  return result?.rows?.[0]?.response || null;
}

export async function setCachedSearch({
  cacheKey,
  latitude,
  longitude,
  radius,
  response,
  ttlMs = DEFAULT_TTL_MS,
}) {
  const expiresAt = new Date(Date.now() + ttlMs);

  await query(
    `
      insert into place_search_cache (cache_key, lat, lng, radius_miles, response, fetched_at, expires_at)
      values ($1, $2, $3, $4, $5::jsonb, now(), $6)
      on conflict (cache_key) do update set
        lat = excluded.lat,
        lng = excluded.lng,
        radius_miles = excluded.radius_miles,
        response = excluded.response,
        fetched_at = now(),
        expires_at = excluded.expires_at
    `,
    [cacheKey, latitude, longitude, radius, JSON.stringify(response), expiresAt]
  );
}
