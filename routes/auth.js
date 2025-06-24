const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/user");
const Listing = require("../models/listing");

// ========== Middleware ==========

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) return next();
  res.status(403).send("Access denied. Admins only.");
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/auth/login");
}

// ========== Auth Routes ==========

// Login Page
router.get("/login", (req, res) => {
  res.render("auth/login"); // views/auth/login.ejs
});

// Register Page
router.get("/register", (req, res) => {
  res.render("auth/register"); // views/auth/register.ejs
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.render("auth/login", { error: "Email already exists." });

    // Normalize phone number to null if blank or only spaces
    const phoneNormalized = phone?.trim() || null;

    const user = new User({ email, phone: phoneNormalized, password });
    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      return res.redirect("/");
    });
  } catch (err) {
    // Check for duplicate key error (phone/email)
    if (err.code === 11000) {
      let duplicateField = Object.keys(err.keyValue)[0];
      let message = `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists.`;
      return res.render("auth/login", { error: message });
    }

    console.error("Registration error:", err);
    return res.render("auth/login", { error: "Something went wrong. Please try again." });
  }
});


// User Login (email or phone)
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({
    $or: [{ email }, { phone: email }],
  });

  if (!user) return res.render("auth/login", { error: "User not found." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.render("auth/login", { error: "Incorrect password." });

  req.login(user, (err) => {
    if (err) return next(err);
    return res.redirect("/");
  });
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

// ========== Listings (Protected) ==========

router.get("/listings", isLoggedIn, async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings, currentUser: req.user });
});

// ========== Google OAuth ==========

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  (req, res) => {
    req.session.userId = req.user._id;
    req.session.user = req.user;
    res.redirect("/listings");
  }
);

// ========== Admin Routes ==========

// Admin Login
router.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;

  const admin = await User.findOne({ email, isAdmin: true });
  if (!admin) return res.send("Admin not found or unauthorized.");

  const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.render("auth/login", { error: "Incorrect password." });

  req.session.userId = admin._id;
  req.session.user = admin;

  res.redirect("/auth/users");
});

// Admin - View All Users
router.get("/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.render("userList", { users }); // views/userList.ejs
  } catch (err) {
    console.error(err);
    res.send("Error loading users.");
  }
});

// Admin - Delete User
router.delete("/users/:id", isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/auth/users");
  } catch (err) {
    console.error(err);
    res.send("Error deleting user.");
  }
});

module.exports = router;
