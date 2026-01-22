import React, { useState } from 'react';

export default function StarRating({ rating, onRatingChange, readOnly = false }) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleClick = (value) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value) => {
    if (!readOnly) {
      setHoveredRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoveredRating(0);
    }
  };

  const displayRating = hoveredRating || rating || 0;

  return (
    <div className="star-rating" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={`star ${readOnly ? 'read-only' : 'clickable'}`}
          onClick={() => handleClick(value)}
          onMouseEnter={() => handleMouseEnter(value)}
          onMouseLeave={handleMouseLeave}
          disabled={readOnly}
          style={{
            background: 'none',
            border: 'none',
            cursor: readOnly ? 'default' : 'pointer',
            fontSize: '1.5rem',
            padding: '2px',
            color: value <= displayRating ? '#fbbf24' : '#d1d5db',
            transition: 'color 0.2s',
          }}
          aria-label={`Rate ${value} out of 5 stars`}
        >
          ★
        </button>
      ))}
      {rating > 0 && (
        <span style={{ marginLeft: '8px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

