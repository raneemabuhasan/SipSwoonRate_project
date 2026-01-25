import React, { useState } from 'react';

// Coffee Bean Icon Component
const CoffeeBeanIcon = ({ filled, isHovered, size = 'default' }) => {
  const fillColor = filled ? '#B8935E' : '#E5E0DC';
  const strokeColor = filled ? '#6F5436' : '#C4B5AA';
  const dimensions = size === 'small' ? 20 : 28;
  
  return (
    <svg 
      width={dimensions} 
      height={dimensions} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: 'all 0.3s ease',
        pointerEvents: 'none',
      }}
    >
      {/* Coffee bean shape */}
      <ellipse 
        cx="12" 
        cy="12" 
        rx="8" 
        ry="10.5" 
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        style={{
          transition: 'all 0.3s ease',
        }}
      />
      {/* Center line crack */}
      <path 
        d="M 12 3 Q 10 12 12 21" 
        stroke={strokeColor}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        style={{
          transition: 'all 0.3s ease',
        }}
      />
    </svg>
  );
};

export default function StarRating({ rating, onRatingChange, readOnly = false, size = 'default' }) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleClick = (value) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value) => {
    if (!readOnly) {
      console.log('Hovering over bean:', value);
      setHoveredRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      console.log('Mouse left beans');
      setHoveredRating(0);
    }
  };

  const displayRating = hoveredRating || rating || 0;
  const isActive = hoveredRating > 0;

  return (
    <div className="star-rating" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= displayRating;
        const isHovered = value <= hoveredRating;
        
        return (
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
              padding: '4px',
              transition: 'all 0.2s ease-out',
              transform: isFilled ? 'scale(1.25)' : 'scale(1)',
              filter: isFilled 
                ? 'drop-shadow(0 0 8px rgba(184, 147, 94, 0.9)) drop-shadow(0 0 16px rgba(184, 147, 94, 0.6)) drop-shadow(0 0 24px rgba(184, 147, 94, 0.3)) brightness(1.25) saturate(1.1)' 
                : 'brightness(0.85) saturate(0.7)',
              opacity: isFilled ? 1 : 0.6,
            }}
            aria-label={`Rate ${value} out of 5 beans`}
          >
            <CoffeeBeanIcon filled={isFilled} isHovered={isHovered} size={size} />
          </button>
        );
      })}
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

