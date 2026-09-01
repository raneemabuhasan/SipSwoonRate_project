import React, { Suspense, lazy, useState } from 'react';
import Auth from './components/Auth';
import CoffeeList from './components/CoffeeList';
import SearchBar from './components/SearchBar';
import ReviewForm from './components/ReviewForm';
import HomePage from './components/HomePage';
import AboutModal from './components/AboutModal';
import { useBackendShops } from './hooks/useBackendShops';
import { useAuth } from './context/AuthContext';
import { deleteCafeReview } from './utils/backendApi';
import { getUserLocation } from './utils/location';

const BackendDataPreview = lazy(() => import('./components/BackendDataPreview'));
const CoffeeShopMap = lazy(() => import('./components/CoffeeShopMap'));
const PreferenceQuestionnaire = lazy(() => import('./components/PreferenceQuestionnaire'));
const Profile = lazy(() => import('./components/Profile'));

const CITY_CAFE_QUERIES = [
  {
    id: 'new-york',
    label: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 4,
    limit: 12,
  },
  {
    id: 'boston',
    label: 'Boston',
    latitude: 42.3601,
    longitude: -71.0589,
    radius: 4,
    limit: 12,
  },
  {
    id: 'san-francisco',
    label: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 4,
    limit: 12,
  },
];

function getRandomCityCafeQuery() {
  return CITY_CAFE_QUERIES[Math.floor(Math.random() * CITY_CAFE_QUERIES.length)];
}

function LoadingFallback({ label = 'Loading...' }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner">{label}</div>
    </div>
  );
}

