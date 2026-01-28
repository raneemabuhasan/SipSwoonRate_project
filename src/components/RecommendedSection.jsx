import React, { useState } from 'react';
import StarRating from './StarRating';
import { calculateAverageRating } from '../utils/helpers';
import { getMatchReasons } from '../utils/recommendationEngine';

export default function RecommendedSection({ recommendedCafes, userPreferences, onCafeClick }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!recommendedCafes || recommendedCafes.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFF8E7 0%, #F5E6D3 100%)',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '2px solid #C9A961',
      boxShadow: '0 4px 16px rgba(201, 169, 97, 0.2)',
    }}>
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '1.5rem' : '0',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem' }}>✨</span>
          <div>
            <h3 style={{
              fontSize: '1.5rem',
              color: '#6F4E37',
              fontFamily: "'Playfair Display', serif",
              marginBottom: '0.25rem',
            }}>
              For You
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#8D7B6D',
              margin: 0,
            }}>
              {recommendedCafes.length} cafes matched to your preferences
            </p>
          </div>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#6F4E37',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </button>
      </div>

      {/* Cafe Cards */}
      {isExpanded && (
        <div style={{
          display: 'grid',
          gap: '1rem',
        }}>
          {recommendedCafes.map((cafe, index) => {
            const avgRating = parseFloat(calculateAverageRating(cafe.reviews || []));
            const reasons = getMatchReasons(userPreferences, cafe);

            return (
              <div
                key={cafe.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: '1px solid #E5E0DC',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => onCafeClick && onCafeClick(cafe)}
              >
                {/* Match Badge */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: '#6F4E37',
                  color: 'white',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                }}>
                  {cafe.matchScore}% Match
                </div>

                {/* Rank Badge */}
                {index === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    fontSize: '1.5rem',
                  }}>
                    🏆
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  paddingRight: '5rem',
                }}>
                  <h4 style={{
                    fontSize: '1.2rem',
                    color: '#6F4E37',
                    fontWeight: '600',
                    marginTop: index === 0 ? '0.5rem' : 0,
                  }}>
                    {cafe.name}
                  </h4>
                  
                  {cafe.location && (
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#8D7B6D',
                      margin: 0,
                    }}>
                      📍 {cafe.location}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <StarRating rating={avgRating} readOnly size="small" />
                    <span style={{
                      fontSize: '0.85rem',
                      color: '#8D7B6D',
                    }}>
                      ({cafe.reviews?.length || 0} reviews)
                    </span>
                  </div>

                  {/* Match Reasons */}
                  {reasons.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                    }}>
                      {reasons.map((reason, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.75rem',
                            background: '#F5E6D3',
                            color: '#6F4E37',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontWeight: '500',
                          }}
                        >
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {isExpanded && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#8D7B6D',
          marginTop: '1rem',
          marginBottom: 0,
        }}>
          Based on your preferences • Update anytime in your profile
        </p>
      )}
    </div>
  );
}
