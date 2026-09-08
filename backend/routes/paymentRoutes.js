const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createBkashPayment,
  bkashCallback,
} = require("../controllers/paymentController");

router.post("/bkash/create", protect, createBkashPayment);
router.get("/bkash/callback", bkashCallback);

module.exports = router;
