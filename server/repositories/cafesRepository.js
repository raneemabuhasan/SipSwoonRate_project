import { query } from '../db/client.js';

function toCafeRow(place) {
  return {
    placeId: place.placeId || place.id?.replace(/^google-/, '') || null,
    source: place.source || 'google_places',
    name: place.name,
    address: place.location || place.address || '',
    lat: place.latitude ?? place.lat ?? null,
    lng: place.longitude ?? place.lng ?? null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? 0,
    website: place.website || null,
    phoneNumber: place.phoneNumber || null,
    photoNames: place.photoNames || [],
    hours: place.hours || [],
    types: place.types || [],
    rawPlace: place.rawPlace || place,
  };
}

export function mapCafeRow(row) {
  return {
    id: row.place_id ? `google-${row.place_id}` : `postgres-cafe-${row.id}`,
    postgresId: row.id,
    placeId: row.place_id,
    source: row.source,
    name: row.name,
    location: row.address,
    latitude: row.lat,
    longitude: row.lng,
    rating: row.rating === null ? null : Number(row.rating),
    userRatingCount: row.user_rating_count,
    website: row.website,
    phoneNumber: row.phone_number,
    photoNames: row.photo_names || [],
    photoUrl: row.photo_names?.[0] ? `/api/places/photos/${encodeURIComponent(row.photo_names[0])}` : null,
    hours: row.hours || [],
    types: row.raw_place?.types || [],
    reviews: [],
    favorites: [],
    createdAt: row.fetched_at ? new Date(row.fetched_at).getTime() : 0,
  };
}

export async function upsertCafe(place, { detailsFetched = false } = {}) {
  const row = toCafeRow(place);

  if (!row.name) {
    return null;
  }

  const result = await query(
    `
      insert into cafes (
        place_id,
        source,
        name,
        address,
        lat,
        lng,
        rating,
        user_rating_count,
        website,
        phone_number,
        photo_names,
        hours,
        raw_place,
        fetched_at,
        details_fetched_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, now(), $14)
      on conflict (place_id) do update set
        source = excluded.source,
        name = excluded.name,
        address = excluded.address,
        lat = excluded.lat,
        lng = excluded.lng,
        rating = coalesce(excluded.rating, cafes.rating),
        user_rating_count = greatest(excluded.user_rating_count, cafes.user_rating_count),
        website = coalesce(excluded.website, cafes.website),
        phone_number = coalesce(excluded.phone_number, cafes.phone_number),
        photo_names = case
          when jsonb_array_length(excluded.photo_names) > 0 then excluded.photo_names
          else cafes.photo_names
        end,
        hours = case
          when jsonb_array_length(excluded.hours) > 0 then excluded.hours
          else cafes.hours
        end,
        raw_place = excluded.raw_place,
        fetched_at = now(),
        details_fetched_at = coalesce(excluded.details_fetched_at, cafes.details_fetched_at)
      returning *
    `,
    [
      row.placeId,
      row.source,
      row.name,
      row.address,
      row.lat,
      row.lng,
      row.rating,
      row.userRatingCount,
      row.website,
      row.phoneNumber,
      JSON.stringify(row.photoNames),
      JSON.stringify(row.hours),
      JSON.stringify(row.rawPlace),
      detailsFetched ? new Date() : null,
    ]
  );

  return result?.rows?.[0] ? mapCafeRow(result.rows[0]) : null;
}

export async function upsertCafes(places) {
  const cafes = [];

  for (const place of places) {
    const cafe = await upsertCafe(place);
    if (cafe) {
      cafes.push(cafe);
    }
  }

  return cafes;
}

export async function seedCafes(cafesToSeed) {
  return upsertCafes(cafesToSeed);
}

export async function findCafeByPlaceId(placeId) {
  const result = await query('select * from cafes where place_id = $1 limit 1', [placeId]);
  return result?.rows?.[0] ? mapCafeRow(result.rows[0]) : null;
}

export async function findCafeById(cafeId) {
  const result = await query('select * from cafes where id = $1 limit 1', [cafeId]);
  return result?.rows?.[0] ? mapCafeRow(result.rows[0]) : null;
}

export async function findCafesByIds(ids) {
  if (!ids.length) {
    return [];
  }

  const result = await query('select * from cafes where id = any($1::bigint[])', [ids]);
  return (result?.rows || []).map(mapCafeRow);
}
