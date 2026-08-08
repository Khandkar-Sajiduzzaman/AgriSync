const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserModel = require("../models/UserModel");
const ProductModel = require("../models/ProductModel");
const WishlistModel = require("../models/WishlistModel");
const FollowModel = require("../models/FollowModel");

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

const withId = (obj) => {
  if (!obj) return obj;

  return {
    ...obj,
    _id: obj.id,
  };
};

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message:
          "Name, email, password, and role are required",
      });
    }

    const userExists = await UserModel.findByEmail(email);

    if (userExists) {
      return res.status(400).json({
        message:
          "An account with this email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      password,
      salt
    );

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || "",
      address: address || "",
    });

    res.status(201).json({
      ...withId(user),
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// LOGIN USER
const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    const user = await UserModel.findByEmail(email);

    if (
      user &&
      (await bcrypt.compare(password, user.password))
    ) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({
        message: "Invalid email or password",
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET PROFILE
const getProfile = async (req, res) => {
  res.json(withId(req.user));
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      bio,
      password,
    } = req.body;

    const data = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (phone !== undefined) {
      data.phone = phone;
    }

    if (address !== undefined) {
      data.address = address;
    }

    if (bio !== undefined) {
      data.bio = bio;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);

      data.password = await bcrypt.hash(
        password,
        salt
      );
    }

    const updatedUser = await UserModel.update(
      req.user.id,
      data
    );

    res.json(withId(updatedUser));
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// UPLOAD PROFILE IMAGE
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image file was uploaded",
      });
    }

    const imagePath =
      `/uploads/${req.file.filename}`;

    const updatedUser =
      await UserModel.updateProfileImage(
        req.user.id,
        imagePath
      );

    res.json(updatedUser);
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// DELETE PROFILE
const deleteProfile = async (req, res) => {
  try {
    await UserModel.delete(req.user.id);

    res.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// TOGGLE WISHLIST
const toggleWishlist = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({
        message: "Only buyers can save products",
      });
    }

    const { productId } = req.params;
    const userId = req.user.id;

    const product =
      await ProductModel.findBasicById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const existing =
      await WishlistModel.findOne(
        userId,
        productId
      );

    if (existing) {
      await WishlistModel.remove(
        userId,
        productId
      );
    } else {
      await WishlistModel.add(
        userId,
        productId
      );
    }

    const wishlist =
      await WishlistModel.findByUser(userId);

    res.json(
      wishlist.map((w) => withId(w.product))
    );
  } catch (error) {
    console.error(
      "Toggle wishlist error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// GET WISHLIST
const getWishlist = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({
        message:
          "Only buyers can access wishlist",
      });
    }

    const wishlist =
      await WishlistModel.findByUser(
        req.user.id
      );

    res.json(
      wishlist.map((w) => withId(w.product))
    );
  } catch (error) {
    console.error(
      "Get wishlist error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// TOGGLE FOLLOW FARMER
const toggleFollowFarmer = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({
        message:
          "Only buyers can follow farmers",
      });
    }

    const { farmerId } = req.params;
    const followerId = req.user.id;

    if (farmerId === followerId) {
      return res.status(400).json({
        message: "You can't follow yourself",
      });
    }

    const farmer =
      await FollowModel.findFarmer(farmerId);

    if (!farmer || farmer.role !== "farmer") {
      return res.status(404).json({
        message: "Farmer not found",
      });
    }

    const existing =
      await FollowModel.findOne(
        followerId,
        farmerId
      );

    if (existing) {
      await FollowModel.remove(
        followerId,
        farmerId
      );
    } else {
      await FollowModel.add(
        followerId,
        farmerId
      );
    }

    const followed =
      await FollowModel.findByFollower(
        followerId
      );

    res.json(
      followed.map((f) =>
        withId(f.following)
      )
    );
  } catch (error) {
    console.error(
      "Toggle follow error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// GET FOLLOWED FARMERS
const getFollowedFarmers = async (
  req,
  res
) => {
  try {
    const followed =
      await FollowModel.findByFollower(
        req.user.id
      );

    res.json(
      followed.map((f) =>
        withId(f.following)
      )
    );
  } catch (error) {
    console.error(
      "Get followed farmers error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
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