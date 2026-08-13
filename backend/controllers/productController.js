const prisma = require('../config/db');

// Helper: convert Prisma Decimal to plain number + add _id alias for frontend compatibility
const shapeProduct = (product) => ({
  ...product,
  _id: product.id,
  id: undefined,
  farmer: product.farmer
    ? {
        _id: product.farmer.id,
        name: product.farmer.name,
        // SECURITY: Removed email, phone, address from public view
      }
    : null,
});

const createProduct = async (req, res) => {
  try {
    // SECURITY & BUG FIX: Destructure FIRST, then validate
    const { name, description, category, price, stock } = req.body;

    if (!name || name.trim().length < 2 || name.trim().length > 200) {
      return res.status(400).json({ message: 'Name must be 2-200 characters' });
    }

    const productPrice = parseFloat(price);
    if (isNaN(productPrice) || productPrice < 0 || productPrice > 1000000) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    const productStock = parseInt(stock) || 0;
    if (productStock < 0 || productStock > 1000000) {
      return res.status(400).json({ message: 'Invalid stock' });
    }

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can add products' });
    }

    if (!name || !category || price === undefined) {
      return res.status(400).json({ message: 'Name, category and price are required' });
    }

    const product = await prisma.product.create({
      data: {
        farmerId: req.user.id,
        name: name.trim(),
        description: description ? description.trim() : '',
        legacyCategory: category,
        price: productPrice,
        stock: productStock,
        images: [],
      },
      include: { farmer: { select: { id: true, name: true } } }, // SECURITY: no email/phone
    });

    res.status(201).json(shapeProduct(product));
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, page, limit } = req.query;
    const where = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (category) {
      where.legacyCategory = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit) || 12)); // SECURITY: Cap max page size
    const skip = (currentPage - 1) * pageSize;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          farmer: {
            select: { id: true, name: true } // SECURITY: Removed email, phone, address
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      data: products.map(shapeProduct),
      total,
      page: currentPage,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { 
        farmer: { 
          select: { id: true, name: true } // SECURITY: Removed email, phone, address
        } 
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(shapeProduct(product));
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.farmerId !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { name, description, category, price, stock } = req.body;
    const data = {};

    if (name !== undefined) {
      if (name.trim().length < 2 || name.trim().length > 200) {
        return res.status(400).json({ message: 'Name must be 2-200 characters' });
      }
      data.name = name.trim();
    }
    if (description !== undefined) data.description = description.trim();
    if (category !== undefined) data.legacyCategory = category;
    if (price !== undefined) {
      const productPrice = parseFloat(price);
      if (isNaN(productPrice) || productPrice < 0 || productPrice > 1000000) {
        return res.status(400).json({ message: 'Invalid price' });
      }
      data.price = productPrice;
    }
    if (stock !== undefined) {
      const productStock = parseInt(stock);
      if (isNaN(productStock) || productStock < 0 || productStock > 1000000) {
        return res.status(400).json({ message: 'Invalid stock' });
      }
      data.stock = productStock;
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { farmer: { select: { id: true, name: true } } },
    });

    res.json(shapeProduct(updated));
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.farmerId !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // SECURITY: Prevent deleting products in active orders
    const activeOrderItem = await prisma.orderItem.findFirst({
      where: {
        productId: req.params.id,
        order: { status: { notIn: ['cancelled', 'refunded', 'delivered'] } },
      },
    });

    if (activeOrderItem) {
      return res.status(400).json({ message: 'Cannot delete product with active orders' });
    }

    // SECURITY: Soft delete so past orders still show product info
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isRemoved: true },
    });

    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

const uploadProductImage = async (req, res) => {
  try {
    if (!req.processedFile) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.farmerId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const updatedImages = [...product.images, `/uploads/${req.processedFile.filename}`];

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { images: updatedImages },
      include: { farmer: { select: { id: true, name: true } } }
    });

    res.json(shapeProduct(updated));
  } catch (error) {
    console.error('Upload product image error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};

// ===== SMART RECOMMENDATIONS =====
const getRecommendations = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can get recommendations' });
    }

    // BUG FIX: Use productView (not productInteraction, which doesn't exist in schema)
    const interactions = await prisma.productView.findMany({
      where: { buyerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const viewedProductIds = interactions.map((i) => i.productId);
    const uniqueViewed = [...new Set(viewedProductIds)];

    let recommended = [];
    if (uniqueViewed.length > 0) {
      const lastViewed = await prisma.product.findUnique({
        where: { id: uniqueViewed[0] },
      });

      if (lastViewed) {
        recommended = await prisma.product.findMany({
          where: {
            isAvailable: true,
            isRemoved: false,
            isApproved: true,
            id: { notIn: uniqueViewed },
            OR: [
              { legacyCategory: lastViewed.legacyCategory },
              { category: lastViewed.category },
            ],
          },
          include: {
            farmer: {
              select: { id: true, name: true } // SECURITY: no email/phone
            },
          },
          take: 8,
        });
      }
    }

    if (recommended.length === 0) {
      recommended = await prisma.product.findMany({
        where: {
          isAvailable: true,
          isRemoved: false,
          isApproved: true,
        },
        include: {
          farmer: {
            select: { id: true, name: true } // SECURITY: no email/phone
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });
    }

    res.json(recommended.map(shapeProduct));
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Failed to load recommendations' });
  }
};

const recordProductView = async (req, res) => {
  try {
    if (req.user && req.user.role === 'buyer') {
      await prisma.productView.create({
        data: {
          buyerId: req.user.id,
          productId: req.params.id
        }
      });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
};

const getMyProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { farmerId: req.user.id },
      include: {
        farmer: {
          select: { id: true, name: true } // SECURITY: removed email, phone, address
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products.map(shapeProduct));
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

const getProductCategories = async (req, res) => {
  try {
    const rows = await prisma.product.findMany({
      where: { legacyCategory: { not: null } },
      select: { legacyCategory: true },
    });

    const uniqueCategories = [...new Set(rows.map((r) => r.legacyCategory))].filter(Boolean);
    res.json(uniqueCategories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getMyProducts,
  getProductCategories,
  getRecommendations,
  recordProductView,
};