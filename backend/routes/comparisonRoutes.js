const express = require("express");
const router = express.Router();

const { getProductsForComparison } = require("../controllers/comparisonController");

// Public — buyers can compare without logging in (matches getProducts behavior)
router.get("/products", getProductsForComparison);

module.exports = router;