import React, { useEffect, useState } from 'react';
import { getBackendDrinks, getBackendShops } from '../utils/backendApi';
import { getUserLocation } from '../utils/location';

const BREWING_NEARBY_QUERY = {
  radius: 15,
  limit: 30,
};

const BREWING_STASH_QUERY = {
  limit: 30,
};

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const getRandomItem = (items) => items[Math.floor(Math.random() * items.length)];

export default function HomePage({ onBrowseCafes, onShowMap, onShowAbout, onShowProfile }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [brewStatus, setBrewStatus] = useState('idle');
  const [brewSuggestion, setBrewSuggestion] = useState(null);
  const [brewError, setBrewError] = useState('');
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
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

  const handleFindFavorite = async () => {
    try {
      setBrewStatus('spinning');
      setBrewError('');

      const shouldShareLocation = window.confirm(
        'Would you like to share your location so Sip & Swoon can suggest a cafe near your city?'
      );
      let shopsQuery = BREWING_STASH_QUERY;

      if (shouldShareLocation) {
        try {
          const location = await getUserLocation();
          shopsQuery = {
            ...BREWING_NEARBY_QUERY,
            latitude: location.latitude,
            longitude: location.longitude,
          };
        } catch {
          shopsQuery = BREWING_STASH_QUERY;
        }
      }

      const [shopsResponse, drinksResponse] = await Promise.all([
        getBackendShops(shopsQuery),
        getBackendDrinks(),
        wait(1100),
      ]);

      const shops = shopsResponse.data || [];
      const drinks = drinksResponse.data || [];

      if (shops.length === 0) {
        throw new Error('No cafes were returned by the backend.');
      }

      const drinksWithShops = drinks
        .map((drink) => ({
          drink,
          shop: shops.find((shop) => shop.id === drink.shopId),
        }))
        .filter((item) => item.shop);

      if (drinksWithShops.length > 0) {
        setBrewSuggestion(getRandomItem(drinksWithShops));
      } else {
        setBrewSuggestion({ shop: getRandomItem(shops), drink: null });
      }

      setBrewStatus('ready');
    } catch (error) {
      setBrewStatus('error');
      setBrewSuggestion(null);
      setBrewError(error.message || 'Unable to find a cafe right now.');
    }
  };

  const handleRefreshHome = () => {
    setScrollProgress(0);
    setBrewStatus('idle');
    setBrewSuggestion(null);
    setBrewError('');
    setHomeRefreshKey((currentKey) => currentKey + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main
      className="home-page"
      style={{ '--home-scroll-progress': scrollProgress }}
    >
      <section className="home-hero" aria-labelledby="home-title">
        <header className="home-header">
          <nav className="home-header-nav home-header-nav-left" aria-label="Cafe navigation">
            <button className="home-nav-tab" onClick={onBrowseCafes}>
              Browse Cafes
            </button>
            <button className="home-nav-tab" onClick={onShowMap}>
              Map
            </button>
          </nav>

          <button
            className="home-brand-tab"
            onClick={handleRefreshHome}
            aria-label="Refresh Sip and Swoon home page"
          >
            Sip & Swoon
          </button>

          <nav className="home-header-nav home-header-nav-right" aria-label="Account navigation">
            <button className="home-nav-tab" onClick={onShowAbout}>
              About
            </button>
            <button className="home-nav-tab" onClick={onShowProfile}>
              Profile
            </button>
          </nav>
        </header>

        <div className="home-hero-shade" />

        <div className="home-hero-content" key={homeRefreshKey}>
          <h1 id="home-title">
            Where Today <br />
            Tastes Better.
          </h1>
        </div>
      </section>

      <section className="home-brew-section" aria-labelledby="home-brew-title">
        <div className={`home-brew-generator ${brewStatus === 'spinning' ? 'is-spinning' : ''}`}>
          <div className="home-brew-heading">
            <h2 id="home-brew-title">Find a new favorite?</h2>
            <p>
              Click the button and we'll suggest a cafe or drink to try.
              It's like a coffee adventure in a click!
            </p>
          </div>

          <button
            className="home-brew-button"
            onClick={handleFindFavorite}
            disabled={brewStatus === 'spinning'}
          >
            {brewStatus === 'spinning' ? 'Brewing...' : "What's brewing?"}
          </button>

          {(brewStatus === 'spinning' || brewSuggestion || brewError) && (
            <div className="home-brew-result" aria-live="polite">
              <div className="home-brew-wheel" aria-hidden="true">
                <span>{brewStatus === 'spinning' ? '?' : 'Sip'}</span>
              </div>

              {brewStatus === 'spinning' && (
                <p className="home-brew-message">Spinning through nearby picks...</p>
              )}

              {brewStatus === 'ready' && brewSuggestion && (
                <div className="home-brew-copy">
                  <p className="home-brew-kicker">Try this next</p>
                  <h3>{brewSuggestion.drink?.name || brewSuggestion.shop.name}</h3>
                  <p>
                    {brewSuggestion.drink
                      ? `${brewSuggestion.drink.temperature} ${brewSuggestion.drink.normalizedType} at ${brewSuggestion.shop.name}.`
                      : `A ${brewSuggestion.shop.atmosphere || 'local'} cafe worth adding to your list.`}
                  </p>
                  <span>{brewSuggestion.shop.location}</span>
                </div>
              )}

              {brewStatus === 'error' && (
                <p className="home-brew-message">
                  {brewError} Start the backend with <code>npm run server</code>.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
