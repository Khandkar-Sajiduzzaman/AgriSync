const prisma = require('../config/db');

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
        category,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        images: [],
      },
      include: {
        farmer: { select: { name: true, phone: true, address: true } },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice } = req.query;
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

    const products = await prisma.product.findMany({
      where,
      include: { farmer: { select: { name: true, phone: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { farmer: { select: { name: true, phone: true, address: true } } },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
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
    if (category !== undefined) data.category = category;
    if (price !== undefined) data.price = parseFloat(price);
    if (stock !== undefined) data.stock = parseInt(stock);

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { farmer: { select: { name: true, phone: true, address: true } } },
    });

    res.json(updated);
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
      include: { farmer: { select: { name: true, phone: true, address: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error('Upload product image error:', error);
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
};