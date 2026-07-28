import { closePool, isDatabaseConfigured, query } from './client.js';

const protectedTables = [
  'app_users',
  'cafe_drinks',
  'cafes',
  'drinks',
  'favorites',
  'place_search_cache',
  'reviews',
  'user_drink_suggestions',
];

if (!isDatabaseConfigured()) {
  console.error('DATABASE_URL is required to verify database security.');
  process.exitCode = 1;
} else {
  try {
    const result = await query(
      `
        select
          c.relname as table_name,
          c.relrowsecurity as rls_enabled,
          coalesce(bool_or(
            grantee in ('anon', 'authenticated')
            and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
          ), false) as has_client_privileges
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        left join information_schema.role_table_grants g
          on g.table_schema = n.nspname and g.table_name = c.relname
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and c.relname = any($1::text[])
        group by c.relname, c.relrowsecurity
        order by c.relname
      `,
      [protectedTables]
    );

    const rows = result?.rows || [];
    const found = new Set(rows.map((row) => row.table_name));
    const missing = protectedTables.filter((table) => !found.has(table));
    const unsafe = rows.filter((row) => !row.rls_enabled || row.has_client_privileges);

    console.table(rows);

    if (missing.length || unsafe.length) {
      if (missing.length) console.error(`Missing protected tables: ${missing.join(', ')}`);
      if (unsafe.length) console.error(`Unsafe tables: ${unsafe.map((row) => row.table_name).join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log('Security verification passed: RLS is enabled and client roles have no table privileges.');
    }
  } finally {
    await closePool();
  }
}
