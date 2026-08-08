const prisma = require("../config/db");

const farmerSelect = {
  name: true,
  phone: true,
  address: true,
};

const WishlistModel = {
  // Find a specific wishlist entry
  findOne: async (userId, productId) => {
    return await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  },

  // Add product to wishlist
  add: async (userId, productId) => {
    return await prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
    });
  },

  // Remove product from wishlist
  remove: async (userId, productId) => {
    return await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  },

  // Get all wishlist products for a user
  findByUser: async (userId) => {
    return await prisma.wishlist.findMany({
      where: {
        userId,
      },
      include: {
        product: {
          include: {
            farmer: {
              select: farmerSelect,
            },
          },
        },
      },
    });
  },
};

module.exports = WishlistModel;