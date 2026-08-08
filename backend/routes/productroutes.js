const express = require("express");
const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { getMyProducts } = require("../controllers/productController");
// Create a product (Farmer only)
router.post("/", protect, createProduct);

// View all products
router.get("/", getProducts);

// View one product
router.get("/:id", getProductById);

// Update product
router.put("/:id", protect, updateProduct);

// Delete product
router.delete("/:id", protect, deleteProduct);

// Upload product image
router.put(
  "/:id/image",
  protect,
  upload.single("productImage"),
  uploadProductImage
);

// Get MY products (Farmer only)
router.get("/my", protect, getMyProducts);

module.exports = router;