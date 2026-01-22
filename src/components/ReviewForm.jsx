import React, { useState, useEffect } from 'react';
import { id } from '@instantdb/react';
import { db } from '../db';
import StarRating from './StarRating';
import { geocodeAddress } from '../utils/location';

export default function ReviewForm({ coffeeShop, review, onCancel, onSuccess }) {
  const { user } = db.useAuth();
  const [shopName, setShopName] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [isCreatingShop, setIsCreatingShop] = useState(!coffeeShop);

  useEffect(() => {
    if (coffeeShop) {
      setShopName(coffeeShop.name);
      setLocation(coffeeShop.location || '');
      setLatitude(coffeeShop.latitude || '');
      setLongitude(coffeeShop.longitude || '');
      setIsCreatingShop(false);
    }
    if (review) {
      setRating(review.rating);
      setText(review.text || '');
      setPhotoPreview(review.photoUrl || '');
    }
  }, [coffeeShop, review]);

  const handleGeocodeAddress = async () => {
    if (!location.trim()) {
      setError('Please enter an address first');
      return;
    }

    setGeocoding(true);
    setError('');

    try {
      const coords = await geocodeAddress(location);
      setLatitude(coords.latitude.toString());
      setLongitude(coords.longitude.toString());
      setError('');
    } catch (err) {
      setError('Could not find coordinates for this address. You can enter them manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user || !user.id) {
        throw new Error('You must be signed in to submit a review');
      }
      const userId = user.id;

      if (isCreatingShop && !shopName.trim()) {
        throw new Error('Coffee shop name is required');
      }

      if (rating === 0) {
        throw new Error('Please select a rating');
      }

      if (review) {
        // Update existing review
        await db.transact([
          db.tx.reviews[review.id].update({
            rating,
            text: text.trim() || undefined,
            photoUrl: photoPreview || undefined,
            updatedAt: Date.now(),
          }),
        ]);
      } else {
        // Create new review
        let shopId = coffeeShop?.id;

        if (isCreatingShop) {
          // Create shop and review together in one transaction
          const newShopId = id();
          const newReviewId = id();
          
          const shopData = {
            name: shopName.trim(),
            location: location.trim() || undefined,
            createdAt: Date.now(),
          };

          // Add coordinates if provided
          if (latitude && longitude) {
            shopData.latitude = parseFloat(latitude);
            shopData.longitude = parseFloat(longitude);
          }

          await db.transact([
            db.tx.coffeeShops[newShopId].update(shopData).link({ createdBy: userId }),
            db.tx.reviews[newReviewId].update({
              rating,
              text: text.trim() || undefined,
              photoUrl: photoPreview || undefined,
              createdAt: Date.now(),
            }).link({ shop: newShopId, reviewer: userId }),
          ]);
        } else {
          // Create review for existing shop
          if (!shopId) {
            throw new Error('Coffee shop is required');
          }
          const newReviewId = id();
          await db.transact([
            db.tx.reviews[newReviewId].update({
              rating,
              text: text.trim() || undefined,
              photoUrl: photoPreview || undefined,
              createdAt: Date.now(),
            }).link({ shop: shopId, reviewer: userId }),
          ]);
        }
      }

      if (onSuccess) onSuccess();
      // Reset form
      setShopName('');
      setLocation('');
      setRating(0);
      setText('');
      setPhoto(null);
      setPhotoPreview('');
      setIsCreatingShop(false);
    } catch (err) {
      setError(err.message || 'Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-form-container">
      <form onSubmit={handleSubmit} className="review-form">
        <h2>{review ? 'Edit Review' : isCreatingShop ? 'Add Coffee Shop & Review' : 'Add Review'}</h2>

        {isCreatingShop && (
          <>
            <div className="form-group">
              <label htmlFor="shopName">Coffee Shop Name *</label>
              <input
                id="shopName"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g., Blue Bottle Coffee"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="location">Location (optional)</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., 123 Main St, San Francisco, CA"
                disabled={loading}
              />
              <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Enter full address to auto-find coordinates
              </small>
            </div>

            <div className="form-group">
              <label>Coordinates (for map display)</label>
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={loading || geocoding || !location.trim()}
                className="btn btn-secondary"
                style={{ marginBottom: '0.5rem' }}
              >
                {geocoding ? '🔍 Finding coordinates...' : '📍 Auto-find coordinates from address'}
              </button>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Latitude"
                    disabled={loading}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Longitude"
                    disabled={loading}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Optional: Helps show shop on map
              </small>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Rating *</label>
          <StarRating rating={rating} onRatingChange={setRating} />
        </div>

        <div className="form-group">
          <label htmlFor="reviewText">Review (optional)</label>
          <textarea
            id="reviewText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts about this coffee..."
            rows="4"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="photo">Photo (optional)</label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            disabled={loading}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => document.getElementById('photo').click()}
              disabled={loading}
            >
              📷 Upload Photo
            </button>
            {photoPreview && (
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={removePhoto}
                disabled={loading}
              >
                Remove Photo
              </button>
            )}
          </div>
          {photoPreview && (
            <div style={{ marginTop: '1rem' }}>
              <img
                src={photoPreview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading || rating === 0}>
            {loading ? 'Saving...' : review ? 'Update Review' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}

