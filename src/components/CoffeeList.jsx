import React, { useState } from 'react';
import CafeNameText from './CafeNameText';
import ReviewCard from './ReviewCard';
import RecommendedSection from './RecommendedSection';
import { calculateAverageRating, searchTextIncludes } from '../utils/helpers';
import { getRecommendedCafes } from '../utils/recommendationEngine';
import { addFavorite, removeFavorite } from '../utils/backendApi';

export default function CoffeeList({
  searchQuery,
  minRating,
  currentUserId,
  currentUserData,
  shops = [],
  isLoading = false,
  error = '',
  accessToken,
  onEditReview,
  onDeleteReview,
  onAddReview,
  onRefresh,
  onShowAuth,
}) {
  const [favoriteLoading, setFavoriteLoading] = useState(null);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading coffee shops...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading coffee shops: {error}</p>
      </div>
    );
  }

  const toggleFavorite = async (shopId) => {
    if (!currentUserId || !accessToken) {
      const shouldSignIn = window.confirm('Sign in to add coffee shops to your favorites!\n\nWould you like to sign in now?');
      if (shouldSignIn && onShowAuth) {
        onShowAuth();
      }
      return;
    }

    try {
      setFavoriteLoading(shopId);
      const shop = shops.find((item) => item.id === shopId || item.postgresId === shopId);
      const cafeId = shop?.postgresId || shopId;

      if (shop?.isFavorite) {
        await removeFavorite(accessToken, cafeId);
      } else {
        await addFavorite(accessToken, cafeId);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert(err.message || 'Failed to update favorite. Please try again.');
    } finally {
      setFavoriteLoading(null);
    }
  };

  const isFavorite = (shopId) => {
    const shop = shops.find((item) => item.id === shopId || item.postgresId === shopId);
    return Boolean(shop?.isFavorite);
  };

  // Calculate average ratings for each shop
  let shopsWithRatings = shops.map((shop) => {
    // Use the nested reviews from the shop query (auto-updates on delete)
    const shopReviews = shop.reviews || [];
    const avgRating = parseFloat(calculateAverageRating(shopReviews));
    return {
      ...shop,
      reviews: shopReviews,
      avgRating,
      reviewCount: shopReviews.length,
    };
  });

  // Filter by search query
  if (searchQuery && searchQuery.trim()) {
    shopsWithRatings = shopsWithRatings.filter((shop) =>
      searchTextIncludes(shop.name, searchQuery)
    );
  }

  // Filter by minimum rating
  const filteredShops = minRating
    ? shopsWithRatings.filter((shop) => shop.avgRating >= minRating)
    : shopsWithRatings;
  const sortedShops = filteredShops;

  if (sortedShops.length === 0) {
    return (
      <div className="empty-state">
        <p>No coffee shops found.</p>
      </div>
    );
  }

  // Get recommendations if user has preferences
  const userPreferences = currentUserData?.preferences;
  const hasPreferences = currentUserData?.questionnaireCompleted && userPreferences;
  const recommendedCafes = hasPreferences 
    ? getRecommendedCafes(userPreferences, sortedShops, 5)
    : [];

  return (
    <div className="coffee-list">
      {/* Recommended Section */}
      {hasPreferences && recommendedCafes.length > 0 && (
        <RecommendedSection 
          recommendedCafes={recommendedCafes}
          userPreferences={userPreferences}
        />
      )}

      {/* All Cafes */}
      {sortedShops.map((shop) => (
        <div key={shop.id} className="coffee-shop-card">
          <div className="shop-header">
            <div className="shop-info">
              <h3 className="shop-name"><CafeNameText name={shop.name} /></h3>
              {shop.location && <p className="shop-location">{shop.location}</p>}
            </div>
          </div>

          <div className="shop-meta">
            {Number.isFinite(shop.distance) && <span>{shop.distance.toFixed(1)} mi</span>}
            <span>{shop.reviewCount} {shop.reviewCount === 1 ? 'review' : 'reviews'}</span>
            <span>{shop.avgRating > 0 ? `${shop.avgRating.toFixed(1)} avg` : 'No ratings yet'}</span>
          </div>

          <div className="shop-card-actions">
            <div className="shop-action-buttons">
              <button
                className="favorite-button"
                onClick={() => toggleFavorite(shop.id)}
                disabled={favoriteLoading === shop.id}
                title={
                  isFavorite(shop.id) ? 'Remove from favorites' : 'Add to favorites'
                }
              >
                {isFavorite(shop.id) ? '♥' : '♡'}
              </button>

              <button
                onClick={() => onAddReview(shop)}
                className="btn btn-small btn-primary"
              >
                Add Review
              </button>
            </div>
          </div>

          {shop.reviews.length > 0 && (
            <div className="shop-reviews">
              <h4>Reviews</h4>
              {shop.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={currentUserId}
                  onEdit={onEditReview}
                  onDelete={onDeleteReview}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
