import React, { useEffect, useRef, useState } from 'react';

const moodCards = [
  {
    label: 'Cozy Corners',
    copy: 'Soft seats, warm lighting, and drinks worth lingering over.',
  },
  {
    label: 'Study Spots',
    copy: 'Reliable tables, friendly noise, and enough caffeine to focus.',
  },
  {
    label: 'Weekend Treats',
    copy: 'Pretty cups, sweet bites, and cafes that make an outing of it.',
  },
];

export default function HomePage({ onBrowseCafes, onShowAbout }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [moodsVisible, setMoodsVisible] = useState(false);
  const moodsRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setMoodsVisible(true);
      return undefined;
    }

    let animationFrame = null;

    const updateScrollProgress = () => {
      const nextProgress = Math.min(window.scrollY / 520, 1);
      setScrollProgress(nextProgress);
      animationFrame = null;
    };

    const handleScroll = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setMoodsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMoodsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (moodsRef.current) {
      observer.observe(moodsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <main
      className="home-page"
      style={{ '--home-scroll-progress': scrollProgress }}
    >
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-visual-field" aria-hidden="true">
          <div className="home-visual-card home-visual-card-menu">
            <span>Espresso</span>
            <span>Latte</span>
            <span>Cold Brew</span>
          </div>
          <div className="home-visual-card home-visual-card-note">
            <span>Cozy</span>
            <span>Quiet</span>
            <span>Specialty</span>
          </div>
          <div className="home-visual-card home-visual-card-rating">
            <span>4.8</span>
            <span>local favorite</span>
          </div>
        </div>

        <div className="home-hero-shade" />

        <div className="home-hero-content">
          <h1 id="home-title">Sip & Swoon</h1>
          <div className="home-hero-support">
            <p className="home-subtitle">
              Find charming cafes, keep track of the cups you loved, and share the little details that make a spot feel special.
            </p>

            <div className="home-actions" aria-label="Homepage actions">
              <button className="home-primary-action" onClick={onBrowseCafes}>
                Browse Cafes
              </button>
              <button className="home-secondary-action" onClick={onShowAbout}>
                About
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={moodsRef}
        className={`home-moods ${moodsVisible ? 'is-visible' : ''}`}
        aria-labelledby="home-moods-title"
      >
        <div className="home-section-heading">
          <p>Pick the vibe</p>
          <h2 id="home-moods-title">Where today tastes better</h2>
        </div>

        <div className="home-mood-grid">
          {moodCards.map((card) => (
            <article className="home-mood-card" key={card.label}>
              <h3>{card.label}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
