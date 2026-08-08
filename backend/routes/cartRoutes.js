const express = require("express");
const router = express.Router();

const {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

const { protect } = require("../middleware/authMiddleware");

router.route("/")
  .post(protect, addToCart)
  .get(protect, getCart)
  .delete(protect, clearCart);

router.route("/:productId")
  .put(protect, updateCartQuantity)
  .delete(protect, removeFromCart);

module.exports = router;