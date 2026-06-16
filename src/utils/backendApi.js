const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function requestJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json();
}

export async function getBackendHealth() {
  return requestJson('/api/health');
}

export async function getBackendShops({ latitude, longitude, radius = 10 } = {}) {
  const params = new URLSearchParams();

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.set('lat', latitude);
    params.set('lng', longitude);
    params.set('radius', radius);
  }

  const query = params.toString();
  return requestJson(`/api/shops${query ? `?${query}` : ''}`);
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
