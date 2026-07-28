import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chooseCafeResults,
  persistCafesBestEffort,
  readCacheBestEffort,
  writeCacheBestEffort,
} from '../server/services/cafeResultResilience.js';

const quietLogger = { error() {} };

test('location results use persisted cafes when Google and the database succeed', async () => {
  const googleCafes = [{ id: 'google-1', name: 'Independent Coffee' }];
  const persistedCafes = [{ ...googleCafes[0], postgresId: 1 }];
  const result = await persistCafesBestEffort(googleCafes, {
    databaseConfigured: true,
    persist: async () => persistedCafes,
    logger: quietLogger,
  });

  assert.deepEqual(result.cafes, persistedCafes);
  assert.equal(result.cacheWarning, null);
});

test('location results preserve Google cafes when the database fails', async () => {
  const googleCafes = [{ id: 'google-1', name: 'Independent Coffee' }];
  const result = await persistCafesBestEffort(googleCafes, {
    databaseConfigured: true,
    persist: async () => { throw new Error('database unavailable'); },
    logger: quietLogger,
  });

  assert.deepEqual(result.cafes, googleCafes);
  assert.match(result.cacheWarning, /temporarily unavailable/i);
});

test('filter fallback returns safe Google cafes when the strict filter rejects everything', () => {
  const cafes = [
    { id: 'safe', name: 'Neighborhood Cafe' },
    { id: 'unsafe', name: 'Gas Station' },
  ];
  const selection = chooseCafeResults(cafes, (cafe) => ({
    accepted: false,
    hardRejected: cafe.id === 'unsafe',
  }));

  assert.deepEqual(selection.cafes, [cafes[0]]);
  assert.equal(selection.filterFallback, true);
});

test('database cache read and write failures do not throw', async () => {
  const read = await readCacheBestEffort(async () => { throw new Error('offline'); }, { logger: quietLogger });
  const write = await writeCacheBestEffort(async () => { throw new Error('offline'); }, { logger: quietLogger });

  assert.equal(read.value, null);
  assert.match(read.cacheWarning, /temporarily unavailable/i);
  assert.match(write, /temporarily unavailable/i);
});
