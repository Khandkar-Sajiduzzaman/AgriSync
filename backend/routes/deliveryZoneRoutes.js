const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createDeliveryZone,
  getMyDeliveryZones,
  updateDeliveryZone,
  deleteDeliveryZone,
  checkDeliveryCoverage,
  getFarmersInZone,
} = require('../controllers/deliveryZoneController');

// Public check endpoint
router.get('/check', checkDeliveryCoverage);

// Public: get farmers in a zone
router.get('/:id/farmers', getFarmersInZone);

// Farmer-only CRUD
router.post('/', protect, createDeliveryZone);
router.get('/my', protect, getMyDeliveryZones);
router.put('/:id', protect, updateDeliveryZone);
router.delete('/:id', protect, deleteDeliveryZone);

module.exports = router;