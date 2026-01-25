import React, { useState } from 'react';
import { db } from './db';
import Auth from './components/Auth';
import CoffeeList from './components/CoffeeList';
import SearchBar from './components/SearchBar';
import ReviewForm from './components/ReviewForm';
import Profile from './components/Profile';
import CoffeeShopMap from './components/CoffeeShopMap';
import AdminTools from './components/AdminTools';
import HomePage from './components/HomePage';
import AboutModal from './components/AboutModal';
import { clearRememberMeToken, clearRememberedUsername } from './utils/auth';

function App() {
  const { user } = db.useAuth();
  
  // Query coffee shops with reviews for map view
  const { data } = db.useQuery({
    coffeeShops: {
      reviews: {},
    },
  });
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

  const handleSignOut = async () => {
    // Clear remember me data from localStorage
    clearRememberMeToken();
    clearRememberedUsername();
    
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

  return (
    <div 
      className="app"
      onClick={() => showProfileDropdown && setShowProfileDropdown(false)}
    >
      <nav className="navbar" onClick={(e) => e.stopPropagation()}>
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
              ☕ Sip Swoon - Rate Your Coffee
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
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
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
                    {user.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span style={{ color: '#6F4E37', fontWeight: '500' }}>
                  {user.username || 'User'}
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

      {showHomePage ? (
        <HomePage 
          onBrowseCafes={() => setShowHomePage(false)} 
          onShowAbout={() => setShowAboutModal(true)}
        />
      ) : (
        <main className="main-content">
          <div className="container">
            <div className="actions-bar">
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

          {showProfile && <Profile onClose={() => setShowProfile(false)} />}
          {showAdminTools && <AdminTools onClose={() => setShowAdminTools(false)} />}
          
          {showAuth && (
            <div className="modal-overlay" onClick={() => setShowAuth(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <Auth onSuccess={handleAuthSuccess} />
              </div>
            </div>
          )}

          {viewMode === 'list' ? (
            <>
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                coffeeShops={data?.coffeeShops || []}
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
                onEditReview={handleEditReview}
                onDeleteReview={handleDeleteReview}
                onShowAuth={() => setShowAuth(true)}
              />
            </>
          ) : (
            <CoffeeShopMap coffeeShops={data?.coffeeShops || []} />
          )}
        </div>
      </main>
      )}

      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}
    </div>
  );
}

export default App;

