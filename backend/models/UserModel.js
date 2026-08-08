const prisma = require("../config/db");

const UserModel = {
  // Find user by email
  findByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: {
        email,
      },
    });
  },

  // Create user
  create: async (data) => {
    return await prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  },

  // Find user by ID
  findById: async (id) => {
    return await prisma.user.findUnique({
      where: {
        id,
      },
    });
  },

  // Update user profile
  update: async (id, data) => {
    return await prisma.user.update({
      where: {
        id,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        bio: true,
        profileImage: true,
      },
    });
  },

  // Update profile image
  updateProfileImage: async (id, profileImage) => {
    return await prisma.user.update({
      where: {
        id,
      },
      data: {
        profileImage,
      },
      select: {
        profileImage: true,
      },
    });
  },

  // Delete user
  delete: async (id) => {
    return await prisma.user.delete({
      where: {
        id,
      },
    });
  },
};

module.exports = UserModel;