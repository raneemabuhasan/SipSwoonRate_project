const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';
const METERS_PER_MILE = 1609.344;

const NEARBY_SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
].join(',');

const PLACE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'photos',
  'regularOpeningHours',
  'websiteUri',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
].join(',');

function getApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim();
}

function assertApiKey() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  return apiKey;
}

function clampRadiusMeters(radiusMiles) {
  const parsedRadius = Number(radiusMiles);
  const radius = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 10;

  return Math.min(Math.round(radius * METERS_PER_MILE), 50000);
}

function getPhotoName(photo) {
  return photo?.name || null;
}

function normalizePlace(place, distance = null) {
  const photoNames = (place.photos || []).map(getPhotoName).filter(Boolean);

  return {
    id: place.id ? `google-${place.id}` : place.name,
    placeId: place.id,
    source: 'google_places',
    name: place.displayName?.text || 'Unnamed cafe',
    location: place.formattedAddress || '',
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || 0,
    photoNames,
    photoUrl: photoNames[0] ? `/api/places/photos/${encodeURIComponent(photoNames[0])}` : null,
    website: place.websiteUri || null,
    phoneNumber: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    hours: place.regularOpeningHours?.weekdayDescriptions || [],
    types: place.types || [],
    reviews: [],
    favorites: [],
    createdAt: 0,
    distance,
  };
}

async function requestGooglePlaces(path, { method = 'GET', body, fieldMask } = {}) {
  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': assertApiKey(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Places request failed: ${response.status} ${errorBody}`);
  }

  return response.json();
}

export function isGooglePlacesConfigured() {
  return Boolean(getApiKey());
}

export async function searchNearbyCafes({ latitude, longitude, radius, maxResultCount = 20 }) {
  const body = {
    includedTypes: ['coffee_shop', 'coffee_roastery', 'coffee_stand'],
    maxResultCount: Math.min(Math.max(Number(maxResultCount) || 20, 1), 20),
    locationRestriction: {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius: clampRadiusMeters(radius),
      },
    },
  };

  const data = await requestGooglePlaces('/places:searchNearby', {
    method: 'POST',
    body,
    fieldMask: NEARBY_SEARCH_FIELD_MASK,
  });

  return (data.places || []).map((place) => normalizePlace(place));
}

export async function getPlaceDetails(placeId) {
  const data = await requestGooglePlaces(`/places/${encodeURIComponent(placeId)}`, {
    fieldMask: PLACE_DETAILS_FIELD_MASK,
  });

  return normalizePlace(data);
}

export function getPlacePhotoUrl(photoName, maxWidthPx = 800) {
  return `${GOOGLE_PLACES_BASE_URL}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${assertApiKey()}`;
}
