// ======== app.js ========

if(process.env.NODE_ENV !="production") {
  require("dotenv").config();
}

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
const multer  = require('multer');
const {storage} = require("./cloudConfig.js");
const upload = multer({ storage });
const apiRoutes = require("./routes/api.js");

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

// ================== Razorpay Setup ==================
const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ================== Session Setup ==================
const sessionOptions = {
  secret: process.env.SESSION_SECRET,
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
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use("/api", apiRoutes);
app.use(express.static("public"));

// Flash messages & user context
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.currentRoute = req.path;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// ================== Routes ==================
app.use("/auth", authRoutes);

// Home & Listing Routes
app.get("/search", wrapAsync(listingController.searchListings));
app.get("/", wrapAsync(listingController.index));
app.get("/listings", wrapAsync(listingController.index));
app.get("/listings/new", isLoggedIn, listingController.renderNewForm);
app.post(
  "/listings",
  isLoggedIn,
  upload.array("images", 5),
  validateListing,
  wrapAsync(listingController.createListing)
);

app.get("/listings/:id", wrapAsync(listingController.showListing));
app.get("/listings/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));
app.put(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  upload.array("image", 5),
  validateListing,
  wrapAsync(listingController.updateListing)
);

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
app.post("/listings/:id/reviews", isLoggedIn, validateReview, wrapAsync(reviewController.createReview));
app.delete("/listings/:id/reviews/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(reviewController.deleteReview));

// ================== Razorpay Payment Routes ==================

// Create order API
app.post("/create-order", async (req, res) => {
  const { amount } = req.body; // amount in INR
  const options = {
    amount: amount * 100, // convert to paise
    currency: "INR",
    receipt: `receipt_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).send({ error: "Failed to create order" });
  }
});

// Serve payment page
app.get("/pay", (req, res) => {
  res.sendFile(path.join(__dirname, "public/payment.html"));
});

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
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
