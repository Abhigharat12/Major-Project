const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/user");
const Listing = require("../models/listing");

// ==================== Middleware ====================

// Protects admin-only routes
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    return next();
  }
  return res.status(403).send("Access denied. Admins only.");
}

// Optional: Protect routes for logged-in users
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/auth/login");
}

// ==================== AUTH ROUTES ====================

// Show login form
router.get("/login", (req, res) => {
  res.render("login"); // views/login.ejs
});

// Show registration form
router.get("/register", (req, res) => {
  res.render("register"); // views/register.ejs
});

// Register new user
router.post("/register", async (req, res, next) => {
  const { email, phone, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.render("login", { error: "Email already exists." });

  const user = new User({ email, phone, password });
  await user.save();

  req.login(user, (err) => {
    if (err) return next(err);
    return res.redirect("/");
  });
});

// Handle login (email or phone + password)
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({
    $or: [{ email: email }, { phone: email }],
  });

  if (!user) return res.render("login", { error: "User not found." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.render("login", { error: "Incorrect password." });

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

// ==================== LISTINGS (AUTH SIDE) ====================

// Optional: Protected listings (after login)
router.get("/listings", isLoggedIn, async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings, currentUser: req.user });
});

// ==================== GOOGLE OAUTH ====================

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login",
  }),
  (req, res) => {
    req.session.userId = req.user._id;
    req.session.user = req.user;
    res.redirect("/listings"); // Can be changed
  }
);

// ==================== ADMIN ROUTES ====================

// Admin login
router.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;

  const admin = await User.findOne({ email, isAdmin: true });
  if (!admin) return res.send("Admin not found or unauthorized.");

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.send("Incorrect password.");

  req.session.userId = admin._id;
  req.session.user = admin;

  res.redirect("/auth/users");
});

// Admin: View all users
router.get("/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.render("userList", { users }); // views/userList.ejs
  } catch (err) {
    console.error(err);
    res.send("Error loading users.");
  }
});

// Admin: Delete user
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
