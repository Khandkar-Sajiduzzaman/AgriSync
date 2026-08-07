const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const withId = (obj) => (obj ? { ...obj, _id: obj.id } : obj);

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone: phone || '',
        address: address || '',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.status(201).json({
      ...withId(user),
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
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
    const { name, phone, address, bio, password } = req.body;
    const data = {};

    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (bio !== undefined) data.bio = bio;

    if (password) {
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

    res.json(withId(updatedUser));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file was uploaded' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage: `/uploads/${req.file.filename}` },
      select: { profileImage: true },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ message: error.message });
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

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
    } else {
      await prisma.wishlist.create({ data: { userId, productId } });
    }

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: { product: { include: { farmer: { select: { name: true, phone: true, address: true } } } } },
    });

    res.json(wishlist.map((w) => withId(w.product)));
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ message: error.message });
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

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: farmerId } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId: farmerId } } });
    } else {
      await prisma.follow.create({ data: { followerId, followingId: farmerId } });
    }

    const followed = await prisma.follow.findMany({
      where: { followerId },
      include: { following: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });

    res.json(followed.map((f) => withId(f.following)));
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({ message: error.message });
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