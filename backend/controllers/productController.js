const Product = require("../models/Product");

// @route  POST /api/products
// @desc   Create a new product
const createProduct = async (req, res) => {
  try {
    // Only farmers can add products
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can add products",
      });
    }

    const { name, description, category, price, stock } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({
        message: "Name, category and price are required",
      });
    }

    const product = await Product.create({
      farmer: req.user._id,
      name,
      description,
      category,
      price,
      stock,
      images: [],
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// @route GET /api/products
// @desc Get all products
// @route GET /api/products
// @desc Get all products (supports optional search/filter query params)
const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice } = req.query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(filter).populate(
      "farmer",
      "name phone address"
    );

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// @route GET /api/products/:id
// @desc Get one product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "farmer",
      "name phone address"
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// @route PUT /api/products/:id
// @desc Update product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Only owner farmer can edit
    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    product.name = req.body.name || product.name;
    product.description = req.body.description ?? product.description;
    product.category = req.body.category || product.category;
    product.price = req.body.price ?? product.price;
    product.stock = req.body.stock ?? product.stock;

    const updatedProduct = await product.save();

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// @route DELETE /api/products/:id
// @desc Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    await product.deleteOne();

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// @route PUT /api/products/:id/image
// @desc Upload product image
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    product.images.push(`/uploads/${req.file.filename}`);

    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
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