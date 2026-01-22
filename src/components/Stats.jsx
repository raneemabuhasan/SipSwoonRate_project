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
  const totalShops = shops.length;
  const totalReviews = reviews.length;

  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-value">{totalShops}</div>
        <div className="stat-label">Coffee Shops</div>
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

