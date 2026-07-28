import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createCafeReview, updateCafeReview } from '../utils/backendApi';
import StarRating from './StarRating';

export default function ReviewForm({ coffeeShop, review, onCancel, onSuccess }) {
  const { user, accessToken } = useAuth();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setText(review.text || '');
      setPhotoPreview(review.photoUrl || '');
    }
  }, [review]);

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
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

  const getCafeId = () => coffeeShop?.postgresId || coffeeShop?.cafeId || coffeeShop?.id;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user || !accessToken) {
        throw new Error('You must be signed in to submit a review');
      }

      if (!coffeeShop || !getCafeId()) {
        throw new Error('Choose a cafe before adding a review');
      }

      if (rating === 0) {
        throw new Error('Please select a rating');
      }

      const payload = {
        rating,
        text: text.trim() || undefined,
        photoUrl: photoPreview || undefined,
      };

      if (review) {
        if (review.reviewer?.id !== user.id) {
          throw new Error('You can only edit your own reviews');
        }
        await updateCafeReview(accessToken, review.id, payload);
      } else {
        await createCafeReview(accessToken, getCafeId(), payload);
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-form-container">
      <form onSubmit={handleSubmit} className="review-form">
        <h2>{review ? 'Edit Review' : 'Add Review'}</h2>

        {coffeeShop ? (
          <div className="form-group">
            <label>Cafe</label>
            <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <strong>{coffeeShop.name}</strong>
              {coffeeShop.location && (
                <div style={{ color: '#64748b', marginTop: '0.25rem' }}>{coffeeShop.location}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="error-message">Select a cafe before adding a review.</div>
        )}

        <div className="form-group">
          <label>Rating *</label>
          <StarRating rating={rating} onRatingChange={setRating} />
        </div>

        <div className="form-group">
          <label htmlFor="reviewText">Review</label>
          <textarea
            id="reviewText"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Tell us about your experience..."
            rows={4}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reviewPhoto">Photo (optional)</label>
          <input
            id="reviewPhoto"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={loading}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => document.getElementById('reviewPhoto').click()}
            disabled={loading}
          >
            Upload Photo
          </button>
          {photoPreview && (
            <div style={{ marginTop: '1rem' }}>
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={removePhoto}
                style={{ marginTop: '0.5rem' }}
                disabled={loading}
              >
                Remove Photo
              </button>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !coffeeShop}>
            {loading ? 'Saving...' : review ? 'Update Review' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
