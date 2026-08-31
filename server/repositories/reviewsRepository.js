import { query } from '../db/client.js';
import { mapCafeRow } from './cafesRepository.js';

function mapReviewRow(row) {
  if (!row) return null;

  const cafe = row.cafe_id ? mapCafeRow({
    id: row.cafe_id,
    place_id: row.place_id,
    source: row.cafe_source,
    name: row.cafe_name,
    address: row.cafe_address,
    lat: row.cafe_lat,
    lng: row.cafe_lng,
    rating: row.cafe_rating,
    user_rating_count: row.cafe_user_rating_count,
    website: row.cafe_website,
    phone_number: row.cafe_phone_number,
    photo_names: row.cafe_photo_names || [],
    hours: row.cafe_hours || [],
    fetched_at: row.cafe_fetched_at,
  }) : null;

  return {
    id: String(row.id),
    postgresId: row.id,
    cafeId: row.cafe_id,
    rating: row.rating,
    text: row.text || '',
    photoUrl: row.photo_url || '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
    reviewer: {
      id: row.supabase_user_id,
      appUserId: row.user_id,
      username: row.username,
      profilePhotoUrl: row.profile_photo_url,
    },
    shop: cafe,
  };
}

const REVIEW_SELECT = `
  r.*,
  u.supabase_user_id,
  u.username,
  u.profile_photo_url,
  c.id as cafe_id,
  c.place_id,
  c.source as cafe_source,
  c.name as cafe_name,
  c.address as cafe_address,
  c.lat as cafe_lat,
  c.lng as cafe_lng,
  c.rating as cafe_rating,
  c.user_rating_count as cafe_user_rating_count,
  c.website as cafe_website,
  c.phone_number as cafe_phone_number,
  c.photo_names as cafe_photo_names,
  c.hours as cafe_hours,
  c.fetched_at as cafe_fetched_at
`;

export async function findReviewsByCafeIds(cafeIds) {
  if (!cafeIds.length) return [];

  const result = await query(
    `
      select ${REVIEW_SELECT}
      from reviews r
      join app_users u on u.id = r.user_id
      join cafes c on c.id = r.cafe_id
      where r.cafe_id = any($1::bigint[])
      order by r.created_at desc
    `,
    [cafeIds]
  );

  return (result?.rows || []).map(mapReviewRow);
}

export async function findReviewsByUserId(appUserId) {
  const result = await query(
    `
      select ${REVIEW_SELECT}
      from reviews r
      join app_users u on u.id = r.user_id
      join cafes c on c.id = r.cafe_id
      where r.user_id = $1
      order by r.created_at desc
    `,
    [appUserId]
  );

  return (result?.rows || []).map(mapReviewRow);
}

export async function createReview({ cafeId, appUserId, rating, text, photoUrl }) {
  const result = await query(
    `
      insert into reviews (cafe_id, user_id, rating, text, photo_url)
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [cafeId, appUserId, rating, text || null, photoUrl || null]
  );

  const reviewId = result?.rows?.[0]?.id;
  const reviews = await findReviewsByIds([reviewId]);
  return reviews[0] || null;
}

export async function updateReview({ reviewId, appUserId, rating, text, photoUrl }) {
  const result = await query(
    `
      update reviews set
        rating = $3,
        text = $4,
        photo_url = $5,
        updated_at = now()
      where id = $1 and user_id = $2
      returning id
    `,
    [reviewId, appUserId, rating, text || null, photoUrl || null]
  );

  if (!result?.rows?.[0]) return null;

  const reviews = await findReviewsByIds([reviewId]);
  return reviews[0] || null;
}

export async function deleteReview({ reviewId, appUserId }) {
  const result = await query(
    'delete from reviews where id = $1 and user_id = $2 returning id',
    [reviewId, appUserId]
  );

  return Boolean(result?.rows?.[0]);
}

export async function findReviewsByIds(reviewIds) {
  if (!reviewIds.length) return [];

  const result = await query(
    `
      select ${REVIEW_SELECT}
      from reviews r
      join app_users u on u.id = r.user_id
      join cafes c on c.id = r.cafe_id
      where r.id = any($1::bigint[])
    `,
    [reviewIds]
  );

  return (result?.rows || []).map(mapReviewRow);
}
