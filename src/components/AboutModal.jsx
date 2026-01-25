import React from 'react';

export default function AboutModal({ onClose }) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#8D7B6D',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
            e.currentTarget.style.color = '#6F4E37';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#8D7B6D';
          }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Icon */}
        <div style={{ 
          textAlign: 'center', 
          fontSize: '3rem', 
          marginBottom: '1rem' 
        }}>
          ☕
        </div>

        {/* Title */}
        <h2 style={{
          textAlign: 'center',
          color: '#6F4E37',
          fontSize: '2rem',
          marginBottom: '1.5rem',
          fontFamily: "'Poppins', sans-serif",
          fontWeight: '700',
        }}>
          About Sip Swoon
        </h2>

        {/* Description */}
        <div style={{
          color: '#4A4A4A',
          lineHeight: '1.8',
          fontSize: '1rem',
        }}>
          <p style={{ marginBottom: '1.5rem' }}>
            Welcome to <strong style={{ color: '#6F4E37' }}>Sip Swoon</strong>, your ultimate companion for discovering and rating the best coffee shops in your area. Whether you're a casual coffee drinker or a devoted caffeine enthusiast, our platform helps you find your perfect cup of coffee.
          </p>

          <p style={{ marginBottom: '1.5rem' }}>
            Share your experiences, read reviews from fellow coffee lovers, and explore new cafes on our interactive map. Rate your visits, save your favorites, and build a personalized collection of the coffee shops that make your day better.
          </p>

          <div style={{
            background: '#FFF8E7',
            padding: '1.5rem',
            borderRadius: '12px',
            borderLeft: '4px solid #6F4E37',
          }}>
            <h3 style={{
              color: '#6F4E37',
              fontSize: '1.1rem',
              marginBottom: '0.75rem',
              fontWeight: '600',
            }}>
              What You Can Do:
            </h3>
            <ul style={{
              margin: 0,
              paddingLeft: '1.5rem',
              color: '#5A5A5A',
            }}>
              <li style={{ marginBottom: '0.5rem' }}>Discover coffee shops with detailed ratings and reviews</li>
              <li style={{ marginBottom: '0.5rem' }}>View locations on an interactive map</li>
              <li style={{ marginBottom: '0.5rem' }}>Share your experiences with photos and ratings</li>
              <li style={{ marginBottom: '0.5rem' }}>Save your favorite spots for easy access</li>
              <li>Connect with a community of coffee enthusiasts</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: '#8D7B6D',
          fontSize: '0.9rem',
        }}>
          <p style={{ margin: 0 }}>
            Happy sipping! ☕
          </p>
        </div>
      </div>
    </div>
  );
}
