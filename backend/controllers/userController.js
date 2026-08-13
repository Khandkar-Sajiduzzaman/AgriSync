const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { userCache } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token dies after 30 days
  });
};

const withId = (obj) => (obj ? { ...obj, _id: obj.id } : obj);

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, vehicleType, licenseNumber } = req.body;

    // SECURITY: Block admin self-registration
    if (role === 'admin') {
      return res.status(403).json({ message: 'Invalid role' });
    }

    // SECURITY: Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    // SECURITY: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // SECURITY: Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // SECURITY: Validate name length
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
    }

    // SECURITY: Validate role is one of allowed values
    const allowedRoles = ['buyer', 'farmer', 'delivery_man'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Role must be buyer, farmer, or delivery_man' });
    }

    const userExists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role,
          phone: phone ? phone.trim().slice(0, 20) : '',
          address: address ? address.trim().slice(0, 255) : '',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (role === 'farmer') {
        await tx.farmerProfile.create({
          data: { userId: newUser.id },
        });
      } else if (role === 'buyer') {
        await tx.buyerProfile.create({
          data: { userId: newUser.id },
        });
      } else if (role === 'delivery_man') {
        await tx.deliveryManProfile.create({
          data: {
            userId: newUser.id,
            vehicleType: vehicleType ? vehicleType.trim().slice(0, 50) : null,
            licenseNumber: licenseNumber ? licenseNumber.trim().slice(0, 50) : null,
          },
        });
      }

      return newUser;
    });

    res.status(201).json({
      ...withId(user),
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  res.json(withId(req.user));
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, bio, password, currentPassword } = req.body;
    const data = {};

    if (name !== undefined) {
      if (name.trim().length < 2 || name.trim().length > 100) {
        return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
      }
      data.name = name.trim();
    }
    if (phone !== undefined) data.phone = phone.trim().slice(0, 20);
    if (address !== undefined) data.address = address.trim().slice(0, 255);
    if (bio !== undefined) data.bio = bio.trim().slice(0, 2000);

    // SECURITY: Require current password to set new password
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
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

    userCache.delete(req.user.id); 

    res.json(withId(updatedUser));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.processedFile) {
      return res.status(400).json({ message: 'No image file was uploaded' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage: `/uploads/${req.file.filename}` },
      select: { profileImage: true },
    });

    userCache.delete(req.user.id); // <-- ADD THIS LINE

    res.json(updatedUser);
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};


const deleteProfile = async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can save products' });
    }

    const { productId } = req.params;
    const userId = req.user.id;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // BULLETPROOF TOGGLE
    try {
      await prisma.wishlist.delete({
        where: { userId_productId: { userId, productId } },
      });
      return res.json({ success: true, action: 'removed' });
    } catch (deleteErr) {
      if (deleteErr.code === 'P2025') {
        // Record didn't exist, try to create it
        try {
          await prisma.wishlist.create({ data: { userId, productId } });

          // Check if a wishlist message was already sent for this exact product to avoid spam
          const existingMsg = await prisma.message.findFirst({
            where: { senderId: userId, receiverId: product.farmerId, productId }
          });

          if (!existingMsg && userId !== product.farmerId) {
            await prisma.message.create({
              data: {
                senderId: userId,
                receiverId: product.farmerId,
                content: `Hello! I just added your product "${product.name}" to my wishlist.`,
                productId: productId,
              }
            });
          }

          return res.json({ success: true, action: 'added' });
        } catch (createErr) {
          if (createErr.code === 'P2002') {
            try {
              await prisma.wishlist.delete({
                where: { userId_productId: { userId, productId } },
              });
              return res.json({ success: true, action: 'removed' });
            } catch {
              return res.json({ success: true, action: 'added' });
            }
          }
          throw createErr;
        }
      }
      throw deleteErr;
    }
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

const getWishlist = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can access wishlist' });
    }
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: { product: { include: { farmer: { select: { name: true, phone: true, address: true } } } } },
    });

    res.json(wishlist.map((w) => withId(w.product)));
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: error.message });
  }
};

const toggleFollowFarmer = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can follow farmers' });
    }

    const { farmerId } = req.params;
    const followerId = req.user.id;

    if (farmerId === followerId) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const farmer = await prisma.user.findUnique({ where: { id: farmerId } });
    if (!farmer || farmer.role !== 'farmer') {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // BULLETPROOF TOGGLE (same pattern as wishlist)
    try {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId: farmerId } },
      });
      return res.json({ success: true, action: 'unfollowed' });
    } catch (deleteErr) {
      if (deleteErr.code === 'P2025') {
        try {
          await prisma.follow.create({ data: { followerId, followingId: farmerId } });
          return res.json({ success: true, action: 'followed' });
        } catch (createErr) {
          if (createErr.code === 'P2002') {
            try {
              await prisma.follow.delete({
                where: { followerId_followingId: { followerId, followingId: farmerId } },
              });
              return res.json({ success: true, action: 'unfollowed' });
            } catch {
              return res.json({ success: true, action: 'followed' });
            }
          }
          throw createErr;
        }
      }
      throw deleteErr;
    }
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

const getFollowedFarmers = async (req, res) => {
  try {
    const followed = await prisma.follow.findMany({
      where: { followerId: req.user.id },
      include: { following: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });

    res.json(followed.map((f) => withId(f.following)));
  } catch (error) {
    console.error('Get followed farmers error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  uploadProfileImage,
  deleteProfile,
  toggleWishlist,
  getWishlist,
  toggleFollowFarmer,
  getFollowedFarmers,
};