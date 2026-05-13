import React, { useState, useEffect } from 'react';
import { id } from '@instantdb/react';
import { db } from '../db';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';

export default function Profile({ onClose }) {
  const { user } = db.useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [username, setUsername] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { data } = db.useQuery({
    reviews: {
      reviewer: {},
      shop: {},
    },
    favorites: {
      user: {},
      coffeeShop: {
        reviews: {},
      },
    },
  });

  // Query user data to check auth provider
  const { data: userData } = db.useQuery(
    user?.id ? {
      users: {
        $: {
          where: {
            id: user.id,
          },
        },
      },
    } : null
  );

  const currentUserData = userData?.users?.[0];

  useEffect(() => {
    if (currentUserData) {
      setUsername(currentUserData.username || '');
      setProfilePhotoPreview(currentUserData.profilePhotoUrl || '');
    }
  }, [currentUserData]);

  const myReviews = data?.reviews?.filter((review) => review.reviewer?.id === user?.id) || [];
  const myFavorites = data?.favorites?.filter((fav) => fav.user?.id === user?.id) || [];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await db.transact([
        db.tx.users[user.id].merge({
          username: username.trim() || undefined,
          profilePhotoUrl: profilePhotoPreview || undefined,
        }),
      ]);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (shopId) => {
    try {
      const existingFavorite = myFavorites.find(
        (fav) => fav.coffeeShop?.id === shopId
      );

      if (existingFavorite) {
        // Remove from favorites
        await db.transact([db.tx.favorites[existingFavorite.id].delete()]);
      } else {
        // Add to favorites
        const newFavoriteId = id();
        await db.transact([
          db.tx.favorites[newFavoriteId]
            .update({
              createdAt: Date.now(),
            })
            .link({ user: user.id, coffeeShop: shopId }),
        ]);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const isFavorite = (shopId) => {
    return myFavorites.some((fav) => fav.coffeeShop?.id === shopId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px' }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h2>My Profile</h2>
          <div className="profile-tabs" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderBottom: '2px solid #e2e8f0' }}>
            <button
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'profile' ? '2px solid #6F4E37' : 'none',
                color: activeTab === 'profile' ? '#6F4E37' : '#64748b',
                fontWeight: activeTab === 'profile' ? '600' : '400',
                marginBottom: '-2px',
              }}
            >
              Profile Settings
            </button>
            <button
              className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'reviews' ? '2px solid #6F4E37' : 'none',
                color: activeTab === 'reviews' ? '#6F4E37' : '#64748b',
                fontWeight: activeTab === 'reviews' ? '600' : '400',
                marginBottom: '-2px',
              }}
            >
              My Reviews ({myReviews.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'favorites' ? '2px solid #6F4E37' : 'none',
                color: activeTab === 'favorites' ? '#6F4E37' : '#64748b',
                fontWeight: activeTab === 'favorites' ? '600' : '400',
                marginBottom: '-2px',
              }}
            >
              Favorites ({myFavorites.length})
            </button>
          </div>
        </div>

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                style={{ backgroundColor: '#f8fafc' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">
                Username (Optional)
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Add a display name (optional)"
                disabled={loading}
              />
              <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Optional display name for your profile
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="profilePhoto">Profile Photo (optional)</label>
              <input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={loading}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => document.getElementById('profilePhoto').click()}
                disabled={loading}
              >
                📷 Upload Profile Photo
              </button>
              {profilePhotoPreview && (
                <div style={{ marginTop: '1rem' }}>
                  <img
                    src={profilePhotoPreview}
                    alt="Profile"
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Close
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'reviews' && (
          <div>
            {myReviews.length === 0 ? (
              <div className="empty-state">
                <p>You haven't written any reviews yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myReviews.map((review) => (
                  <div key={review.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#6F4E37' }}>
                      {review.shop?.name || 'Unknown Shop'}
                    </h4>
                    <ReviewCard
                      review={review}
                      currentUserId={user?.id}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            {myFavorites.length === 0 ? (
              <div className="empty-state">
                <p>You haven't added any favorites yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myFavorites.map((fav) => {
                  const shop = fav.coffeeShop;
                  if (!shop) return null;
                  const shopReviews = shop.reviews || [];
                  const avgRating = shopReviews.length > 0
                    ? shopReviews.reduce((sum, r) => sum + r.rating, 0) / shopReviews.length
                    : 0;
                  
                  return (
                    <div key={fav.id} className="coffee-shop-card">
                      <div className="shop-header">
                        <div className="shop-info">
                          <h3 className="shop-name">{shop.name}</h3>
                          {shop.location && <p className="shop-location">📍 {shop.location}</p>}
                        </div>
                        <div className="shop-rating">
                          <StarRating rating={avgRating} readOnly />
                          <span className="review-count">
                            {shopReviews.length} {shopReviews.length === 1 ? 'review' : 'reviews'}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => toggleFavorite(shop.id)}
                        style={{ marginTop: '1rem' }}
                      >
                        💔 Remove from Favorites
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
