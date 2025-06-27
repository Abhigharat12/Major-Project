const express = require("express");
const router = express.Router();
const passport = require("passport");
const { isAdmin } = require("../middleware");

// ✅ Import your controller
const authController = require("../controllers/auth");

// ===== Auth Routes =====
router.get("/login", authController.renderLogin);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// ===== Google OAuth =====
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  authController.googleCallback
);

// ===== Admin =====
router.post("/admin-login", authController.adminLogin);
router.get("/users", isAdmin, authController.viewUsers);
router.delete("/users/:id", isAdmin, authController.deleteUser);

module.exports = router;
