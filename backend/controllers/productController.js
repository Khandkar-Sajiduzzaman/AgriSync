const prisma = require('../config/db');

const shapeProduct = (product) => {
  if (!product) return product;
  return {
    ...product,
    _id: product.id,
    category: product.legacyCategory,
    price: product.price?.toNumber ? product.price.toNumber() : product.price,
    farmer: product.farmer
      ? { ...product.farmer, _id: product.farmer.id }
      : product.farmer,
  };
};

const createProduct = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can add products' });
    }

    const { name, description, category, price, stock } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ message: 'Name, category and price are required' });
    }

    const product = await prisma.product.create({
      data: {
        farmerId: req.user.id,
        name,
        description: description || '',
        legacyCategory: category,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        images: [],
      },
      include: { farmer: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });

    res.status(201).json(shapeProduct(product));
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, page, limit, farmer } = req.query;
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

    if (farmer) {
      where.farmer = {
        name: { contains: farmer, mode: 'insensitive' }
      };
    }

    const currentPage = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 12;
    const skip = (currentPage - 1) * pageSize;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          farmer: {
            select: { id: true, name: true }
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
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { farmer: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(shapeProduct(product));
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: error.message });
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

    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.legacyCategory = category;
    if (price !== undefined) data.price = parseFloat(price);
    if (stock !== undefined) data.stock = parseInt(stock);

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { farmer: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });

    res.json(shapeProduct(updated));
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: error.message });
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

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: error.message });
  }
};

const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.farmerId !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedImages = [...product.images, `/uploads/${req.file.filename}`];

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { images: updatedImages },
      include: { farmer: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });

    res.json(shapeProduct(updated));
  } catch (error) {
    console.error('Upload product image error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getRecommendations = async (req, res) => {
  try {
    let recommended = [];
    const limit = 6;

    if (req.user && req.user.role === 'buyer') {
      const [orders, views, wishlist] = await Promise.all([
        prisma.order.findMany({
          where: { buyerId: req.user.id },
          include: { items: { include: { product: true } } }
        }).catch(() => []),
        prisma.productView.findMany({
          where: { buyerId: req.user.id },
          include: { product: true }
        }).catch(() => []),
        prisma.wishlist.findMany({
          where: { userId: req.user.id },
          include: { product: true }
        }).catch(() => []),
      ]);

      const categoryWeights = {};
      
      orders.forEach(order => {
        order.items.forEach(item => {
          const cat = item.product?.legacyCategory;
          if (cat) categoryWeights[cat] = (categoryWeights[cat] || 0) + 3;
        });
      });

      views.forEach(view => {
        const cat = view.product?.legacyCategory;
        if (cat) categoryWeights[cat] = (categoryWeights[cat] || 0) + 1;
      });

      wishlist.forEach(item => {
        const cat = item.product?.legacyCategory;
        if (cat) categoryWeights[cat] = (categoryWeights[cat] || 0) + 2;
      });

      console.log('Recommendation weights for buyer', req.user.id, ':', categoryWeights);

      const preferredCategories = Object.keys(categoryWeights)
        .sort((a, b) => categoryWeights[b] - categoryWeights[a])
        .slice(0, 3);

      console.log('Preferred categories:', preferredCategories);

      if (preferredCategories.length > 0) {
        recommended = await prisma.product.findMany({
          where: {
            legacyCategory: { in: preferredCategories },
            isAvailable: true
          },
          orderBy: { averageRating: 'desc' },
          take: limit,
          include: { farmer: { select: { id: true, name: true, email: true, phone: true, address: true } } }
        });
      }
    }

    if (recommended.length < limit) {
      const excludeIds = recommended.map(p => p.id);
      const fallbackProducts = await prisma.product.findMany({
        where: {
          isAvailable: true,
          id: { notIn: excludeIds.length ? excludeIds : undefined }
        },
        orderBy: { averageRating: 'desc' },
        take: limit - recommended.length,
        include: { farmer: { select: { id: true, name: true, email: true, phone: true, address: true } } }
      });
      recommended = [...recommended, ...fallbackProducts];
    }

    console.log('Returning', recommended.length, 'recommendations');
    res.json(recommended.map(shapeProduct));
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: error.message });
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
          select: { id: true, name: true, email: true, phone: true, address: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products.map(shapeProduct));
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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