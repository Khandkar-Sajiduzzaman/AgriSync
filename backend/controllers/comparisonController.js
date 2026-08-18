const prisma = require('../config/db');

// Helper: safely parse nutritionInfo (stored as a JSON string in a Text column)
// Falls back gracefully for legacy plain-text values or missing data.
const parseNutrition = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch (err) {
    // Legacy plain-text nutritionInfo (pre-dates structured JSON) — surface it as a note
    return { note: raw };
  }
};

// Helper: shape a product for the comparison view
const shapeForComparison = (product) => ({
  _id: product.id,
  name: product.name,
  images: product.images,
  price: product.price ? Number(product.price) : 0,
  unit: product.unit,
  category: product.legacyCategory,
  averageRating: product.averageRating,
  totalReviews: product.totalReviews,
  stock: product.stock,
  isAvailable: product.isAvailable && product.stock > 0 && !product.isRemoved,
  nutrition: parseNutrition(product.nutritionInfo),
  origin: product.origin,
  farmer: product.farmer
    ? { _id: product.farmer.id, name: product.farmer.name }
    : null,
});

// GET /api/comparisons/products?ids=id1,id2,id3
// Public endpoint — buyers don't need to be logged in to compare
const getProductsForComparison = async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({ message: 'Provide product ids as ?ids=id1,id2,id3' });
    }

    const idList = [...new Set(
      ids.split(',').map((id) => id.trim()).filter(Boolean)
    )];

    if (idList.length === 0) {
      return res.status(400).json({ message: 'No valid product ids provided' });
    }

    if (idList.length > 4) {
      return res.status(400).json({ message: 'You can compare up to 4 products at a time' });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: idList },
        isRemoved: false,
      },
      include: {
        farmer: { select: { id: true, name: true } },
      },
    });

    // Preserve the order the buyer selected them in
    const ordered = idList
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    res.json(ordered.map(shapeForComparison));
  } catch (error) {
    console.error('Get comparison products error:', error);
    res.status(500).json({ message: 'Failed to load products for comparison' });
  }
};

module.exports = { getProductsForComparison };