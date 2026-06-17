import React, { useState, useEffect } from 'react';
import { db } from './db';
import { id } from '@instantdb/react';
import Auth from './components/Auth';
import CoffeeList from './components/CoffeeList';
import SearchBar from './components/SearchBar';
import ReviewForm from './components/ReviewForm';
import Profile from './components/Profile';
import CoffeeShopMap from './components/CoffeeShopMap';
import AdminTools from './components/AdminTools';
import HomePage from './components/HomePage';
import AboutModal from './components/AboutModal';
import PreferenceQuestionnaire from './components/PreferenceQuestionnaire';
import BackendDataPreview from './components/BackendDataPreview';
import { clearRememberMeToken, isOwner } from './utils/auth';
import { getBackendShops } from './utils/backendApi';

const BACKEND_SHOP_QUERY = {
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 10,
};

function App() {
  const { user } = db.useAuth();
  
  // Query coffee shops with reviews for map view
  const { data } = db.useQuery({
    coffeeShops: {
      reviews: {},
    },
  });

  // Query current user's data including preferences
  const { data: userData } = db.useQuery(
    user?.id ? {
      users: {
        $: {
          where: {
            id: user.id,
          },
        },
      },
    } : null
  );

  const currentUserData = userData?.users?.[0];

  // State declarations - must be before useEffects that use them
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [showHomePage, setShowHomePage] = useState(true); // Start with home page
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [newUserId, setNewUserId] = useState(null);
  const [showBackendPreview, setShowBackendPreview] = useState(false);
  const [dataSource, setDataSource] = useState('instantdb');
  const [backendShops, setBackendShops] = useState([]);
  const [backendStatus, setBackendStatus] = useState('idle');
  const [backendError, setBackendError] = useState('');

  const isBackendSource = import.meta.env.DEV && dataSource === 'backend';

  useEffect(() => {
    if (!isBackendSource) {
      return;
    }

    let isCurrentRequest = true;

    const loadBackendShops = async () => {
      try {
        setBackendStatus('loading');
        setBackendError('');

        const response = await getBackendShops(BACKEND_SHOP_QUERY);
        const normalizedShops = (response.data || []).map((shop) => ({
          ...shop,
          createdAt: shop.createdAt || 0,
          reviews: shop.reviews || [],
          favorites: shop.favorites || [],
          backendSource: true,
        }));

        if (isCurrentRequest) {
          setBackendShops(normalizedShops);
          setBackendStatus('ready');
        }
      } catch (error) {
        if (isCurrentRequest) {
          setBackendError(error.message || 'Unable to load backend shops');
          setBackendStatus('error');
          setBackendShops([]);
        }
      }
    };

    loadBackendShops();

    return () => {
      isCurrentRequest = false;
    };
  }, [isBackendSource]);

  const handleSignOut = async () => {
    // Clear remember me data from localStorage
    clearRememberMeToken();
    
    // Clear remember me token from database
    if (user?.id) {
      try {
        await db.transact([
          db.tx.$users[user.id].update({
            rememberMeToken: null,
          }),
        ]);
      } catch (error) {
        console.error('Error clearing remember me token:', error);
      }
    }
    
    // Sign out
    await db.auth.signOut();
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
    // review.shop might be a ref object, get the actual shop data
    setSelectedShop(review.shop?.id ? { id: review.shop.id } : review.shop);
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
      console.log('Deleting review:', reviewId);
      
      // First, verify ownership by fetching the review
      const { data: reviewData } = await db.queryOnce({
        reviews: {
          $: {
            where: {
              id: reviewId,
            },
          },
          reviewer: {},
        },
      });

      if (!reviewData?.reviews || reviewData.reviews.length === 0) {
        alert('Review not found');
        return;
      }

      const review = reviewData.reviews[0];
      
      // Verify that the current user is the owner of the review
      if (review.reviewer?.id !== user.id) {
        alert('You can only delete your own reviews');
        console.error('Unauthorized delete attempt: User', user.id, 'tried to delete review owned by', review.reviewer?.id);
        return;
      }
      
      // Delete the review - InstantDB will automatically update all queries
      const result = await db.transact([db.tx.reviews[reviewId].delete()]);
      
      console.log('Review deleted successfully:', result);
      
      // The UI will update automatically via db.useQuery() in CoffeeList
      // InstantDB's real-time subscriptions will refresh the data
    } catch (error) {
      console.error('Error deleting review:', error);
      alert(`Failed to delete review: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleReviewFormSuccess = () => {
    setShowReviewForm(false);
    setEditingReview(null);
    setSelectedShop(null);
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
  };

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false);
    setNewUserId(null);
  };

  const handleReturnHome = () => {
    setShowHomePage(true);
    setShowReviewForm(false);
    setEditingReview(null);
    setSelectedShop(null);
    setShowBackendPreview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className="app"
      onClick={() => showProfileDropdown && setShowProfileDropdown(false)}
    >
      {/*<nav className="navbar" onClick={(e) => e.stopPropagation()}>
        <div className="container">
          <div className="nav-brand">
            <h1 
              onClick={() => setShowHomePage(true)}
              style={{ 
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#8D7B6D'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6F4E37'}
            >
              ☕ Sip & Swoon
            </h1>
          </div>

          <div className="nav-menu" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowAboutModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6F4E37',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#5A3D2D';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#6F4E37';
              }}
            >
              About
            </button>
            {user ? (
              <div
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {(currentUserData?.profilePhotoUrl || user.profilePhotoUrl) ? (
                  <img
                    src={currentUserData?.profilePhotoUrl || user.profilePhotoUrl}
                    alt="Profile"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #6F4E37',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#6F4E37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.2rem',
                    }}
                  >
                    {currentUserData?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span style={{ color: '#6F4E37', fontWeight: '500' }}>
                  {currentUserData?.username || user.email || 'User'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>▼</span>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setShowAuth(true)}
                style={{
                  padding: '0.5rem 1.5rem',
                  fontSize: '1rem',
                }}
              >
                Sign In
              </button>
            )}
            
            {showProfileDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  minWidth: '200px',
                  zIndex: 1000,
                }}
              >
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowProfile(true);
                    setShowProfileDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  👤 My Profile
                </button>
                {isOwner(currentUserData?.email) && (
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowAdminTools(true);
                      setShowProfileDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🛠️ Admin Tools
                  </button>
                )}
                <button
                  className="dropdown-item"
                  onClick={() => {
                    handleSignOut();
                    setShowProfileDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#dc2626',
                    transition: 'background 0.2s',
                    borderRadius: '0 0 8px 8px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
*/}
      {showHomePage ? (
            <HomePage 
              onBrowseCafes={() => setShowHomePage(false)} 
              onShowAbout={() => setShowAboutModal(true)}
            />
          ) : (
            <main className="main-content">
              <div className="container">
                <div className="actions-bar">
                  <button
                    className="view-toggle-btn home-tab-btn"
                    onClick={handleReturnHome}
                    aria-label="Return to home page"
                  >
                    Home
                  </button>

                  <div className="browse-actions">
                    {user ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedShop(null);
                          setEditingReview(null);
                          setShowReviewForm(true);
                        }}
                      >
                        + Add Coffee Shop & Review
                      </button>
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
                      {import.meta.env.DEV && (
                        <button
                          className={`view-toggle-btn ${isBackendSource ? 'active' : ''}`}
                          onClick={() => setDataSource((current) => (
                            current === 'backend' ? 'instantdb' : 'backend'
                          ))}
                        >
                          {isBackendSource ? 'Backend Data' : 'InstantDB Data'}
                        </button>
                      )}
                      <button
                        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                      >
                        📋 List View
                      </button>
                      <button
                        className={`view-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
                        onClick={() => setViewMode('map')}
                      >
                        🗺️ Map View
                      </button>
                    </div>
                  </div>
                </div>

              {import.meta.env.DEV && showBackendPreview && <BackendDataPreview />}

              {isBackendSource && (
                <div className={`backend-source-banner ${backendStatus === 'error' ? 'error' : ''}`}>
                  {backendStatus === 'loading' && 'Loading shops from the local backend...'}
                  {backendStatus === 'ready' && `Showing ${backendShops.length} shops from the local backend mock API.`}
                  {backendStatus === 'error' && (
                    <>
                      Backend data is not reachable. Start it with <code>npm run server</code>.
                      {backendError && <span>{backendError}</span>}
                    </>
                  )}
                </div>
              )}

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
                    coffeeShops={isBackendSource ? backendShops : data?.coffeeShops || []}
                    minRating={minRating}
                    onMinRatingChange={setMinRating}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                  />

                  <CoffeeList
                    searchQuery={searchQuery}
                    minRating={minRating}
                    sortBy={sortBy}
                    currentUserId={user?.id}
                    currentUserData={currentUserData}
                    externalShops={isBackendSource ? backendShops : null}
                    externalLabel={isBackendSource ? 'Backend mock API' : ''}
                    isExternalData={isBackendSource}
                    isExternalLoading={isBackendSource && backendStatus === 'loading'}
                    externalError={isBackendSource && backendStatus === 'error' ? backendError : ''}
                    onEditReview={handleEditReview}
                    onDeleteReview={handleDeleteReview}
                    onShowAuth={() => setShowAuth(true)}
                  />
                </>
              ) : (
                <CoffeeShopMap coffeeShops={isBackendSource ? backendShops : data?.coffeeShops || []} />
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Auth 
              onSuccess={handleAuthSuccess}
              onSignUpSuccess={handleSignUpSuccess}
            />
          </div>
        </div>
      )}

      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
      {showAdminTools && <AdminTools onClose={() => setShowAdminTools(false)} />}

      {showQuestionnaire && newUserId && (
        <PreferenceQuestionnaire
          userId={newUserId}
          onComplete={handleQuestionnaireComplete}
          onSkip={handleQuestionnaireSkip}
        />
      )}
    </div>
  );
}

export default App;
