const prisma = require("../config/db");

const farmerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
};

const FollowModel = {
  // Find an existing follow relationship
  findOne: async (followerId, followingId) => {
    return await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  },

  // Follow a farmer
  add: async (followerId, followingId) => {
    return await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  },

  // Unfollow a farmer
  remove: async (followerId, followingId) => {
    return await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  },

  // Get all farmers followed by a user
  findByFollower: async (followerId) => {
    return await prisma.follow.findMany({
      where: {
        followerId,
      },
      include: {
        following: {
          select: farmerSelect,
        },
      },
    });
  },

  // Find a farmer/user by ID
  findFarmer: async (farmerId) => {
    return await prisma.user.findUnique({
      where: {
        id: farmerId,
      },
    });
  },
};

module.exports = FollowModel;