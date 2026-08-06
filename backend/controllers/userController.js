// Controllers hold the actual logic for each route - this is the
// equivalent of the code inside your PHP files that handled a form
// POST or a page request. Routes just point HTTP methods + URLs to
// these functions.

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// helper: create a signed JWT for a given user id
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @route  POST /api/users/register
// @desc   Create a new farmer or buyer profile (sign up)
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({ name, email, password, role, phone, address });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  POST /api/users/login
// @desc   Log in and receive a token
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // .select("+password") is needed because the schema hides password by default
    const user = await User.findOne({ email }).select("+password");

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/users/profile
// @desc   Get the logged-in user's own profile
const getProfile = async (req, res) => {
  // req.user was attached by the authMiddleware after verifying the token
  res.json(req.user);
};

// @route  PUT /api/users/profile
// @desc   Update the logged-in user's profile fields
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone ?? user.phone;
    user.address = req.body.address ?? user.address;
    user.bio = req.body.bio ?? user.bio;

    // only touch the password if a new one was actually sent
    if (req.body.password) {
      user.password = req.body.password; // pre-save hook will hash it
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address,
      bio: updatedUser.bio,
      profileImage: updatedUser.profileImage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/users/profile/image
// @desc   Upload/replace the profile picture
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file was uploaded" });
    }

    const user = await User.findById(req.user.id);
    user.profileImage = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ profileImage: user.profileImage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  DELETE /api/users/profile
// @desc   Delete the logged-in user's account
const deleteProfile = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @route  PUT /api/users/wishlist/:productId
// @desc   Add or remove a product from the buyer's wishlist (toggle)
const toggleWishlist = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can save products" });
    }

    const user = await User.findById(req.user.id);
    const { productId } = req.params;

    const index = user.wishlist.findIndex((id) => id.toString() === productId);

    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(productId);
    }

    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/users/wishlist
// @desc   Get the buyer's saved products, populated with product details
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");
    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/users/follow/:farmerId
// @desc   Follow or unfollow a farmer (toggle)
const toggleFollowFarmer = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can follow farmers" });
    }

    const { farmerId } = req.params;

    if (farmerId === req.user.id.toString()) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const farmer = await User.findById(farmerId);
    if (!farmer || farmer.role !== "farmer") {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const user = await User.findById(req.user.id);
    const index = user.favoriteFarmers.findIndex((id) => id.toString() === farmerId);

    if (index > -1) {
      user.favoriteFarmers.splice(index, 1);
    } else {
      user.favoriteFarmers.push(farmerId);
    }

    await user.save();
    res.json({ favoriteFarmers: user.favoriteFarmers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/users/following
// @desc   Get the farmers the buyer follows
const getFollowedFarmers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "favoriteFarmers",
      "name email phone address"
    );
    res.json(user.favoriteFarmers);
  } catch (error) {
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
