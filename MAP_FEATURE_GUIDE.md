# 🗺️ Coffee Shop Map Feature Guide

## Overview

Your Coffee Rating App now includes a powerful map feature that shows coffee shops near your location! You can view shops on an interactive map, see distances, and discover new places to visit.

## ✨ New Features

### 1. **Interactive Map View**
- Toggle between **List View** (📋) and **Map View** (🗺️)
- See all coffee shops with location data on an OpenStreetMap
- Blue marker = Your current location
- Red markers = Coffee shops

### 2. **Location-Based Search**
- Automatically detects your current location
- Shows distance from you to each coffee shop
- Filter by distance: 5, 10, 25, 50 miles, or show all

### 3. **Rich Shop Information**
- Click any marker to see shop details:
  - Shop name and address
  - Average rating with star display
  - Number of reviews
  - Distance from your location

### 4. **Nearby Shops List**
- Shows top 10 nearest coffee shops below the map
- Sorted by distance from your location
- Quick overview with ratings and review counts

### 5. **Add Shops with Coordinates**
When adding a new coffee shop:
- Enter the full address
- Click "📍 Auto-find coordinates" to automatically get lat/long
- Or manually enter latitude and longitude
- Shops with coordinates appear on the map!

## 🚀 How to Use

### Viewing the Map

1. **Start the app**: `npm run dev`
2. **Sign in** to your account
3. **Click "🗺️ Map View"** button at the top
4. **Allow location access** when prompted by your browser
5. The map will center on your location and show nearby shops

### Adding Coffee Shops with Location

1. Click **"+ Add Coffee Shop & Review"**
2. Fill in the shop name
3. Enter the **full address** (e.g., "123 Main St, San Francisco, CA")
4. Click **"📍 Auto-find coordinates from address"**
5. The latitude and longitude will be filled automatically
6. Complete your review and submit
7. The shop will now appear on the map!

### Filtering by Distance

Use the dropdown menu to filter shops:
- **5 miles** - Very close shops only
- **10 miles** - Default setting
- **25 miles** - Wider area
- **50 miles** - Regional view
- **All shops** - See everything regardless of distance

## 📍 Pre-populating Coffee Shops

Want to add sample coffee shops to test the map feature? Here's how:

### Option 1: Using the Browser Console

1. Open your app in the browser
2. Sign in to your account
3. Open the browser's Developer Console (F12 or Cmd+Option+I on Mac)
4. Run this command:

```javascript
// Import the seed function
import('/src/utils/seedCoffeeShops.js').then(async (module) => {
  // Get your user ID
  const userId = window.db.auth.user.id;
  
  // Check if shops already exist
  const hasShops = await module.checkIfShopsExist();
  
  if (hasShops) {
    console.log('Coffee shops already exist in database');
  } else {
    // Seed the shops
    const result = await module.seedCoffeeShops(userId);
    console.log(result);
    
    // Refresh the page to see the new shops
    window.location.reload();
  }
});
```

### Option 2: Via InstantDB Dashboard

1. Go to your InstantDB dashboard
2. Navigate to the `coffeeShops` table
3. Add shops manually with these fields:
   - `name`: Shop name
   - `location`: Full address
   - `latitude`: Decimal number (e.g., 37.7749)
   - `longitude`: Decimal number (e.g., -122.4194)
   - `createdAt`: Current timestamp
   - `createdBy`: Your user ID

### Sample Coffee Shops Included

The seed data includes 24 verified open coffee shops across major US cities:
- **San Francisco** (5 shops) - Blue Bottle, Philz, Sightglass, Ritual, Flywheel
- **Los Angeles** (4 shops) - Intelligentsia, Blue Bottle, Verve, Go Get Em Tiger
- **New York** (4 shops) - Blue Bottle, Stumptown, La Colombe, Café Grumpy
- **Seattle** (4 shops) - Espresso Vivace, Slate, Victrola, Analog Coffee
- **Portland** (4 shops) - Stumptown, Coava, Heart, Barista
- **Chicago** (3 shops) - Intelligentsia locations, Colectivo

✅ All verified open locations (no Starbucks, no permanently closed shops)
📍 All with real addresses and GPS coordinates!

## 🔧 Technical Details

### Location Services

The app uses:
- **Browser Geolocation API** - Gets your current location
- **Nominatim (OpenStreetMap)** - Free geocoding service for addresses
- **Haversine Formula** - Calculates distances between coordinates
- **Leaflet + React-Leaflet** - Interactive map display (no API key needed!)

### Privacy

- Location access is requested only when you view the map
- Your location is never stored or sent to any server
- All distance calculations happen in your browser
- You can deny location access and still use the app (just won't see distances)

### Database Schema

Coffee shops now include:
```javascript
{
  name: string,
  location: string (optional),
  latitude: number (optional),
  longitude: number (optional),
  createdAt: number,
  // Relations:
  createdBy: user,
  reviews: [review]
}
```

## 📱 Mobile Support

The map works great on mobile devices:
- Responsive design adapts to small screens
- Touch gestures for zooming and panning
- Location services work on mobile browsers
- Optimized view toggle buttons

## 🎯 Tips & Tricks

### For Best Results:

1. **Add Full Addresses** - Include street, city, and state for accurate geocoding
2. **Test Your Location** - Make sure your browser has location permissions enabled
3. **Zoom In/Out** - Use mouse wheel or pinch gestures to explore the map
4. **Click Markers** - Get detailed info about each shop
5. **Use Distance Filter** - Narrow down to shops you can actually visit

### Troubleshooting:

**Map not showing your location?**
- Check browser permissions for location access
- Try refreshing the page
- Make sure you're using HTTPS (required for geolocation)

**Coordinates not found for address?**
- Make sure the address is complete and valid
- Try adding more details (street number, zip code)
- You can manually enter coordinates from Google Maps

**Shops not appearing on map?**
- Shops need latitude and longitude to appear on the map
- Re-add shops with the new geocoding feature
- Use the seed data to add sample shops

## 🌟 Future Enhancements

Possible features to add:
- Directions to selected shop
- Cluster markers when zoomed out
- Search shops by name on map
- Save favorite locations
- Share shop locations
- Custom map pins with ratings
- Street view integration

## 📚 Resources

- [Leaflet Documentation](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim Geocoding](https://nominatim.org/)
- [React-Leaflet Guide](https://react-leaflet.js.org/)

---

**Enjoy exploring coffee shops near you! ☕🗺️**
