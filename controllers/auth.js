// controllers/auth.js
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/user");

module.exports.renderLogin = (req, res) => {
  res.render("auth/login");
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, phone, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render("auth/login", { error: "Email or username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      username,
      email,
      phone: phone?.trim() || null,
      password: hashedPassword,
    });
    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      const redirectUrl = req.session.returnTo || "/listings";
      req.session.save(() => {
        delete req.session.returnTo;
        res.redirect(redirectUrl);
      });
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

module.exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ $or: [{ email }, { phone: email }] });

  if (!user) return res.render("auth/login", { error: "User not found." });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.render("auth/login", { error: "Incorrect password." });

  const redirectUrl = req.session.returnTo || "/listings";
  req.login(user, (err) => {
    if (err) return next(err);
    req.session.save(() => {
      delete req.session.returnTo;
      res.redirect(redirectUrl);
    });
  });
};

module.exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
};

module.exports.googleCallback = (req, res) => {
  req.session.userId = req.user._id;
  req.session.user = req.user;
  res.redirect("/listings");
};

module.exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const admin = await User.findOne({ email, isAdmin: true });

  if (!admin) return res.send("Admin not found or unauthorized.");

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.render("auth/login", { error: "Incorrect password." });

  req.session.userId = admin._id;
  req.session.user = admin;
  res.redirect("/auth/users");
};

module.exports.viewUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.render("userList", { users });
  } catch (err) {
    console.error(err);
    res.send("Error loading users.");
  }
};

module.exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/auth/users");
  } catch (err) {
    console.error(err);
    res.send("Error deleting user.");
  }
};
