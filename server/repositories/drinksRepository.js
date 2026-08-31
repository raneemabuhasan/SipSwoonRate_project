import { query } from '../db/client.js';

export function normalizeDrinkName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeAliases(aliases) {
  return [...new Set(aliases.map(normalizeDrinkName).filter(Boolean))];
}

function mapDrinkRow(row) {
  return {
    id: `postgres-drink-${row.id}`,
    postgresId: row.id,
    name: row.name,
    normalizedType: row.normalized_name,
    category: row.category,
    description: row.description,
    aliases: row.aliases || [],
    source: 'postgres',
  };
}

function mapCafeDrinkRow(row) {
  return {
    id: `postgres-cafe-drink-${row.cafe_id}-${row.drink_id}`,
    cafeId: row.cafe_id,
    shopId: row.place_id ? `google-${row.place_id}` : `postgres-cafe-${row.cafe_id}`,
    drinkId: `postgres-drink-${row.drink_id}`,
    name: row.drink_name,
    normalizedType: row.normalized_name,
    category: row.category,
    description: row.description,
    availabilityStatus: row.availability_status,
    confidence: row.confidence === null ? null : Number(row.confidence),
    notes: row.notes,
    source: row.source,
    lastVerifiedAt: row.last_verified_at,
    lastUpdated: row.last_updated,
  };
}

export async function upsertDrink({ name, normalizedName, category, description, aliases = [] }) {
  const normalized = normalizedName || normalizeDrinkName(name);
  const normalizedAliases = normalizeAliases([name, normalized, ...aliases]);
  const result = await query(
    `
      insert into drinks (name, normalized_name, category, description, aliases)
      values ($1, $2, $3, $4, $5::jsonb)
      on conflict (normalized_name) do update set
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        aliases = excluded.aliases
      returning *
    `,
    [name, normalized, category || null, description || null, JSON.stringify(normalizedAliases)]
  );

  return result?.rows?.[0] ? mapDrinkRow(result.rows[0]) : null;
}

export async function seedDrinks(drinks) {
  const seeded = [];

  for (const drink of drinks) {
    const saved = await upsertDrink(drink);
    if (saved) {
      seeded.push(saved);
    }
  }

  return seeded;
}

export async function findDrinks({ type } = {}) {
  if (!type) {
    const result = await query('select * from drinks order by name asc');
    return (result?.rows || []).map(mapDrinkRow);
  }

  const normalized = normalizeDrinkName(type);
  const result = await query(
    `
      select *
      from drinks
      where normalized_name = $1
        or aliases ? $1
        or normalized_name ilike $2
      order by name asc
    `,
    [normalized, `%${normalized}%`]
  );

  return (result?.rows || []).map(mapDrinkRow);
}

export async function findDrinkById(drinkId) {
  const result = await query('select * from drinks where id = $1 limit 1', [drinkId]);
  return result?.rows?.[0] ? mapDrinkRow(result.rows[0]) : null;
}

export async function linkCafeDrink({
  cafeId,
  drinkId,
  availabilityStatus = 'unknown',
  source = 'user',
  confidence = 0.5,
  notes = null,
  lastVerifiedAt = null,
}) {
  const result = await query(
    `
      with linked as (
        insert into cafe_drinks (
          cafe_id,
          drink_id,
          availability_status,
          source,
          confidence,
          notes,
          last_verified_at,
          last_updated
        )
        values ($1, $2, $3, $4, $5, $6, $7, now())
        on conflict (cafe_id, drink_id) do update set
          availability_status = excluded.availability_status,
          source = excluded.source,
          confidence = excluded.confidence,
          notes = excluded.notes,
          last_verified_at = excluded.last_verified_at,
          last_updated = now()
        returning *
      )
      select
        linked.*,
        c.place_id,
        d.name as drink_name,
        d.normalized_name,
        d.category,
        d.description
      from linked
      join drinks d on d.id = linked.drink_id
      join cafes c on c.id = linked.cafe_id
    `,
    [cafeId, drinkId, availabilityStatus, source, confidence, notes, lastVerifiedAt]
  );

  return result?.rows?.[0] ? mapCafeDrinkRow(result.rows[0]) : null;
}

export async function unlinkCafeDrink({ cafeId, drinkId }) {
  const result = await query(
    `
      delete from cafe_drinks
      where cafe_id = $1
        and drink_id = $2
      returning *
    `,
    [cafeId, drinkId]
  );

  return result?.rowCount > 0;
}

export async function findCafeDrinks({ cafeId, type } = {}) {
  const params = [];
  const filters = [];

  if (cafeId) {
    params.push(cafeId);
    filters.push(`cd.cafe_id = $${params.length}`);
  }

  if (type) {
    params.push(normalizeDrinkName(type));
    filters.push(`(d.normalized_name = $${params.length} or d.aliases ? $${params.length})`);
  }

  const where = filters.length ? `where ${filters.join(' and ')}` : '';
  const result = await query(
    `
      select
        cd.*,
        c.place_id,
        d.name as drink_name,
        d.normalized_name,
        d.category,
        d.description
      from cafe_drinks cd
      join drinks d on d.id = cd.drink_id
      join cafes c on c.id = cd.cafe_id
      ${where}
      order by
        case cd.availability_status
          when 'available' then 1
          when 'seasonal' then 2
          when 'unknown' then 3
          else 4
        end,
        cd.confidence desc,
        d.name asc
    `,
    params
  );

  return (result?.rows || []).map(mapCafeDrinkRow);
}
