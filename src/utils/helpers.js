// Helper function to calculate average rating
export function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

// Normalize user-facing search text so accents and casing do not block matches.
export function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function searchTextIncludes(value, query) {
  const normalizedQuery = normalizeSearchText(query);
  return Boolean(normalizedQuery) && normalizeSearchText(value).includes(normalizedQuery);
}

export function searchTextStartsWith(value, query) {
  const normalizedQuery = normalizeSearchText(query);
  return Boolean(normalizedQuery) && normalizeSearchText(value).startsWith(normalizedQuery);
}

export function searchTextEquals(value, query) {
  const normalizedQuery = normalizeSearchText(query);
  return Boolean(normalizedQuery) && normalizeSearchText(value) === normalizedQuery;
}

export function getSearchMatchRange(text, query) {
  const source = String(text || '');
  const normalizedQuery = normalizeSearchText(query);

  if (!source || !normalizedQuery) {
    return null;
  }

  let normalizedSource = '';
  const segments = [];

  for (let index = 0; index < source.length;) {
    const char = String.fromCodePoint(source.codePointAt(index));
    const startIndex = index;
    const endIndex = index + char.length;
    const normalizedChar = normalizeSearchText(char);

    if (normalizedChar) {
      const normalizedStart = normalizedSource.length;
      normalizedSource += normalizedChar;
      segments.push({
        startIndex,
        endIndex,
        normalizedStart,
        normalizedEnd: normalizedSource.length,
      });
    }

    index = endIndex;
  }

  const matchStart = normalizedSource.indexOf(normalizedQuery);

  if (matchStart === -1) {
    return null;
  }

  const matchEnd = matchStart + normalizedQuery.length;
  const startSegment = segments.find((segment) => (
    segment.normalizedStart <= matchStart && segment.normalizedEnd > matchStart
  ));
  const endSegment = [...segments].reverse().find((segment) => (
    segment.normalizedStart < matchEnd && segment.normalizedEnd >= matchEnd
  ));

  if (!startSegment || !endSegment) {
    return null;
  }

  return {
    start: startSegment.startIndex,
    end: endSegment.endIndex,
  };
}

// Helper function to format date
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Helper function to get time ago
export function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return formatDate(timestamp);
}
