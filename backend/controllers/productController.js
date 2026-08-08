const ProductModel = require("../models/ProductModel");

const shapeProduct = (product) => {
  if (!product) return product;

  return {
    ...product,
    _id: product.id,
    farmer: product.farmer
      ? {
          ...product.farmer,
          _id: product.farmer.id,
        }
      : product.farmer,
  };
};

// CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res
        .status(403)
        .json({ message: "Only farmers can add products" });
    }

    const {
      name,
      description,
      category,
      price,
      stock,
    } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        message: "Name, category and price are required",
      });
    }

    const product = await ProductModel.create({
      farmerId: req.user.id,
      name,
      description: description || "",
      legacyCategory: category,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      images: [],
    });

    res.status(201).json(shapeProduct(product));
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET PRODUCTS
const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
    } = req.query;

    const where = {};

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (category) {
      where.legacyCategory = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};

      if (minPrice) {
        where.price.gte = parseFloat(minPrice);
      }

      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice);
      }
    }

    const products = await ProductModel.findAll(where);

    res.json(products.map(shapeProduct));
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(shapeProduct(product));
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const product = await ProductModel.findBasicById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.farmerId !== req.user.id) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    const {
      name,
      description,
      category,
      price,
      stock,
    } = req.body;

    const data = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (description !== undefined) {
      data.description = description;
    }

    if (category !== undefined) {
      data.legacyCategory = category;
    }

    if (price !== undefined) {
      data.price = parseFloat(price);
    }

    if (stock !== undefined) {
      data.stock = parseInt(stock);
    }

    const updated = await ProductModel.update(
      req.params.id,
      data
    );

    res.json(shapeProduct(updated));
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const product = await ProductModel.findBasicById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.farmerId !== req.user.id) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    await ProductModel.delete(req.params.id);

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: error.message });
  }
};

// UPLOAD PRODUCT IMAGE
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const product = await ProductModel.findBasicById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.farmerId !== req.user.id) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    const updatedImages = [
      ...product.images,
      `/uploads/${req.file.filename}`,
    ];

    const updated = await ProductModel.updateImages(
      req.params.id,
      updatedImages
    );

    res.json(shapeProduct(updated));
  } catch (error) {
    console.error("Upload product image error:", error);
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