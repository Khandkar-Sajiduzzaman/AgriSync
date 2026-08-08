const prisma = require("../config/db");

const farmerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
};

const ProductModel = {
  // Create a new product
  create: async (data) => {
    return await prisma.product.create({
      data,
      include: {
        farmer: {
          select: farmerSelect,
        },
      },
    });
  },

  // Get all products
  findAll: async (where = {}) => {
    return await prisma.product.findMany({
      where,
      include: {
        farmer: {
          select: farmerSelect,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  // Get one product by ID
  findById: async (id) => {
    return await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        farmer: {
          select: farmerSelect,
        },
      },
    });
  },

  // Get product without relations
  // Useful when we only need to check ownership
  findBasicById: async (id) => {
    return await prisma.product.findUnique({
      where: {
        id,
      },
    });
  },

  // Update product
  update: async (id, data) => {
    return await prisma.product.update({
      where: {
        id,
      },
      data,
      include: {
        farmer: {
          select: farmerSelect,
        },
      },
    });
  },

  // Delete product
  delete: async (id) => {
    return await prisma.product.delete({
      where: {
        id,
      },
    });
  },

  // Update product images
  updateImages: async (id, images) => {
    return await prisma.product.update({
      where: {
        id,
      },
      data: {
        images,
      },
      include: {
        farmer: {
          select: farmerSelect,
        },
      },
    });
  },
};

module.exports = ProductModel;