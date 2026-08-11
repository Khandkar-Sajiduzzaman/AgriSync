const express = require("express");
const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductCategories,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getMyProducts,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Create a product (Farmer only)
router.post("/", protect, createProduct);

// View all products
router.get("/", getProducts);

// SPECIFIC routes MUST come BEFORE the catch-all /:id route
// Otherwise Express treats "categories" and "my" as product IDs

// Get distinct categories (lightweight — used by browse page filter)
router.get("/categories", getProductCategories);

// Get MY products (Farmer only)
router.get("/my", protect, getMyProducts);

// View one product — this is the CATCH-ALL, keep it LAST
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

module.exports = router;