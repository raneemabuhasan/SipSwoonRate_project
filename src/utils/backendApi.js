const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function requestJson(path, { method = 'GET', body, token } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Backend request failed: ${response.status}`;

    try {
      const errorBody = await response.json();
      if (errorBody?.error) {
        message = `${message} - ${errorBody.error}`;
      }
    } catch {
      // Keep the generic status message when the backend returns non-JSON errors.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getBackendHealth() {
  return requestJson('/api/health');
}

export async function getBackendShops({ latitude, longitude, radius = 10, limit, token } = {}) {
  const params = new URLSearchParams();

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.set('lat', latitude);
    params.set('lng', longitude);
    params.set('radius', radius);
  }

  if (Number.isFinite(limit)) {
    params.set('limit', limit);
  }

  const query = params.toString();
  return requestJson(`/api/shops${query ? `?${query}` : ''}`, { token });
}

export async function getBackendDrinks({ shopId, type } = {}) {
  const params = new URLSearchParams();

  if (shopId) {
    params.set('shopId', shopId);
  }

  if (type) {
    params.set('type', type);
  }

  const query = params.toString();
  return requestJson(`/api/drinks${query ? `?${query}` : ''}`);
}

export async function getCurrentUserProfile(token) {
  return requestJson('/api/me', { token });
}

export async function passwordLogin(identifier, password) {
  return requestJson('/api/auth/password-login', {
    method: 'POST',
    body: {
      identifier,
      password,
    },
  });
}

export async function createSignupProfile(token, username) {
  return requestJson('/api/auth/signup-profile', {
    method: 'POST',
    token,
    body: {
      username,
    },
  });
}

export async function checkUsernameAvailability(username) {
  return requestJson('/api/auth/check-username', {
    method: 'POST',
    body: {
      username,
    },
  });
}

export async function updateCurrentUserProfile(token, updates) {
  return requestJson('/api/me', {
    method: 'PATCH',
    token,
    body: updates,
  });
}

export async function getCurrentUserReviews(token) {
  return requestJson('/api/me/reviews', { token });
}

export async function getCurrentUserFavorites(token) {
  return requestJson('/api/me/favorites', { token });
}

export async function addFavorite(token, cafeId) {
  return requestJson(`/api/me/favorites/${encodeURIComponent(cafeId)}`, {
    method: 'PUT',
    token,
  });
}

export async function removeFavorite(token, cafeId) {
  return requestJson(`/api/me/favorites/${encodeURIComponent(cafeId)}`, {
    method: 'DELETE',
    token,
  });
}

export async function createCafeReview(token, cafeId, review) {
  return requestJson(`/api/cafes/${encodeURIComponent(cafeId)}/reviews`, {
    method: 'POST',
    token,
    body: review,
  });
}

export async function updateCafeReview(token, reviewId, review) {
  return requestJson(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    token,
    body: review,
  });
}

export async function deleteCafeReview(token, reviewId) {
  return requestJson(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
    token,
  });
}
