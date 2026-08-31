import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const connectionString = process.env.DATABASE_URL.trim();

  if (
    connectionString.includes('[YOUR-PASSWORD]') ||
    connectionString.includes('[') ||
    connectionString.includes(']')
  ) {
    throw new Error(
      'DATABASE_URL still contains placeholder brackets. Replace [YOUR-PASSWORD] with the raw database password and remove the brackets.'
    );
  }

  try {
    new URL(connectionString);
  } catch {
    throw new Error(
      'DATABASE_URL is not a valid Postgres URL. Check for spaces, missing username/password, or special characters in the password that need URL-encoding.'
    );
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function query(text, params = []) {
  const db = getPool();

  if (!db) {
    return null;
  }

  return db.query(text, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
