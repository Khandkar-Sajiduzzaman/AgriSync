const express = require("express");
const router = express.Router();

const {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getOrderTracking,
  addTrackingUpdate,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

router.route("/")
  .post(protect, placeOrder)
  .get(protect, getMyOrders);

router.get("/:id", protect, getOrderById);

router.put("/:id/status", protect, updateOrderStatus);

router.route("/:id/tracking")
  .get(protect, getOrderTracking)
  .post(protect, addTrackingUpdate);

module.exports = router;