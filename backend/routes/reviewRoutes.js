const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createReview,
  getProductReviews,
  getMyReviews,
  deleteReview,
  canReviewProduct,
  getFlaggedReviews,
  moderateReview,
  getReviewStats,
} = require('../controllers/reviewController');

// Public: Get reviews for a product
router.get('/product/:productId', getProductReviews);

// Protected: Create a review
router.post('/', protect, createReview);

// Protected: Get my reviews
router.get('/my', protect, getMyReviews);

// Protected: Delete my review
router.delete('/:id', protect, deleteReview);

// Protected: Check if I can review a product
router.get('/can-review/:productId', protect, canReviewProduct);

// Admin: Get flagged reviews for moderation
router.get('/flagged', protect, getFlaggedReviews);

// Admin: Approve or reject a flagged review
router.patch('/:id/moderate', protect, moderateReview);

// Admin: Get fraud statistics
router.get('/stats', protect, getReviewStats);

module.exports = router;