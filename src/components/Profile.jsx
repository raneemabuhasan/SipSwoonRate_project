import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCurrentUserFavorites,
  getCurrentUserReviews,
  removeFavorite,
  updateCurrentUserProfile,
} from '../utils/backendApi';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';
import CafeNameText from './CafeNameText';

function getBackendMessage(error) {
  return error.message?.replace(/^Backend request failed: \d+\s-\s/, '') || '';
}

export default function Profile({ onClose }) {
  const { user, accessToken, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [username, setUsername] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadProfileData = async () => {
    if (!accessToken) return;

    setDataLoading(true);
    try {
      const [reviewsResponse, favoritesResponse] = await Promise.all([
        getCurrentUserReviews(accessToken),
        getCurrentUserFavorites(accessToken),
      ]);
      setReviews(reviewsResponse.data || []);
      setFavorites(favoritesResponse.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load profile data');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    setUsername(profile?.username || '');
    setProfilePhotoPreview(profile?.profilePhotoUrl || '');
  }, [profile]);

  useEffect(() => {
    loadProfileData();
  }, [accessToken]);

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await updateCurrentUserProfile(accessToken, {
        username: username.trim() || undefined,
        profilePhotoUrl: profilePhotoPreview || undefined,
      });
      await refreshProfile();
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(getBackendMessage(err) || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (shop) => {
    try {
      await removeFavorite(accessToken, shop.postgresId);
      await loadProfileData();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      setError(err.message || 'Failed to remove favorite');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: '800px' }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h2>My Profile</h2>
          <div className="profile-tabs" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderBottom: '2px solid #e2e8f0' }}>
            {[
              ['profile', 'Profile Settings'],
              ['reviews', `My Reviews (${reviews.length})`],
              ['favorites', `Favorites (${favorites.length})`],
            ].map(([tab, label]) => (
              <button
                key={tab}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab ? '2px solid #6F4E37' : 'none',
                  color: activeTab === tab ? '#6F4E37' : '#64748b',
                  fontWeight: activeTab === tab ? '600' : '400',
                  marginBottom: '-2px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

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
              <label htmlFor="username">Username (Optional)</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Add a display name (optional)"
                disabled={loading}
              />
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
                Upload Profile Photo
              </button>
              {profilePhotoPreview && (
                <div style={{ marginTop: '1rem' }}>
                  <img
                    src={profilePhotoPreview}
                    alt="Profile"
                    style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>

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
            {dataLoading ? (
              <div className="loading-spinner">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="empty-state">
                <p>You haven't written any reviews yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.map((review) => (
                  <div key={review.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#6F4E37' }}>
                      {review.shop?.name || 'Unknown Shop'}
                    </h4>
                    <ReviewCard review={review} currentUserId={user?.id} onEdit={() => {}} onDelete={() => {}} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            {dataLoading ? (
              <div className="loading-spinner">Loading favorites...</div>
            ) : favorites.length === 0 ? (
              <div className="empty-state">
                <p>You haven't added any favorites yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {favorites.map((favorite) => {
                  const shop = favorite.coffeeShop;
                  if (!shop) return null;

                  return (
                    <div key={favorite.id} className="coffee-shop-card">
                      <div className="shop-header">
                        <div className="shop-info">
                          <h3 className="shop-name"><CafeNameText name={shop.name} /></h3>
                          {shop.location && <p className="shop-location">📍 {shop.location}</p>}
                        </div>
                        <div className="shop-rating">
                          <StarRating rating={0} readOnly />
                          <span className="review-count">Saved cafe</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleRemoveFavorite(shop)}
                        style={{ marginTop: '1rem' }}
                      >
                        Remove from Favorites
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
