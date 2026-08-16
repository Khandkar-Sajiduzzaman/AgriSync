const express = require('express');
const router = express.Router();

const {
  createInventoryRequest,
  getMyInventoryRequests,
  getInventoryRequests,
  approveInventoryRequest,
  rejectInventoryRequest,
  getInventoryOverview,
  getInventoryProducts,
  getInventoryHistory,
  adjustInventoryStock,
} = require('../controllers/inventoryController');

const { protect } = require('../middleware/authMiddleware');

router.post('/requests', protect, createInventoryRequest);
router.get('/requests/my', protect, getMyInventoryRequests);
router.get('/requests', protect, getInventoryRequests);
router.patch('/requests/:id/approve', protect, approveInventoryRequest);
router.patch('/requests/:id/reject', protect, rejectInventoryRequest);

router.get('/overview', protect, getInventoryOverview);
router.get('/products', protect, getInventoryProducts);
router.get('/history', protect, getInventoryHistory);
router.patch('/products/:id/adjust', protect, adjustInventoryStock);

module.exports = router;
