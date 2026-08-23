const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOffer, respondToOffer, getMyNegotiations } = require('../controllers/negotiationController');

router.post('/', protect, createOffer);
router.get('/', protect, getMyNegotiations);
router.put('/:id/respond', protect, respondToOffer);

module.exports = router;