import React from 'react';
import StarRating from './StarRating';
import { getTimeAgo } from '../utils/helpers';

export default function ReviewCard({ review, currentUserId, onEdit, onDelete }) {
  // Only show edit/delete buttons if:
  // 1. User is logged in (currentUserId exists)
  // 2. Review has a reviewer linked to it
  // 3. The reviewer's ID matches the current user's ID
  const isOwner = currentUserId && review.reviewer?.id && review.reviewer.id === currentUserId;
  const reviewerName = review.reviewer?.username || 'Sip & Swoon user';

  return (
    <div className="review-card">
      <div className="review-header">
        <div className="review-rating">
          <StarRating rating={review.rating} readOnly />
        </div>
        <div className="review-meta">
          <span className="review-author">
            {reviewerName}
          </span>
          <span className="review-date">{getTimeAgo(review.createdAt)}</span>
        </div>
      </div>
      {review.text && (
        <div className="review-text">{review.text}</div>
      )}
      {review.photoUrl && (
        <div className="review-photo">
          <img
            src={review.photoUrl}
            alt="Review"
            style={{
              width: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              objectFit: 'cover',
              marginTop: '1rem',
            }}
          />
        </div>
      )}
      {isOwner && (
        <div className="review-actions">
          <button
            className="btn btn-small btn-secondary"
            onClick={() => onEdit(review)}
          >
            Edit
          </button>
          <button
            className="btn btn-small btn-danger"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this review?')) {
                onDelete(review.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
