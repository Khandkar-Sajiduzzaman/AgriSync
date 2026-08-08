const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createReview,
  getProductReviews,
  getMyReviews,
  deleteReview,
  canReviewProduct,
} = require('../controllers/reviewController');

router.get('/product/:productId', getProductReviews);
router.post('/', protect, createReview);
router.get('/my', protect, getMyReviews);
router.delete('/:id', protect, deleteReview);
router.get('/can-review/:productId', protect, canReviewProduct);

module.exports = router;