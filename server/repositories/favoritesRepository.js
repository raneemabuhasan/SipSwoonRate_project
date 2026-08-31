import { query } from '../db/client.js';
import { mapCafeRow } from './cafesRepository.js';

export async function findFavoriteCafeIds(appUserId, cafeIds = []) {
  if (!appUserId || !cafeIds.length) return new Set();

  const result = await query(
    'select cafe_id from favorites where user_id = $1 and cafe_id = any($2::bigint[])',
    [appUserId, cafeIds]
  );

  return new Set((result?.rows || []).map((row) => Number(row.cafe_id)));
}

export async function findFavoritesByUserId(appUserId) {
  const result = await query(
    `
      select
        f.created_at as favorite_created_at,
        c.*
      from favorites f
      join cafes c on c.id = f.cafe_id
      where f.user_id = $1
      order by f.created_at desc
    `,
    [appUserId]
  );

  return (result?.rows || []).map((row) => ({
    id: `${appUserId}-${row.id}`,
    createdAt: row.favorite_created_at ? new Date(row.favorite_created_at).getTime() : null,
    coffeeShop: mapCafeRow(row),
  }));
}

export async function addFavorite({ appUserId, cafeId }) {
  await query(
    `
      insert into favorites (user_id, cafe_id)
      values ($1, $2)
      on conflict (user_id, cafe_id) do nothing
    `,
    [appUserId, cafeId]
  );
}

export async function removeFavorite({ appUserId, cafeId }) {
  await query('delete from favorites where user_id = $1 and cafe_id = $2', [appUserId, cafeId]);
}
