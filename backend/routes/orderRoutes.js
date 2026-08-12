const express = require("express");
const router = express.Router();

const {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getOrderTracking,
  addTrackingUpdate,
  getAvailableDeliveryMen,
  assignDeliveryMan,
  getLatestTracking,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

router.route("/")
  .post(protect, placeOrder)
  .get(protect, getMyOrders);

// Must be BEFORE /:id so Express doesn't treat "available-delivery-men" as an order ID
router.get("/available-delivery-men", protect, getAvailableDeliveryMen);

router.get("/:id", protect, getOrderById);
router.put("/:id/status", protect, updateOrderStatus);
router.put("/:id/assign-delivery", protect, assignDeliveryMan);
router.get("/:id/latest-tracking", protect, getLatestTracking);

router.route("/:id/tracking")
  .get(protect, getOrderTracking)
  .post(protect, addTrackingUpdate);

module.exports = router;