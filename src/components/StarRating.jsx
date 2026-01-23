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
    <div className="star-rating" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
            fontSize: '1.75rem',
            padding: '4px',
            color: value <= displayRating ? '#C9A961' : '#D7CCC8',
            transition: 'all 0.3s ease',
            transform: value <= displayRating ? 'scale(1.1)' : 'scale(1)',
            filter: value <= displayRating 
              ? 'drop-shadow(0 0 4px rgba(201, 169, 97, 0.6)) drop-shadow(0 0 8px rgba(201, 169, 97, 0.3))' 
              : 'none',
            textShadow: value <= displayRating ? '0 0 10px rgba(201, 169, 97, 0.5)' : 'none',
          }}
          aria-label={`Rate ${value} out of 5 stars`}
        >
          ★
        </button>
      ))}
      {rating > 0 && (
        <span style={{ 
          marginLeft: '10px', 
          color: '#8D7B6D', 
          fontSize: '0.95rem',
          fontFamily: "'Poppins', sans-serif",
          fontWeight: '500'
        }}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

