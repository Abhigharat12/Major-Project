// ======== app.js ========
require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const flash = require("connect-flash");

const Listing = require("./models/listing");
const User = require("./models/user");

require("./config/passport");

const authRoutes = require("./routes/auth");
const wrapAsync = require("./utils/wrapAsync");
const ExpressError = require("./utils/ExpressError");

// Import middlewares
const {
  isLoggedIn,
  isAdmin,
  isOwner,
  isReviewAuthor,
  validateListing,
  validateReview
} = require("./middleware");

// ✅ Import controllers
const listingController = require("./controllers/listing");
const reviewController = require("./controllers/review");

// ================== Session Setup ==================
const sessionOptions = {
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URL }),
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
};

// ================== App Config ==================
app.use(session(sessionOptions));
app.use(flash());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(passport.initialize());
app.use(passport.session());

// Flash messages & user context
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user || null;
  next();
});

// ================== Routes ==================
app.use("/auth", authRoutes);

// Home & Listing Routes
app.get("/", wrapAsync(listingController.index));
app.get("/listings", wrapAsync(listingController.index));
app.get("/listings/new", isLoggedIn, listingController.renderNewForm);
app.post("/listings", isLoggedIn, validateListing, wrapAsync(listingController.createListing));
app.get("/listings/:id", wrapAsync(listingController.showListing));
app.get("/listings/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));
app.put("/listings/:id", isLoggedIn, isOwner, validateListing, wrapAsync(listingController.updateListing));
app.delete("/listings/:id", isLoggedIn, isOwner, wrapAsync(listingController.deleteListing));

// Admin user list
app.get("/admin/users", isLoggedIn, wrapAsync(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).send("Access Denied");
  }
  const users = await User.find({});
  res.render("admin/users", { users });
}));

// Review Routes
app.post(
  "/listings/:id/reviews",
  isLoggedIn,
  validateReview,
  wrapAsync(reviewController.createReview)
);

app.delete(
  "/listings/:id/reviews/:reviewId",
  isLoggedIn,
  isReviewAuthor,
  wrapAsync(reviewController.deleteReview)
);

// ================== Error Handling ==================
app.use((req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  if (err.name === "CastError") {
    err.message = "Invalid ID format.";
    err.statusCode = 400;
  }

  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Something went wrong!";
  res.status(statusCode).render("error", { err });
});

// ================== Start Server ==================
app.listen(8080, () => {
  console.log("🚀 Server running at http://localhost:8080");
});
