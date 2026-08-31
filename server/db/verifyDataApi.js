const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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

if (!supabaseUrl || !publishableKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY are required to verify the Data API.');
  process.exitCode = 1;
} else {
  const results = await Promise.all(protectedTables.map(async (table) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      },
    });

    return { table, status: response.status, blocked: response.status === 401 || response.status === 403 };
  }));

  console.table(results);
  const exposed = results.filter((result) => !result.blocked);

  if (exposed.length) {
    console.error(`Data API access was not blocked for: ${exposed.map(({ table }) => table).join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('Data API verification passed: the publishable key cannot read protected tables.');
  }
}
