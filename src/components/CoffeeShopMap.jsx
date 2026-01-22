import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getUserLocation, getShopsByDistance, formatDistance } from '../utils/location';
import StarRating from './StarRating';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const coffeeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to re-center map when location changes
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function CoffeeShopMap({ coffeeShops }) {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyShops, setNearbyShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [maxDistance, setMaxDistance] = useState(10); // miles
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]); // Default: San Francisco

  useEffect(() => {
    const loadUserLocation = async () => {
      try {
        setLoading(true);
        setError('');
        const location = await getUserLocation();
        setUserLocation(location);
        setMapCenter([location.latitude, location.longitude]);
        
        // Calculate distances and filter shops
        const nearby = getShopsByDistance(coffeeShops, location, maxDistance);
        setNearbyShops(nearby);
      } catch (err) {
        setError(err.message);
        // Still show all shops even without user location
        setNearbyShops(coffeeShops.filter(shop => shop.latitude && shop.longitude));
      } finally {
        setLoading(false);
      }
    };

    loadUserLocation();
  }, [coffeeShops, maxDistance]);

  const calculateAverageRating = (shop) => {
    if (!shop.reviews || shop.reviews.length === 0) return 0;
    const sum = shop.reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / shop.reviews.length;
  };

  if (loading) {
    return (
      <div className="map-loading">
        <p>Loading map and your location...</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-controls">
        <div className="map-info">
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {userLocation && (
            <p className="location-info">
              📍 Showing {nearbyShops.length} coffee shop{nearbyShops.length !== 1 ? 's' : ''} near you
            </p>
          )}
        </div>
        
        <div className="distance-filter">
          <label htmlFor="maxDistance">Show within:</label>
          <select
            id="maxDistance"
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="distance-select"
          >
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
            <option value={999999}>All shops</option>
          </select>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '600px', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={mapCenter} />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userIcon}
          >
            <Popup>
              <strong>Your Location</strong>
            </Popup>
          </Marker>
        )}

        {/* Coffee shop markers */}
        {nearbyShops.map((shop) => {
          if (!shop.latitude || !shop.longitude) return null;
          const avgRating = calculateAverageRating(shop);
          
          return (
            <Marker
              key={shop.id}
              position={[shop.latitude, shop.longitude]}
              icon={coffeeIcon}
            >
              <Popup>
                <div className="map-popup">
                  <h3>{shop.name}</h3>
                  {shop.location && <p className="popup-location">📍 {shop.location}</p>}
                  <div className="popup-rating">
                    <StarRating rating={avgRating} readOnly size="small" />
                    <span className="popup-review-count">
                      ({shop.reviews?.length || 0} reviews)
                    </span>
                  </div>
                  {shop.distance && (
                    <p className="popup-distance">🚶 {formatDistance(shop.distance)} away</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* List of nearby shops */}
      {nearbyShops.length > 0 && (
        <div className="nearby-shops-list">
          <h3>Nearby Coffee Shops</h3>
          <div className="shops-list">
            {nearbyShops.slice(0, 10).map((shop) => {
              const avgRating = calculateAverageRating(shop);
              return (
                <div key={shop.id} className="shop-list-item">
                  <div className="shop-list-info">
                    <h4>{shop.name}</h4>
                    {shop.location && <p className="shop-list-location">{shop.location}</p>}
                    <div className="shop-list-meta">
                      <StarRating rating={avgRating} readOnly size="small" />
                      <span className="shop-list-reviews">
                        {shop.reviews?.length || 0} reviews
                      </span>
                    </div>
                  </div>
                  {shop.distance && (
                    <div className="shop-list-distance">
                      {formatDistance(shop.distance)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
