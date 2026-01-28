import React, { useState, useEffect } from 'react';
import { id } from '@instantdb/react';
import { db } from '../db';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';
import { hashPassword, validateUsername, validatePassword } from '../utils/auth';

export default function Profile({ onClose }) {
  const { user } = db.useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [username, setUsername] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // For adding username/password to Google accounts
  const [showAddCredentials, setShowAddCredentials] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
  const isGoogleUser = currentUserData?.authProvider === 'google';
  const hasPassword = !!currentUserData?.password;

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setProfilePhotoPreview(user.profilePhotoUrl || '');
    }
  }, [user]);

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
      if (!username.trim()) {
        setError('Username is required');
        return;
      }

      await db.transact([
        db.tx.$users[user.id].update({
          username: username.trim(),
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

  const handleAddCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Validate username
      const usernameError = validateUsername(newUsername);
      if (usernameError) {
        setError(usernameError);
        setLoading(false);
        return;
      }

      // Validate password
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        setError(passwordError);
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Check if username already exists
      const { data: existingUsers } = await db.queryOnce({
        users: {
          $: {
            where: {
              username: newUsername,
            },
          },
        },
      });

      if (existingUsers.users && existingUsers.users.length > 0) {
        setError('Username already taken');
        setLoading(false);
        return;
      }

      // Hash the password
      const hashedPassword = await hashPassword(newPassword);

      // Update user with username and password
      const lookupId = id();
      await db.transact([
        db.tx.users[user.id].update({
          username: newUsername.trim(),
          password: hashedPassword,
        }),
        db.tx.usernameLookups[lookupId].update({
          username: newUsername.trim(),
          email: user.email,
          userId: user.id,
        }),
      ]);

      setMessage('Username and password added successfully! You can now sign in with either Google or your username/password.');
      setShowAddCredentials(false);
      setNewUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to add credentials');
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
                Username {isGoogleUser && !currentUserData?.username && '(Optional for Google users)'}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isGoogleUser && !currentUserData?.username ? "Add username (optional)" : "Enter your username"}
                required={!isGoogleUser}
                disabled={loading}
              />
              {isGoogleUser && !currentUserData?.username && (
                <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  You can add a username here or use the "Add Username & Password" section below
                </small>
              )}
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

        {activeTab === 'profile' && isGoogleUser && !hasPassword && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#FFF8E7',
            borderRadius: '12px',
            border: '2px solid #C9A961',
          }}>
            <h3 style={{ color: '#6F4E37', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔐 Add Username & Password
            </h3>
            <p style={{ color: '#8D7B6D', marginBottom: '1rem', fontSize: '0.95rem' }}>
              You're currently signing in with Google. Add a username and password to enable traditional sign-in as a backup option.
            </p>
            
            {!showAddCredentials ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddCredentials(true)}
                style={{ marginTop: '0.5rem' }}
              >
                + Add Username & Password
              </button>
            ) : (
              <form onSubmit={handleAddCredentials} style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="newUsername">Username</label>
                  <input
                    id="newUsername"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    disabled={loading}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    3-20 characters, letters, numbers, and underscores only
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    disabled={loading}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    At least 8 characters, with uppercase, lowercase, and number
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                  />
                </div>

                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddCredentials(false);
                      setError('');
                      setNewUsername('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'profile' && isGoogleUser && hasPassword && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#E8F5E9',
            borderRadius: '12px',
            border: '2px solid #81C784',
          }}>
            <h3 style={{ color: '#2E7D32', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✅ Multiple Sign-In Options Enabled
            </h3>
            <p style={{ color: '#558B2F', fontSize: '0.95rem', margin: 0 }}>
              You can sign in with either Google or your username/password.
            </p>
          </div>
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
