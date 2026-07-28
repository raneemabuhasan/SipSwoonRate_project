export function chooseCafeResults(candidates, evaluate) {
  const accepted = candidates.filter((cafe) => evaluate(cafe).accepted);

  if (accepted.length > 0 || candidates.length === 0) {
    return { cafes: accepted, filterFallback: false };
  }

  const safeFallback = candidates.filter((cafe) => !evaluate(cafe).hardRejected);
  return {
    cafes: safeFallback,
    filterFallback: safeFallback.length > 0,
  };
}

export async function persistCafesBestEffort(cafes, {
  databaseConfigured,
  persist,
  logger = console,
} = {}) {
  if (!databaseConfigured || cafes.length === 0) {
    return { cafes, cacheWarning: null };
  }

  try {
    const persisted = await persist(cafes);
    return {
      cafes: persisted.length > 0 ? persisted : cafes,
      cacheWarning: null,
    };
  } catch (error) {
    logger.error('Could not cache cafes; returning live Google results.', error);
    return {
      cafes,
      cacheWarning: 'Database caching is temporarily unavailable. Live Google results are shown.',
    };
  }
}

export async function readCacheBestEffort(read, { logger = console } = {}) {
  try {
    return { value: await read(), cacheWarning: null };
  } catch (error) {
    logger.error('Could not read the database cafe cache; continuing with Google Places.', error);
    return {
      value: null,
      cacheWarning: 'Database caching is temporarily unavailable. Live Google results are shown.',
    };
  }
}

export async function writeCacheBestEffort(write, { logger = console } = {}) {
  try {
    await write();
    return null;
  } catch (error) {
    logger.error('Could not update the database cafe cache; live results were still returned.', error);
    return 'Database caching is temporarily unavailable. Live Google results are shown.';
  }
}
