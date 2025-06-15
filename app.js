require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing");
const User = require("./models/user");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
require("./config/passport");
const authRoutes = require("./routes/auth");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError");

const MONGO_URL = "mongodb://localhost:27017/feel-alive";

// MongoDB Connection
mongoose.connect(MONGO_URL)
  .then(() => console.log(" Connected to MongoDB"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// View Engine & Static Setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Session Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URL }),
  })
);

// Passport Setup
app.use(passport.initialize());
app.use(passport.session());

// Add currentUser to all EJS files
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
});

// Auth Routes
app.use("/auth", authRoutes);

// Middleware to protect routes
function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect("/auth/login");
  }
  next();
}

// ==================== PUBLIC ROUTES ====================

app.get("/", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
}));

app.get("/listings", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
}));

// ==================== ADMIN ROUTES ====================

app.get("/admin/users", isLoggedIn, wrapAsync(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).send("Access Denied");
  }
  const users = await User.find({});
  res.render("admin/users", { users });
}));

// ==================== LISTINGS (PROTECTED CRUD) ====================

app.get("/listings/new", isLoggedIn, (req, res) => {
  res.render("listings/new");
});

app.post("/listings", isLoggedIn, wrapAsync(async (req, res) => {
  const newListing = new Listing(req.body.listing);
   if(!req.body.listing){
    throw new ExpressError(400,"Send valid data for listing");
  }
  co
  await newListing.save();
  res.redirect("/listings");
}));

app.get("/listings/:id", isLoggedIn, wrapAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    throw new ExpressError("Listing not found", 404);
  }
  res.render("listings/show", { listing });
}));

app.get("/listings/:id/edit", isLoggedIn, wrapAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    throw new ExpressError("Listing not found", 404);
  }
  res.render("listings/edit", { listing });
}));

app.put("/listings/:id", isLoggedIn, wrapAsync(async (req, res) => {
  if(!req.body.listing){
    throw new ExpressError(400,"Send valid data for listing");
  }
  const { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  res.redirect(`/listings/${id}`);
}));

app.delete("/listings/:id", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  res.redirect("/listings");
}));

// ==================== ERROR HANDLING ====================

// Catch-all for unhandled routes (404)
app.use((req, res, next) => {
  const err = new ExpressError("Page Not Found", 404);
  next(err);
});


// Error middleware
app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Something went wrong!";
  res.status(statusCode).render("error", { err, });
});

// ==================== START SERVER ====================

app.listen(8080, () => {
  console.log("Server running at http://localhost:8080");
});
