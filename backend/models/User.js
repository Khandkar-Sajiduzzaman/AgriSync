// A Mongoose "model" is roughly like a class that maps to a MySQL table,
// except MongoDB is schema-less by default - Mongoose is what LETS us
// enforce a structure (like a CREATE TABLE statement, but in JS).

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // never return password field by default in queries
    },
    role: {
      type: String,
      enum: ["farmer", "buyer"],
      required: [true, "Role is required (farmer or buyer)"],
    },
    phone: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    profileImage: {
      type: String, // stores the file path/URL, not the image itself
      default: "",
    },
  },
  {
    timestamps: true, // auto-adds createdAt / updatedAt fields
  }
);

// Mongoose "pre-save hook" - runs automatically right before a document
// is saved. This is where we hash the password, similar to how you'd
// call password_hash() in PHP before inserting into MySQL.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // skip if password unchanged
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method - callable on any user document, e.g. user.matchPassword(pw)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
