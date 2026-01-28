import React from 'react';

export default function HomePage({ onBrowseCafes, onShowAbout }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFF8E7 0%, #F5E6D3 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      overflow: 'hidden',
    }}>
      {/* Hero Section */}
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Coffee Bean Icon */}
        <div style={{ 
          fontSize: 'clamp(3rem, 10vw, 5rem)', 
          marginBottom: '1rem',
          animation: 'float 3s ease-in-out infinite',
        }}>
          ☕
        </div>

        {/* Main Heading */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          fontWeight: '700',
          color: '#6F4E37',
          marginBottom: '1rem',
          fontFamily: "'Playfair Display', serif",
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          letterSpacing: '-0.02em',
        }}>
          Sip & Swoon
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
          color: '#8D7B6D',
          marginBottom: '3rem',
          fontWeight: '400',
          maxWidth: '600px',
          margin: '0 auto 3rem',
          lineHeight: '1.6',
        }}>
          Discover and rate the best coffee shops in your area
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={onBrowseCafes}
            style={{
              padding: '1rem 3rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              background: '#6F4E37',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(111, 78, 55, 0.3)',
              fontFamily: "'Poppins', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#5A3D2D';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#6F4E37';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Browse Cafes
          </button>

          <button
            onClick={onShowAbout}
            style={{
              padding: '1rem 3rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              background: 'transparent',
              color: '#6F4E37',
              border: '2px solid #6F4E37',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: "'Poppins', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#6F4E37';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6F4E37';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Floating Animation Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
