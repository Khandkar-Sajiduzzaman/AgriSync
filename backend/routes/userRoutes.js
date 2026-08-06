// Routes are just a map of "HTTP method + URL" -> "controller function".
// This replaces the job that separate .php files (register.php, login.php,
// profile.php) used to do based on which file the browser requested.

const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);

// everything below requires a valid login token
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/profile/image", protect, upload.single("profileImage"), uploadProfileImage);
router.delete("/profile", protect, deleteProfile);
router.put("/wishlist/:productId", protect, toggleWishlist);
router.get("/wishlist", protect, getWishlist);
router.put("/follow/:farmerId", protect, toggleFollowFarmer);
router.get("/following", protect, getFollowedFarmers);
module.exports = router;
