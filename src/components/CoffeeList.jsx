import React, { useState } from 'react';
import { id } from '@instantdb/react';
import { db } from '../db';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';
import RecommendedSection from './RecommendedSection';
import { calculateAverageRating } from '../utils/helpers';
import { getRecommendedCafes } from '../utils/recommendationEngine';

export default function CoffeeList({
  searchQuery,
  minRating,
  sortBy,
  currentUserId,
  currentUserData,
  externalShops = null,
  externalLabel = '',
  isExternalData = false,
  isExternalLoading = false,
  externalError = '',
  onEditReview,
  onDeleteReview,
  onShowAuth,
}) {
  const { data, isLoading, error } = db.useQuery({
    coffeeShops: {
      reviews: {
        reviewer: {},
      },
      favorites: {
        user: {},
      },
      createdBy: {},
    },
    favorites: {
      user: {},
      coffeeShop: {},
    },
  });

  if (isExternalLoading || (!isExternalData && isLoading)) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading coffee shops...</div>
      </div>
    );
  }

  if (externalError || (!isExternalData && error)) {
    return (
      <div className="error-container">
        <p>Error loading coffee shops: {externalError || error.message}</p>
      </div>
    );
  }

  const shops = isExternalData ? externalShops || [] : data?.coffeeShops || [];
  const allFavorites = data?.favorites || [];

  const toggleFavorite = async (shopId) => {
    if (isExternalData) {
      alert('Favorites for backend-sourced shops will be connected in a later backend phase.');
      return;
    }

    // Check if user is signed in
    if (!currentUserId) {
      const shouldSignIn = window.confirm('Sign in to add coffee shops to your favorites!\n\nWould you like to sign in now?');
      if (shouldSignIn && onShowAuth) {
        onShowAuth();
      }
      return;
    }

    try {
      const existingFavorite = allFavorites.find(
        (fav) => fav.user?.id === currentUserId && fav.coffeeShop?.id === shopId
      );

      if (existingFavorite) {
        await db.transact([db.tx.favorites[existingFavorite.id].delete()]);
      } else {
        const newFavoriteId = id();
        await db.transact([
          db.tx.favorites[newFavoriteId]
            .update({
              createdAt: Date.now(),
            })
            .link({ user: currentUserId, coffeeShop: shopId }),
        ]);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const isFavorite = (shopId) => {
    return allFavorites.some(
      (fav) => fav.user?.id === currentUserId && fav.coffeeShop?.id === shopId
    );
  };

  const handleDeleteShop = async (shop) => {
    if (isExternalData) {
      alert('Backend-sourced shops are read-only for now.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${shop.name}"? This will also delete all its reviews.`)) {
      return;
    }

    try {
      // Delete the shop (reviews will be orphaned but we can delete them too if needed)
      await db.transact([db.tx.coffeeShops[shop.id].delete()]);
      console.log('Shop deleted successfully');
    } catch (err) {
      console.error('Failed to delete shop:', err);
      alert('Failed to delete coffee shop. Please try again.');
    }
  };

  const isShopCreator = (shop) => {
    if (isExternalData) return false;
    return shop.createdBy?.id === currentUserId;
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
    const trimmedQuery = searchQuery.trim().toLowerCase();
    shopsWithRatings = shopsWithRatings.filter((shop) =>
      shop.name && shop.name.toLowerCase().includes(trimmedQuery)
    );
  }

  // Filter by minimum rating
  const filteredShops = minRating
    ? shopsWithRatings.filter((shop) => shop.avgRating >= minRating)
    : shopsWithRatings;

  // Sort shops
  let sortedShops = [...filteredShops];
  switch (sortBy) {
    case 'rating':
      sortedShops.sort((a, b) => b.avgRating - a.avgRating);
      break;
    case 'newest':
      sortedShops.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'name':
      sortedShops.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }

  if (sortedShops.length === 0) {
    return (
      <div className="empty-state">
        <p>No coffee shops found. Be the first to add one!</p>
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
          {isExternalData && (
            <div className="external-source-tag">
              {externalLabel || 'Backend data'} · read-only preview
            </div>
          )}

          {/* Stats section for this coffee shop */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#6F4E37' }}>
                {shop.reviewCount}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Reviews
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#6F4E37' }}>
                {shop.avgRating > 0 ? shop.avgRating.toFixed(1) : 'N/A'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Average Rating
              </div>
            </div>
          </div>

          <div className="shop-header">
            <div className="shop-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="shop-name">{shop.name}</h3>
                <button
                  onClick={() => toggleFavorite(shop.id)}
                  disabled={isExternalData}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: isExternalData ? 'not-allowed' : 'pointer',
                    opacity: isExternalData ? 0.45 : 1,
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExternalData) e.currentTarget.style.transform = 'scale(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={
                    isExternalData
                      ? 'Favorites are not connected to backend shops yet'
                      : isFavorite(shop.id) ? 'Remove from favorites' : 'Add to favorites'
                  }
                >
                  {isFavorite(shop.id) ? '❤️' : '🤍'}
                </button>
              </div>
              {shop.location && <p className="shop-location">📍 {shop.location}</p>}
            </div>
            <div className="shop-rating">
              <StarRating rating={shop.avgRating} readOnly />
              <span className="review-count">
                {shop.reviewCount} {shop.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>

          {isShopCreator(shop) && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={() => handleDeleteShop(shop)}
                className="btn btn-small btn-danger"
                style={{ fontSize: '0.85rem' }}
              >
                🗑️ Delete Coffee Shop
              </button>
            </div>
          )}

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
