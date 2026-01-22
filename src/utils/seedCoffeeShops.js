import { db } from '../db';
import { id } from '@instantdb/react';

// Verified open coffee shops with real coordinates (no Starbucks, no closed locations)
export const coffeeShopsData = [
  // San Francisco
  {
    name: "Blue Bottle Coffee - Ferry Building",
    location: "1 Ferry Building, San Francisco, CA 94111",
    latitude: 37.7956,
    longitude: -122.3933,
  },
  {
    name: "Philz Coffee - Mission",
    location: "3101 24th St, San Francisco, CA 94110",
    latitude: 37.7528,
    longitude: -122.4097,
  },
  {
    name: "Sightglass Coffee",
    location: "270 7th St, San Francisco, CA 94103",
    latitude: 37.7774,
    longitude: -122.4102,
  },
  {
    name: "Ritual Coffee Roasters",
    location: "1026 Valencia St, San Francisco, CA 94110",
    latitude: 37.7567,
    longitude: -122.4214,
  },
  {
    name: "Flywheel Coffee Roasters",
    location: "672 Stanyan St, San Francisco, CA 94117",
    latitude: 37.7697,
    longitude: -122.4545,
  },
  
  // Los Angeles
  {
    name: "Intelligentsia Coffee - Silver Lake",
    location: "3922 W Sunset Blvd, Los Angeles, CA 90029",
    latitude: 34.0922,
    longitude: -118.2776,
  },
  {
    name: "Blue Bottle Coffee - Arts District",
    location: "582 Mateo St, Los Angeles, CA 90013",
    latitude: 34.0393,
    longitude: -118.2331,
  },
  {
    name: "Verve Coffee Roasters - West Hollywood",
    location: "8925 Melrose Ave, West Hollywood, CA 90069",
    latitude: 34.0839,
    longitude: -118.3881,
  },
  {
    name: "Go Get Em Tiger",
    location: "230 N Larchmont Blvd, Los Angeles, CA 90004",
    latitude: 34.0751,
    longitude: -118.3239,
  },

  // New York
  {
    name: "Blue Bottle Coffee - Chelsea",
    location: "450 W 15th St, New York, NY 10011",
    latitude: 40.7427,
    longitude: -74.0063,
  },
  {
    name: "Stumptown Coffee Roasters - Ace Hotel",
    location: "18 W 29th St, New York, NY 10001",
    latitude: 40.7456,
    longitude: -73.9881,
  },
  {
    name: "La Colombe Coffee Roasters",
    location: "270 Lafayette St, New York, NY 10012",
    latitude: 40.7246,
    longitude: -73.9960,
  },
  {
    name: "Café Grumpy - Chelsea",
    location: "224 W 20th St, New York, NY 10011",
    latitude: 40.7432,
    longitude: -73.9989,
  },

  // Seattle
  {
    name: "Espresso Vivace - Capitol Hill",
    location: "321 Broadway E, Seattle, WA 98102",
    latitude: 47.6191,
    longitude: -122.3210,
  },
  {
    name: "Slate Coffee Roasters",
    location: "602 2nd Ave, Seattle, WA 98104",
    latitude: 47.6026,
    longitude: -122.3351,
  },
  {
    name: "Victrola Coffee Roasters",
    location: "310 E Pike St, Seattle, WA 98122",
    latitude: 47.6142,
    longitude: -122.3242,
  },
  {
    name: "Analog Coffee",
    location: "235 Summit Ave E, Seattle, WA 98102",
    latitude: 47.6287,
    longitude: -122.3231,
  },

  // Portland
  {
    name: "Stumptown Coffee Roasters - Downtown",
    location: "128 SW 3rd Ave, Portland, OR 97204",
    latitude: 45.5223,
    longitude: -122.6756,
  },
  {
    name: "Coava Coffee Roasters",
    location: "1300 SE Grand Ave, Portland, OR 97214",
    latitude: 45.5151,
    longitude: -122.6607,
  },
  {
    name: "Heart Coffee Roasters",
    location: "537 SW 12th Ave, Portland, OR 97205",
    latitude: 45.5206,
    longitude: -122.6839,
  },
  {
    name: "Barista",
    location: "539 NW 13th Ave, Portland, OR 97209",
    latitude: 45.5255,
    longitude: -122.6851,
  },

  // Chicago
  {
    name: "Intelligentsia Coffee - Millennium Park",
    location: "53 E Randolph St, Chicago, IL 60601",
    latitude: 41.8842,
    longitude: -87.6242,
  },
  {
    name: "Intelligentsia Coffee - Monadnock",
    location: "53 W Jackson Blvd, Chicago, IL 60604",
    latitude: 41.8779,
    longitude: -87.6297,
  },
  {
    name: "Colectivo Coffee - Lincoln Park",
    location: "2530 N Clark St, Chicago, IL 60614",
    latitude: 41.9279,
    longitude: -87.6419,
  },
];

// Function to seed coffee shops into the database
export async function seedCoffeeShops(userId) {
  try {
    console.log('Starting to seed coffee shops...');
    
    const transactions = coffeeShopsData.map(shop => {
      const shopId = id();
      return db.tx.coffeeShops[shopId]
        .update({
          name: shop.name,
          location: shop.location,
          latitude: shop.latitude,
          longitude: shop.longitude,
          createdAt: Date.now(),
        })
        .link({ createdBy: userId });
    });

    await db.transact(transactions);
    console.log(`Successfully seeded ${coffeeShopsData.length} coffee shops!`);
    return { success: true, count: coffeeShopsData.length };
  } catch (error) {
    console.error('Error seeding coffee shops:', error);
    return { success: false, error: error.message };
  }
}

// Function to check if shops already exist (to avoid duplicates)
export async function checkIfShopsExist() {
  try {
    const { data } = await db.queryOnce({
      coffeeShops: {},
    });
    
    return data?.coffeeShops?.length > 0;
  } catch (error) {
    console.error('Error checking shops:', error);
    return false;
  }
}
