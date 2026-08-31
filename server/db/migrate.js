import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, isDatabaseConfigured, query } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!isDatabaseConfigured()) {
  console.error('DATABASE_URL is not set. Add your Supabase connection string to .env first.');
  process.exitCode = 1;
} else {
  const schema = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  await query(schema);
  await closePool();
  console.log('Postgres schema migrated successfully.');
}
