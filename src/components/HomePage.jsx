import React from 'react';

export default function HomePage({ onBrowseCafes, onShowAbout }) {
  // Array of available JPG images
  const coffeeImages = [   
    'georgecoffee.jpg',
    'FullSizeRender.jpg',
    'IMG_5847.jpg', //change 
    'IMG_6014.jpg',  
    'IMG_9483.jpg',
    'IMG_8051.jpg',
    
  ];

  // Distribute images: 4 left, 4 right (or 5 left, 4 right)
  const leftImages = coffeeImages.slice(0, 3);
  const rightImages = coffeeImages.slice(3, 6);

  // Helper function to generate random rotation
  const getRandomRotation = (index) => {
    const rotations = [-4, -2, 3, -3, 2, 4, -5, 1, 5];
    return rotations[index % rotations.length];
  };

  // Photobooth Image Component
  const PhotoboothImage = ({ src, index, side }) => {
    const rotation = getRandomRotation(index);
    const fadeInDelay = index * 0.15;
    const floatDelay = fadeInDelay + 0.6; // Start floating after fade-in
    
    return (
      <div
        style={{
          width: '100px',
          marginBottom: '1rem',
          opacity: 0,
          animation: `photoboothFadeIn 0.6s ease-out ${fadeInDelay}s forwards, photoboothFloat ${3 + index * 0.3}s ease-in-out ${floatDelay}s infinite`,
        }}
      >
        <img
          src={`/${src}`}
          alt={`Coffee ${index + 1}`}
          style={{
            width: '200%',
            height: 'auto',
            borderRadius: '6px',
            border: '3px solid white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
            transform: `rotate(${rotation}deg)`,
            transition: 'all 0.3s ease',
            display: 'block',
            objectFit: 'cover',
            aspectRatio: '3/4',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `rotate(${rotation}deg) scale(1.1)`;
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25), 0 4px 8px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `rotate(${rotation}deg) scale(1)`;
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)';
          }}
        />
      </div>
    );
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFF8E7 0%, #F5E6D3 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1rem',
    }}>
      {/* Hero Section with Three Columns */}
      <div style={{
        maxWidth: '1400px',
        width: '100%',
        minHeight: '85vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '3rem',
        gap: '2rem',
        flexWrap: 'wrap',
      }}>
        {/* Left Photobooth Column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-left',
          justifyContent: 'flex-left',
          flex: '0 0 auto',
          minWidth: '120px',
        }}
        className="photobooth-column-left"
        >
          {leftImages.map((img, index) => (
            <PhotoboothImage key={`left-${index}`} src={img} index={index} side="left" />
          ))}
        </div>

        {/* Center Hero Content */}
        <div style={{
          flex: '1 1 600px',
          maxWidth: '900px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {/* Coffee Bean Icon */}
        <div style={{ 
          fontSize: 'clamp(2.5rem, 6vw, 4rem)', 
          marginBottom: '0.75rem',
          animation: 'float 3s ease-in-out infinite',
        }}>
          ☕
        </div>

        {/* Main Heading */}
        <h1 style={{
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          fontWeight: '700',
          color: '#6F4E37',
          marginBottom: '0.75rem',
          fontFamily: "'Playfair Display', serif",
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          letterSpacing: '-0.02em',
        }}>
          Sip & Swoon
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
          color: '#8D7B6D',
          marginBottom: '2rem',
          fontWeight: '400',
          maxWidth: '600px',
          margin: '0 auto 2rem',
          lineHeight: '1.5',
        }}>
          Discover and rate the best coffee shops in your area
        </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}>
            <button
              onClick={onBrowseCafes}
              style={{
                padding: '0.875rem 2.5rem',
                fontSize: '1.1rem',
                fontWeight: '600',
                background: '#6F4E37',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
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
          </div>
        </div>

        {/* Right Photobooth Column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-right',
          justifyContent: 'flex-right',
          flex: '0 0 auto',
          minWidth: '120px',
        }}
        className="photobooth-column-right"
        >
          {rightImages.map((img, index) => (
            <PhotoboothImage key={`right-${index}`} src={img} index={index + 4} side="right" />
          ))}
        </div>
      </div>

      {/* Learn More Section */}
      <div style={{
        maxWidth: '900px',
        width: '100%',
        padding: '2rem 1.5rem',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#6F4E37',
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          marginBottom: '1.5rem',
          fontFamily: "'Playfair Display', serif",
          fontWeight: '700',
        }}>
          What You Can Do
        </h2>

        <div style={{
          background: '#FFF8E7',
          padding: '1.5rem',
          borderRadius: '12px',
          borderLeft: '4px solid #6F4E37',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          <ul style={{
            margin: 0,
            paddingLeft: 0,
            listStylePosition: 'inside',
            color: '#5A5A5A',
            fontSize: '1rem',
            lineHeight: '1.8',
          }}>
            <li style={{ marginBottom: '0.5rem' }}>Discover coffee shops with detailed ratings and reviews</li>
            <li style={{ marginBottom: '0.5rem' }}>View locations on an interactive map</li>
            <li style={{ marginBottom: '0.5rem' }}>Share your experiences with photos and ratings</li>
            <li style={{ marginBottom: '0.5rem' }}>Save your favorite spots for easy access</li>
            <li>Connect with a community of coffee enthusiasts</li>
          </ul>
        </div>
      </div>

      {/* Animation Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes photoboothFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes photoboothFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Responsive Design */
        @media (max-width: 968px) {
          .photobooth-column-left,
          .photobooth-column-right {
            minWidth: 80px !important;
          }
          .photobooth-column-left > div,
          .photobooth-column-right > div {
            width: 80px !important;
          }
        }

        @media (max-width: 768px) {
          .photobooth-column-left,
          .photobooth-column-right {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
