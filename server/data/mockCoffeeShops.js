import { seedCafes } from './seedCafes.js';

export const mockCoffeeShops = seedCafes.map((cafe) => ({
  ...cafe,
  source: 'mock',
  reviews: [],
}));
