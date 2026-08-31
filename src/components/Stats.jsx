import React from 'react';
import { calculateAverageRating } from '../utils/helpers';

export default function Stats({ coffeeShops = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="stats-container">
        <div className="stat-card">
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  const reviews = coffeeShops.flatMap((shop) => shop.reviews || []);
  const avgRating = parseFloat(calculateAverageRating(reviews));
  const totalReviews = reviews.length;

  const extractCity = (location) => {
    if (!location) return 'Unknown Location';
    const parts = location.split(',').map((part) => part.trim());
    return parts.length >= 2 ? parts[parts.length - 2] || parts[0] : parts[0] || 'Unknown Location';
  };

  const shopsByCity = coffeeShops.reduce((acc, shop) => {
    const city = extractCity(shop.location);
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  const sortedCities = Object.entries(shopsByCity)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 5);

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
