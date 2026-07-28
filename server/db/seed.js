import { seedDrinks as seedDrinkData } from '../data/seedDrinks.js';
import { seedCafes as seedCafeData } from '../data/seedCafes.js';
import { closePool, isDatabaseConfigured } from './client.js';
import { seedDrinks } from '../repositories/drinksRepository.js';
import { seedCafes } from '../repositories/cafesRepository.js';

if (!isDatabaseConfigured()) {
  console.error('DATABASE_URL is not set. Add your Supabase connection string to .env first.');
  process.exitCode = 1;
} else {
  const seededCafes = await seedCafes(seedCafeData);
  const seededDrinks = await seedDrinks(seedDrinkData);
  await closePool();
  console.log(`Seeded ${seededCafes.length} cafes and ${seededDrinks.length} drinks.`);
}
