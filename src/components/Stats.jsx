import React from 'react';
import { db } from '../db';
import { calculateAverageRating } from '../utils/helpers';

export default function Stats() {
  const { data, isLoading } = db.useQuery({
    coffeeShops: {},
    reviews: {},
  });

  if (isLoading) {
    return (
      <div className="stats-container">
        <div className="stat-card">
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  const shops = data?.coffeeShops || [];
  const reviews = data?.reviews || [];
  const avgRating = parseFloat(calculateAverageRating(reviews));
  const totalReviews = reviews.length;

  // Extract city from location string
  const extractCity = (location) => {
    if (!location) return 'Unknown Location';
    
    // Try to extract city from common address formats:
    // "123 Main St, City, State ZIP"
    // "City, State"
    // "City"
    const parts = location.split(',').map(part => part.trim());
    
    if (parts.length >= 2) {
      // If there are commas, the city is typically the second-to-last or before "CA", "MA", etc.
      return parts[parts.length - 2] || parts[0];
    }
    
    // If no commas, just return the whole location
    return parts[0] || 'Unknown Location';
  };

  // Group coffee shops by city
  const shopsByCity = shops.reduce((acc, shop) => {
    const city = extractCity(shop.location);
    if (!acc[city]) {
      acc[city] = 0;
    }
    acc[city]++;
    return acc;
  }, {});

  // Sort cities by shop count (descending)
  const sortedCities = Object.entries(shopsByCity)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 5); // Show top 5 cities

  return (
    <div className="stats-container">
      <div className="stat-card" style={{ gridColumn: 'span 2' }}>
        <div className="stat-label" style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
          Coffee Shops by Area
        </div>
        {sortedCities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedCities.map(([city, count]) => (
              <div
                key={city}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  background: '#f8fafc',
                  borderRadius: '6px',
                }}
              >
                <span style={{ fontWeight: '500', color: '#6F4E37' }}>{city}</span>
                <span style={{ fontWeight: '600', color: '#6F4E37', fontSize: '1.1rem' }}>
                  {count} {count === 1 ? 'shop' : 'shops'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontStyle: 'italic' }}>No coffee shops yet</div>
        )}
      </div>
      <div className="stat-card">
        <div className="stat-value">{totalReviews}</div>
        <div className="stat-label">Total Reviews</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}</div>
        <div className="stat-label">Average Rating</div>
      </div>
    </div>
  );
}

