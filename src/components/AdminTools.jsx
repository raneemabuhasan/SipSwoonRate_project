import React, { useState } from 'react';
import { db } from '../db';
import { seedCoffeeShops, checkIfShopsExist, coffeeShopsData } from '../utils/seedCoffeeShops';

export default function AdminTools({ onClose }) {
  const { user } = db.useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [shopsExist, setShopsExist] = useState(null);

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

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
