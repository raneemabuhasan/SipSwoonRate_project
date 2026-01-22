import { init, i } from '@instantdb/react';

const schema = i.schema({
  entities: {
    // Custom user data entity (separate from $users auth entity)
    users: i.entity({
      id: i.string().unique().indexed(), // Same as $users.id
      email: i.string().unique().indexed(),
      username: i.string().unique().indexed(),
      password: i.string(), // Will store hashed password
      profilePhotoUrl: i.string().optional(),
      rememberMeToken: i.string().optional(),
      resetToken: i.string().optional(),
      resetTokenExpiry: i.number().optional(),
    }),
    coffeeShops: i.entity({
      name: i.string(),
      location: i.string().optional(),
      latitude: i.number().optional(),
      longitude: i.number().optional(),
      createdAt: i.number(),
    }),
    reviews: i.entity({
      rating: i.number(),
      text: i.string().optional(),
      photoUrl: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number().optional(),
    }),
    favorites: i.entity({
      createdAt: i.number(),
    }),
    // Public entity for username lookups (can be queried without authentication)
    usernameLookups: i.entity({
      username: i.string().unique().indexed(),
      email: i.string().indexed(),
      userId: i.string().indexed(), // Reference to $users.id
    }),
  },
  links: {
    shopReviews: {
      forward: { on: 'reviews', has: 'one', label: 'shop' },
      reverse: { on: 'coffeeShops', has: 'many', label: 'reviews' },
    },
    reviewAuthor: {
      forward: { on: 'reviews', has: 'one', label: 'reviewer' },
      reverse: { on: 'users', has: 'many', label: 'reviews' },
    },
    shopCreator: {
      forward: { on: 'coffeeShops', has: 'one', label: 'createdBy' },
      reverse: { on: 'users', has: 'many', label: 'coffeeShops' },
    },
    userFavorites: {
      forward: { on: 'favorites', has: 'one', label: 'user' },
      reverse: { on: 'users', has: 'many', label: 'favorites' },
    },
    favoriteCoffeeShop: {
      forward: { on: 'favorites', has: 'one', label: 'coffeeShop' },
      reverse: { on: 'coffeeShops', has: 'many', label: 'favorites' },
    },
  },
});

const appId = import.meta.env.VITE_INSTANT_APP_ID;

if (!appId) {
  console.warn('VITE_INSTANT_APP_ID is not set. Please create a .env file with your Instant DB APP_ID.');
}

export const db = init({
  appId: appId || 'demo',
  schema,
  devtool: false, // Disable the DevTools panel
});