function App() {
  const { user, accessToken, profile: currentUserData, signOut, refreshProfile } = useAuth();

  // State declarations - must be before useEffects that use them
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [showHomePage, setShowHomePage] = useState(true); // Start with home page
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [newUserId, setNewUserId] = useState(null);
  const [showBackendPreview, setShowBackendPreview] = useState(false);
  const [shopsRefreshKey, setShopsRefreshKey] = useState(0);
  const [activeCafeQuery, setActiveCafeQuery] = useState(getRandomCityCafeQuery);
  const [cafeNotice, setCafeNotice] = useState('');

  const { backendShops, backendStatus, backendError, backendMeta } = useBackendShops({
    enabled: true,
    query: activeCafeQuery,
    token: accessToken,
    refreshKey: shopsRefreshKey,
  });
  const displayedCoffeeShops = backendShops;

  const handleSignOut = async () => {
    await signOut();
    setShowProfile(false);
  };

  const handleEditReview = (review) => {
    // Verify ownership before allowing edit
    if (!user?.id) {
      alert('You must be signed in to edit a review');
      return;
    }
    
    if (review.reviewer?.id !== user.id) {
      alert('You can only edit your own reviews');
      return;
    }
    
    setEditingReview(review);
    setSelectedShop(review.shop);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId) {
      console.error('No review ID provided');
      return;
    }

    if (!user?.id) {
      alert('You must be signed in to delete a review');
      return;
    }

    try {
      await deleteCafeReview(accessToken, reviewId);
      setShopsRefreshKey((current) => current + 1);
    } catch (error) {
      console.error('Error deleting review:', error);
      alert(`Failed to delete review: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleReviewFormSuccess = () => {
    setShowReviewForm(false);
    setEditingReview(null);
    setSelectedShop(null);
    setShopsRefreshKey((current) => current + 1);
  };

  const handleReviewFormCancel = () => {
    setShowReviewForm(false);
    setEditingReview(null);
    setSelectedShop(null);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  const handleSignUpSuccess = (userId) => {
    setNewUserId(userId);
    setShowAuth(false);
    setShowQuestionnaire(true);
  };

  const handleQuestionnaireComplete = () => {
    setShowQuestionnaire(false);
    setNewUserId(null);
    refreshProfile();
  };

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false);
    setNewUserId(null);
  };

  const handleAddReview = (shop) => {
    if (!user) {
      const shouldSignIn = window.confirm('Sign in to add a review.\n\nWould you like to sign in now?');
      if (shouldSignIn) setShowAuth(true);
      return;
    }

    setSelectedShop(shop);
    setEditingReview(null);
    setShowReviewForm(true);
  };

  const handleReturnHome = () => {
    setShowHomePage(true);
    setViewMode('list');
    setShowReviewForm(false);
    setEditingReview(null);
    setSelectedShop(null);
    setShowBackendPreview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadFallbackCafes = () => {
    setActiveCafeQuery(getRandomCityCafeQuery());
    setSearchQuery('');
    setShopsRefreshKey((current) => current + 1);
  };

  const handleBrowseCafes = async () => {
    setViewMode('list');
    setShowHomePage(false);

    const shouldShareLocation = window.confirm(
      'Would you like to share your location so Sip & Swoon can show cafes near you?'
    );

    if (!shouldShareLocation) {
      setCafeNotice('Location sharing was skipped. Showing cafes from a sample city instead.');
      loadFallbackCafes();
      return;
    }

    try {
      const location = await getUserLocation();
      setActiveCafeQuery({
        id: 'near-you',
        label: 'Near you',
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 5,
        limit: 12,
      });
      setSearchQuery('');
      setCafeNotice('');
      setShopsRefreshKey((current) => current + 1);
    } catch (error) {
      setCafeNotice(`${error.message || 'Your location could not be read.'} Showing cafes from a sample city instead.`);
      loadFallbackCafes();
    }
  };

  return (
    <div className="app">
      {showHomePage ? (
            <HomePage 
              onBrowseCafes={handleBrowseCafes}
              onShowMap={() => {
                setViewMode('map');
                setShowHomePage(false);
              }}
              onShowAbout={() => setShowAboutModal(true)}
              onShowProfile={() => {
                if (user) {
                  setShowProfile(true);
                } else {
                  setShowAuth(true);
                }
              }}
            />
          ) : (
            <main className="main-content">
              <div className="container">
                <div className="actions-bar">
                  <button
                    className="home-tab-btn"
                    onClick={handleReturnHome}
                    aria-label="Return to home page"
                  >
                    Sip & Swoon
                  </button>

                  <div className="browse-actions">
                    {user ? (
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowProfile(true)}
                        >
                          Profile
                        </button>
                        <button className="btn btn-secondary" onClick={handleSignOut}>
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowAuth(true)}
                      >
                        Sign In to Add Reviews
                      </button>
                    )}
                    
                    <div className="view-toggle">
                      {import.meta.env.DEV && (
                        <button
                          className={`view-toggle-btn ${showBackendPreview ? 'active' : ''}`}
                          onClick={() => setShowBackendPreview((current) => !current)}
                        >
                          API Preview
                        </button>
                      )}
                      {viewMode === 'list' ? (
                        <button
                          className="view-toggle-btn"
                          onClick={() => setViewMode('map')}
                        >
                          Map View
                        </button>
                      ) : (
                        <button
                          className="view-toggle-btn"
                          onClick={() => setViewMode('list')}
                        >
                          Return to Cafes
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              {import.meta.env.DEV && showBackendPreview && (
                <Suspense fallback={<LoadingFallback label="Loading API preview..." />}>
                  <BackendDataPreview />
                </Suspense>
              )}

              <div className={`backend-source-banner ${backendStatus === 'error' ? 'error' : ''}`}>
                {backendStatus === 'loading' && 'Loading cafes from the backend...'}
                {backendStatus === 'ready' && (
                  <>
                    {backendShops.length > 0
                      ? `Showing ${backendShops.length} cafes from the backend.`
                      : 'No cafes were found for this location.'}
                    {backendMeta?.cacheWarning && <span>{backendMeta.cacheWarning}</span>}
                    {backendMeta?.filterFallback && <span>A broader nearby-cafe selection is being shown.</span>}
                    {cafeNotice && <span>{cafeNotice}</span>}
                  </>
                )}
                {backendStatus === 'error' && (
                  <>
                    Backend data is not reachable. Start it with <code>npm run server</code>.
                    {backendError && <span>{backendError}</span>}
                  </>
                )}
              </div>

              {showReviewForm && (
                <div className="modal-overlay" onClick={handleReviewFormCancel}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <ReviewForm
                      coffeeShop={selectedShop}
                      review={editingReview}
                      onCancel={handleReviewFormCancel}
                      onSuccess={handleReviewFormSuccess}
                    />
                  </div>
                </div>
              )}

              {viewMode === 'list' ? (
                <>
                  <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    coffeeShops={displayedCoffeeShops}
                    minRating={minRating}
                    onMinRatingChange={setMinRating}
                  />

                  <CoffeeList
                    searchQuery={searchQuery}
                    minRating={minRating}
                    currentUserId={user?.id}
                    currentUserData={currentUserData}
                    shops={displayedCoffeeShops}
                    isLoading={backendStatus === 'loading'}
                    error={backendStatus === 'error' ? backendError : ''}
                    accessToken={accessToken}
                    onEditReview={handleEditReview}
                    onDeleteReview={handleDeleteReview}
                    onAddReview={handleAddReview}
                    onRefresh={() => setShopsRefreshKey((current) => current + 1)}
                    onShowAuth={() => setShowAuth(true)}
                  />
                </>
              ) : (
                <Suspense fallback={<LoadingFallback label="Loading map..." />}>
                  <CoffeeShopMap coffeeShops={displayedCoffeeShops} />
                </Suspense>
              )}
              </div>
            </main>
          )}

      {/* Modals that should work from anywhere */}
      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}

      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()}>
            <Auth 
              onSuccess={handleAuthSuccess}
              onSignUpSuccess={handleSignUpSuccess}
            />
          </div>
        </div>
      )}

      {showProfile && (
        <Suspense fallback={<LoadingFallback label="Loading profile..." />}>
          <Profile onClose={() => setShowProfile(false)} />
        </Suspense>
      )}
      {showQuestionnaire && newUserId && (
        <Suspense fallback={<LoadingFallback label="Loading questionnaire..." />}>
          <PreferenceQuestionnaire
            userId={newUserId}
            onComplete={handleQuestionnaireComplete}
            onSkip={handleQuestionnaireSkip}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
