const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOffer, getMyOffers, getOffers, getActiveOffers, reviewOffer } = require('../controllers/offerController');

router.post('/', protect, createOffer);
router.get('/my', protect, getMyOffers);
router.get('/active', protect, getActiveOffers);
router.get('/', protect, getOffers);
router.patch('/:id/:action', protect, reviewOffer);

module.exports = router;