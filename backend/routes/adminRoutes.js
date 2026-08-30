const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getStats,
  getAllUsers,
  updateUserStatus,
  getAllProductsAdmin,
  getPendingProducts,
  approveProduct,
  removeProduct,
  restoreProduct,
  getActionLogs,
  generateSalesReport,
  getSalesReports,
  getSalesReportById,
} = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/products', getAllProductsAdmin);
router.get('/products/pending', getPendingProducts);
router.put('/products/:id/approve', approveProduct);
router.put('/products/:id/remove', removeProduct);
router.put('/products/:id/restore', restoreProduct);
router.get('/action-logs', getActionLogs);

// Sales Report routes
router.post('/reports/sales', generateSalesReport);
router.get('/reports/sales', getSalesReports);
router.get('/reports/sales/:id', getSalesReportById);

module.exports = router;