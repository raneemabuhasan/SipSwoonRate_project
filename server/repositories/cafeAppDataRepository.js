import { findFavoriteCafeIds } from './favoritesRepository.js';
import { findReviewsByCafeIds } from './reviewsRepository.js';

export async function attachAppDataToCafes(cafes, appUser = null) {
  const cafeIds = cafes
    .map((cafe) => cafe.postgresId)
    .filter((id) => Number.isInteger(Number(id)));

  if (!cafeIds.length) {
    return cafes.map((cafe) => ({
      ...cafe,
      reviews: cafe.reviews || [],
      reviewCount: cafe.reviewCount || 0,
      avgRating: cafe.avgRating || 0,
      isFavorite: false,
    }));
  }

  const [reviews, favoriteIds] = await Promise.all([
    findReviewsByCafeIds(cafeIds),
    appUser?.appUserId ? findFavoriteCafeIds(appUser.appUserId, cafeIds) : new Set(),
  ]);

  const reviewsByCafeId = new Map();
  reviews.forEach((review) => {
    const existing = reviewsByCafeId.get(review.cafeId) || [];
    reviewsByCafeId.set(review.cafeId, [...existing, review]);
  });

  return cafes.map((cafe) => {
    const cafeReviews = reviewsByCafeId.get(cafe.postgresId) || [];
    const avgRating = cafeReviews.length
      ? cafeReviews.reduce((sum, review) => sum + review.rating, 0) / cafeReviews.length
      : 0;

    return {
      ...cafe,
      reviews: cafeReviews,
      reviewCount: cafeReviews.length,
      avgRating,
      isFavorite: favoriteIds.has(Number(cafe.postgresId)),
    };
  });
}
