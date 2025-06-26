const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/user");
const Listing = require("../models/listing");
const { isLoggedIn , isAdmin } = require("../middleware"); // adjust path if needed


// ========== Auth Routes ==========

// Login Page
router.get("/login", (req, res) => {
    // console.log("➡️ Login Page Reached. returnTo:", req.session.returnTo);

  res.render("auth/login"); // views/auth/login.ejs
});

// Register Page
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, phone, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render("auth/login", { error: "Email or username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // ✅ Correct hashing
    const user = new User({
      username,
      email,
      phone: phone?.trim() || null,
      password: hashedPassword, // ✅ Store hashed password
    });

    await user.save();

    req.login(user, (err) => {
  if (err) return next(err);

  const redirectUrl = req.session.returnTo || "/listings";
  // console.log("🔁 Redirecting to:", redirectUrl);

  req.session.save(() => {
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  });
});


  } catch (err) {
    console.error(err);
    next(err);
  }
});


// User Login (email or phone)
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ $or: [{ email }, { phone: email }] });

  if (!user) return res.render("auth/login", { error: "User not found." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.render("auth/login", { error: "Incorrect password." });

  // ✅ Read returnTo BEFORE login
  const redirectUrl = req.session.returnTo || "/listings";

  req.login(user, (err) => {
    if (err) return next(err);


    // ✅ Save the session explicitly before redirect
    req.session.save(() => {
      delete req.session.returnTo;
      res.redirect(redirectUrl);
    });
  });
});




// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

// ========== Listings (Protected) ==========


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
