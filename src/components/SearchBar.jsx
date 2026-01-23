import React, { useState, useRef, useEffect } from 'react';

export default function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  coffeeShops = [], 
  minRating, 
  onMinRatingChange, 
  sortBy, 
  onSortChange 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const suggestionRef = useRef(null);

  // Generate suggestions based on search query
  const getSuggestions = (query, shops) => {
    if (!query || query.trim().length === 0) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    
    // Exact name matches first
    const exactMatches = shops.filter(shop => 
      shop.name && shop.name.toLowerCase().startsWith(lowerQuery)
    );
    
    // Partial matches
    const partialMatches = shops.filter(shop => 
      shop.name && 
      shop.name.toLowerCase().includes(lowerQuery) &&
      !shop.name.toLowerCase().startsWith(lowerQuery)
    );
    
    // Location matches
    const locationMatches = shops.filter(shop => 
      shop.location && 
      shop.location.toLowerCase().includes(lowerQuery) &&
      !exactMatches.includes(shop) &&
      !partialMatches.includes(shop)
    );
    
    // Remove duplicates and limit to 7
    const uniqueMatches = [...exactMatches, ...partialMatches, ...locationMatches];
    return uniqueMatches.slice(0, 7);
  };

  // Update suggestions when search query or coffee shops change
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0) {
      const newSuggestions = getSuggestions(searchQuery, coffeeShops);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, coffeeShops]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      default:
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (shop) => {
    onSearchChange(shop.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Highlight matching text in suggestion
  const highlightMatch = (text, query) => {
    if (!text || !query) return text;
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span className="suggestion-highlight">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  };

  return (
    <div className="search-bar">
      <div className="search-input-group" ref={suggestionRef}>
        <input
          type="text"
          placeholder="Search coffee shops..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery && searchQuery.trim().length > 0 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className="search-input"
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((shop, index) => (
              <div
                key={shop.id}
                className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                onClick={() => selectSuggestion(shop)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
              >
                <div className="suggestion-name">
                  {highlightMatch(shop.name, searchQuery)}
                </div>
                {shop.location && (
                  <div className="suggestion-location">
                    📍 {highlightMatch(shop.location, searchQuery)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {showSuggestions && searchQuery && suggestions.length === 0 && (
          <div className="search-suggestions">
            <div className="suggestion-item suggestion-empty">
              No coffee shops found matching "{searchQuery}"
            </div>
          </div>
        )}
      </div>

      <div className="filter-group">
        <label htmlFor="minRating">Minimum Rating:</label>
        <select
          id="minRating"
          value={minRating || ''}
          onChange={(e) => onMinRatingChange(e.target.value ? parseInt(e.target.value) : null)}
          className="filter-select"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4+ Stars</option>
          <option value="3">3+ Stars</option>
          <option value="2">2+ Stars</option>
          <option value="1">1+ Stars</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="sortBy">Sort By:</label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="filter-select"
        >
          <option value="newest">Newest First</option>
          <option value="rating">Highest Rated</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>
    </div>
  );
}

