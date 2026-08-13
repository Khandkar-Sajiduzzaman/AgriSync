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
  getRecommendations,      // ADD THIS
  recordProductView,       // ADD THIS
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const { upload, processImage } = require("../middleware/uploadMiddleware");

// Create a product (Farmer only)
router.post("/", protect, createProduct);

// View all products
router.get("/", getProducts);

// SPECIFIC routes MUST come BEFORE the catch-all /:id route
router.get("/categories", getProductCategories);
router.get("/my", protect, getMyProducts);

// SMART RECOMMENDATION routes — MUST be before /:id
router.get("/recommendations", protect, getRecommendations);
router.post("/:id/view", protect, recordProductView);

// View one product — CATCH-ALL, keep LAST
router.get("/:id", getProductById);

// Update product
router.put("/:id", protect, updateProduct);

// Delete product
router.delete("/:id", protect, deleteProduct);

// Upload product image
router.put("/:id/image", protect, upload.single("productImage"), processImage, uploadProductImage);
module.exports = router;