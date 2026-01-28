// Recommendation Engine - Phase 1: Tag-Based Matching

// Scoring weights for different factors
const WEIGHTS = {
  atmosphere: 3,
  priceRange: 2,
  feature: 1,
  useCase: 2,
  distance: 2,
  crowdLevel: 1,
  coffeeStyle: 1,
};

/**
 * Calculate match score between user preferences and a cafe
 * @param {Object} userPreferences - User's questionnaire answers
 * @param {Object} cafe - Cafe object with tags and attributes
 * @returns {number} Match score (0-100)
 */
export function calculateMatchScore(userPreferences, cafe) {
  if (!userPreferences || !cafe) return 0;

  let totalScore = 0;
  let maxPossibleScore = 0;

  // 1. Atmosphere match (3 points)
  maxPossibleScore += WEIGHTS.atmosphere;
  if (userPreferences.atmosphere && cafe.atmosphere === userPreferences.atmosphere) {
    totalScore += WEIGHTS.atmosphere;
  }

  // 2. Price range match (2 points)
  maxPossibleScore += WEIGHTS.priceRange;
  if (userPreferences.priceRange && cafe.priceRange === userPreferences.priceRange) {
    totalScore += WEIGHTS.priceRange;
  }

  // 3. Features match (1 point each)
  if (userPreferences.features && userPreferences.features.length > 0) {
    const cafeTags = cafe.tags || [];
    userPreferences.features.forEach((feature) => {
      maxPossibleScore += WEIGHTS.feature;
      if (cafeTags.includes(feature)) {
        totalScore += WEIGHTS.feature;
      }
    });
  }

  // 4. Use case match (2 points if any match)
  maxPossibleScore += WEIGHTS.useCase;
  if (userPreferences.primaryUse && cafe.bestFor) {
    if (cafe.bestFor.includes(userPreferences.primaryUse)) {
      totalScore += WEIGHTS.useCase;
    }
  }

  // 5. Crowd level match (1 point)
  maxPossibleScore += WEIGHTS.crowdLevel;
  const cafeTags = cafe.tags || [];
  if (userPreferences.crowdLevel && cafeTags.includes(userPreferences.crowdLevel)) {
    totalScore += WEIGHTS.crowdLevel;
  }

  // 6. Coffee style match (1 point)
  maxPossibleScore += WEIGHTS.coffeeStyle;
  if (userPreferences.coffeeStyle === 'any' || !userPreferences.coffeeStyle) {
    totalScore += WEIGHTS.coffeeStyle; // Bonus for flexible users
  } else if (cafeTags.includes(userPreferences.coffeeStyle)) {
    totalScore += WEIGHTS.coffeeStyle;
  }

  // Convert to percentage (0-100)
  const percentage = maxPossibleScore > 0 
    ? Math.round((totalScore / maxPossibleScore) * 100) 
    : 0;

  return percentage;
}

/**
 * Get top recommended cafes for a user
 * @param {Object} userPreferences - User's questionnaire answers
 * @param {Array} allCafes - Array of all cafe objects
 * @param {number} limit - Number of recommendations to return
 * @returns {Array} Top N cafes with match scores
 */
export function getRecommendedCafes(userPreferences, allCafes, limit = 5) {
  if (!userPreferences || !allCafes || allCafes.length === 0) {
    return [];
  }

  // Calculate score for each cafe
  const cafesWithScores = allCafes.map((cafe) => ({
    ...cafe,
    matchScore: calculateMatchScore(userPreferences, cafe),
  }));

  // Filter out cafes with very low scores (< 30%)
  const goodMatches = cafesWithScores.filter(cafe => cafe.matchScore >= 30);

  // Sort by score (highest first)
  const sorted = goodMatches.sort((a, b) => b.matchScore - a.matchScore);

  // Return top N
  return sorted.slice(0, limit);
}

/**
 * Generate explanation for why a cafe is recommended
 * @param {Object} userPreferences - User's questionnaire answers
 * @param {Object} cafe - Cafe object
 * @returns {Array} Array of reason strings
 */
export function getMatchReasons(userPreferences, cafe) {
  const reasons = [];

  if (userPreferences.atmosphere && cafe.atmosphere === userPreferences.atmosphere) {
    reasons.push(`${cafe.atmosphere} atmosphere`);
  }

  if (userPreferences.priceRange && cafe.priceRange === userPreferences.priceRange) {
    reasons.push(`${cafe.priceRange} price range`);
  }

  if (userPreferences.features && cafe.tags) {
    const matchedFeatures = userPreferences.features.filter(f => cafe.tags.includes(f));
    if (matchedFeatures.length > 0) {
      reasons.push(`Has ${matchedFeatures.join(', ')}`);
    }
  }

  if (userPreferences.primaryUse && cafe.bestFor && cafe.bestFor.includes(userPreferences.primaryUse)) {
    reasons.push(`Great for ${userPreferences.primaryUse.replace('-', ' ')}`);
  }

  return reasons;
}

/**
 * Check if user has completed questionnaire
 * @param {Object} user - User object from database
 * @returns {boolean}
 */
export function hasCompletedQuestionnaire(user) {
  return user?.questionnaireCompleted === true && user?.preferences !== null;
}
