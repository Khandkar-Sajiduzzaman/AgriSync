const express = require("express");
const router = express.Router();
const { updateDeliveryLocation } = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

router.put("/location", protect, updateDeliveryLocation);

module.exports = router;