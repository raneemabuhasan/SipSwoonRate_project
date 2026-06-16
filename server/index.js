import express from 'express';
import { mockCoffeeShops } from './data/mockCoffeeShops.js';
import { mockDrinks } from './data/mockDrinks.js';
import { calculateDistanceMiles, isValidCoordinate } from './utils/geo.js';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173';

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

function getFilteredShops(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const radius = Number(query.radius || 10);
  const hasLocation = isValidCoordinate(lat) && isValidCoordinate(lng);

  let shops = mockCoffeeShops.map((shop) => ({ ...shop }));

  if (hasLocation) {
    shops = shops
      .map((shop) => ({
        ...shop,
        distance: calculateDistanceMiles(
          { latitude: lat, longitude: lng },
          { latitude: shop.latitude, longitude: shop.longitude }
        ),
      }))
      .filter((shop) => shop.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  return {
    data: shops,
    meta: {
      count: shops.length,
      source: 'mock',
      radius: hasLocation ? radius : null,
    },
  };
}

function getDrinks(query) {
  const shopId = query.shopId;
  const type = query.type?.toLowerCase();

  let drinks = mockDrinks.map((drink) => ({ ...drink }));

  if (shopId) {
    drinks = drinks.filter((drink) => drink.shopId === shopId);
  }

  if (type) {
    drinks = drinks.filter((drink) => drink.normalizedType.toLowerCase() === type);
  }

  return {
    data: drinks,
    meta: {
      count: drinks.length,
      source: 'mock',
      shopId: shopId || null,
      type: type || null,
    },
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'sip-swoon-api',
    framework: 'express',
    dataSource: 'mock',
  });
});

app.get('/api/shops', (req, res) => {
  res.json(getFilteredShops(req.query));
});

app.get('/api/drinks', (req, res) => {
  res.json(getDrinks(req.query));
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: ['/api/health', '/api/shops', '/api/drinks'],
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Sip & Swoon API listening on http://${HOST}:${PORT}`);
});
