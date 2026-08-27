const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const { updateDeliveryLocation } = require("../controllers/orderController");

const {
  findNearbyDeliveryMen,
  sendDeliveryRequest,
  respondToDeliveryRequest,
  getDeliveryRequests,
  getMyActiveDeliveries,
  markDeliveryStarted,
  startBatchDelivery,
  getNormalDeliveryBatches,
  updateDeliveryPreferences,
  getMyNotifications,
  markNotificationRead,
} = require("../controllers/deliveryController");

// Existing: delivery man updates their GPS location
router.put("/location", protect, updateDeliveryLocation);

// NEW: Farmer searches for nearby delivery men
router.post("/find-nearby", protect, findNearbyDeliveryMen);

// NEW: Farmer sends a delivery request to a specific delivery man
router.post("/send-request", protect, sendDeliveryRequest);

// NEW: Delivery man accepts or rejects a request
router.put("/respond-request/:requestId", protect, respondToDeliveryRequest);

// NEW: Delivery man views their pending requests
router.get("/my-requests", protect, getDeliveryRequests);

// NEW: Delivery man views all their active deliveries
router.get("/my-deliveries", protect, getMyActiveDeliveries);

// NEW: Delivery man marks a single order as out_for_delivery
router.put("/start-delivery/:orderId", protect, markDeliveryStarted);

// NEW: Delivery man starts batch delivery for normal orders in a city
router.put("/start-batch", protect, startBatchDelivery);

// NEW: View available normal delivery batches by city
router.get("/batches", protect, getNormalDeliveryBatches);

// NEW: Delivery man updates their preferences (areas, max orders)
router.put("/preferences", protect, updateDeliveryPreferences);

// NEW: Get my notifications
router.get("/notifications", protect, getMyNotifications);

// NEW: Mark a notification as read
router.put("/notifications/:id/read", protect, markNotificationRead);

module.exports = router;