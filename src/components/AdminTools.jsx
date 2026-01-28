import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { seedCoffeeShops, checkIfShopsExist, coffeeShopsData } from '../utils/seedCoffeeShops';
import { isOwner } from '../utils/auth';

export default function AdminTools({ onClose }) {
  const { user } = db.useAuth();
  
  // Query user data to get email
  const { data: userData } = db.useQuery(
    user?.id ? {
      users: {
        $: {
          where: {
            id: user.id,
          },
        },
      },
    } : {}
  );
  
  const currentUserData = userData?.users?.[0];
  
  // Check ownership and prevent access if not owner
  useEffect(() => {
    if (currentUserData?.email && !isOwner(currentUserData.email)) {
      // User is not owner, close the modal
      onClose();
    }
  }, [currentUserData?.email, onClose]);
  
  // Early return if not owner
  if (currentUserData?.email && !isOwner(currentUserData.email)) {
    return null; // Don't render anything for non-owners
  }
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [shopsExist, setShopsExist] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  const handleCheckShops = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const exists = await checkIfShopsExist();
      setShopsExist(exists);
      setMessage(exists 
        ? 'Coffee shops already exist in the database' 
        : 'No coffee shops found. You can seed sample data.'
      );
    } catch (err) {
      setError('Failed to check coffee shops');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedShops = async () => {
    if (!user || !user.id) {
      setError('You must be signed in to seed coffee shops');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await seedCoffeeShops(user.id);
      
      if (result.success) {
        setMessage(`Successfully added ${result.count} coffee shops! Refresh the page to see them on the map.`);
        setShopsExist(true);
      } else {
        setError(result.error || 'Failed to seed coffee shops');
      }
    } catch (err) {
      setError(err.message || 'Failed to seed coffee shops');
    } finally {
      setLoading(false);
    }
  };

  const handleFindDuplicates = async () => {
    setDuplicateLoading(true);
    setDuplicateError('');
    setDuplicateMessage('');
    setDuplicates([]);

    try {
      // Fetch all coffee shops with their reviews
      const { data } = await db.queryOnce({
        coffeeShops: {
          reviews: {
            reviewer: {},
          },
        },
      });

      const shops = data?.coffeeShops || [];
      
      if (shops.length === 0) {
        setDuplicateMessage('No coffee shops found in database');
        return;
      }

      // Group shops by normalized name and location
      const groupedShops = {};
      
      shops.forEach((shop) => {
        const normalizedName = shop.name?.toLowerCase().trim() || '';
        const normalizedLocation = shop.location?.toLowerCase().trim() || '';
        
        // Create a unique key for grouping
        const key = `${normalizedName}|||${normalizedLocation}`;
        
        if (!groupedShops[key]) {
          groupedShops[key] = [];
        }
        groupedShops[key].push(shop);
      });

      // Filter out groups with only one shop (not duplicates)
      const duplicateGroups = Object.entries(groupedShops)
        .filter(([_, shops]) => shops.length > 1)
        .map(([key, shops]) => {
          const [name, location] = key.split('|||');
          return {
            name,
            location,
            shops: shops.map(shop => ({
              ...shop,
              reviewCount: shop.reviews?.length || 0,
            })),
          };
        });

      if (duplicateGroups.length === 0) {
        setDuplicateMessage('✅ No duplicates found! Your database is clean.');
      } else {
        setDuplicates(duplicateGroups);
        setDuplicateMessage(`Found ${duplicateGroups.length} duplicate group(s) with ${duplicateGroups.reduce((sum, g) => sum + g.shops.length, 0)} total duplicate shops.`);
      }
    } catch (err) {
      console.error('Error finding duplicates:', err);
      setDuplicateError('Failed to find duplicates: ' + err.message);
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handleMergeDuplicates = async (duplicateGroup, primaryShopId) => {
    if (!window.confirm(
      `Are you sure you want to merge all reviews into the selected shop and delete the duplicates?\n\n` +
      `This will:\n` +
      `- Move all reviews to the primary shop\n` +
      `- Delete the duplicate shops\n` +
      `- This action cannot be undone!`
    )) {
      return;
    }

    setDuplicateLoading(true);
    setDuplicateError('');

    try {
      const transactions = [];
      let totalReviewsMoved = 0;

      // For each shop in the duplicate group
      for (const shop of duplicateGroup.shops) {
        if (shop.id === primaryShopId) {
          // Skip the primary shop
          continue;
        }

        // Move all reviews from this shop to the primary shop
        if (shop.reviews && shop.reviews.length > 0) {
          for (const review of shop.reviews) {
            transactions.push(
              db.tx.reviews[review.id].update({
                shop: primaryShopId,
              })
            );
            totalReviewsMoved++;
          }
        }

        // Delete the duplicate shop
        transactions.push(db.tx.coffeeShops[shop.id].delete());
      }

      if (transactions.length > 0) {
        await db.transact(transactions);
        setDuplicateMessage(`✅ Successfully merged ${totalReviewsMoved} reviews and removed ${duplicateGroup.shops.length - 1} duplicate shop(s)!`);
        
        // Refresh the duplicate list
        setTimeout(() => handleFindDuplicates(), 1000);
      }
    } catch (err) {
      console.error('Error merging duplicates:', err);
      setDuplicateError('Failed to merge duplicates: ' + err.message);
    } finally {
      setDuplicateLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <h2>🛠️ Admin Tools</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Manage and populate coffee shop data
        </p>

        <div className="admin-section">
          <h3>Seed Sample Coffee Shops</h3>
          <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1rem' }}>
            Add {coffeeShopsData.length} sample coffee shops with real locations across major US cities.
            This is great for testing the map feature!
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button
              onClick={handleCheckShops}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? 'Checking...' : '🔍 Check Database'}
            </button>
            
            <button
              onClick={handleSeedShops}
              disabled={loading || shopsExist === true}
              className="btn btn-primary"
            >
              {loading ? '⏳ Seeding...' : '🌱 Seed Coffee Shops'}
            </button>
          </div>

          {shopsExist !== null && (
            <div style={{ 
              padding: '1rem', 
              background: shopsExist ? '#fef3c7' : '#dbeafe',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ margin: 0, color: '#1e293b' }}>
                {shopsExist ? '✅ Database has coffee shops' : '📭 Database is empty'}
              </p>
            </div>
          )}

          {message && (
            <div className="success-message" style={{ marginBottom: '1rem' }}>
              {message}
            </div>
          )}

          {error && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ 
            background: '#f8fafc', 
            padding: '1rem', 
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <h4 style={{ marginTop: 0 }}>ℹ️ What gets added:</h4>
            <ul style={{ marginBottom: 0, fontSize: '0.9rem', color: '#64748b' }}>
              <li>5 shops in San Francisco</li>
              <li>4 shops in Los Angeles</li>
              <li>4 shops in New York</li>
              <li>4 shops in Seattle</li>
              <li>4 shops in Portland</li>
              <li>3 shops in Chicago</li>
            </ul>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
              ✅ All verified open locations (no Starbucks, no closed shops)
            </p>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
              📍 Includes real addresses and GPS coordinates
            </p>
          </div>
        </div>

        {/* Duplicate Finder Section */}
        <div className="admin-section" style={{ marginTop: '2rem' }}>
          <h3>🔍 Find & Merge Duplicates</h3>
          <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1rem' }}>
            Scan for duplicate coffee shops (same name and location) and merge them into a single entry.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={handleFindDuplicates}
              disabled={duplicateLoading}
              className="btn btn-primary"
            >
              {duplicateLoading ? '🔍 Scanning...' : '🔍 Find Duplicates'}
            </button>
          </div>

          {duplicateMessage && (
            <div className="success-message" style={{ marginBottom: '1rem' }}>
              {duplicateMessage}
            </div>
          )}

          {duplicateError && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              {duplicateError}
            </div>
          )}

          {duplicates.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Found Duplicates:</h4>
              {duplicates.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  style={{
                    background: '#fff7ed',
                    border: '2px solid #fdba74',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#1e293b' }}>
                      {group.name || 'Unnamed Shop'}
                    </strong>
                    {group.location && (
                      <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem' }}>
                        📍 {group.location}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#dc2626', marginBottom: '1rem' }}>
                    ⚠️ {group.shops.length} duplicate entries found
                  </div>

                  {group.shops.map((shop, shopIndex) => (
                    <div
                      key={shop.id}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Shop #{shopIndex + 1}
                        </div>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                          📝 {shop.reviewCount} review{shop.reviewCount !== 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          ID: {shop.id.substring(0, 8)}...
                        </div>
                      </div>
                      <button
                        onClick={() => handleMergeDuplicates(group, shop.id)}
                        disabled={duplicateLoading}
                        className="btn btn-primary btn-small"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Keep This One
                      </button>
                    </div>
                  ))}

                  <div
                    style={{
                      background: '#f1f5f9',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginTop: '0.75rem',
                      fontSize: '0.85rem',
                      color: '#475569',
                    }}
                  >
                    💡 Click "Keep This One" on the shop you want to keep. All reviews from other duplicates will be moved to it, and the duplicates will be deleted.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
