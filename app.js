// ======== app.js ========
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
const Review = require("./models/review.js");
const flash = require("connect-flash");
const { isLoggedIn, isAdmin, isOwner, validateListing, validateReview } = require("./middleware.js");


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


app.use(session(sessionOptions));
app.use(flash());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Abhi you are Connected to MongoDB"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));


app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.success =req.flash("success");
  res.locals.error =req.flash("error");

  next();
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
});

app.use("/auth", authRoutes);


app.get("/", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
}));

app.get("/listings", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
}));

app.get("/admin/users", isLoggedIn, wrapAsync(async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).send("Access Denied");
  }
  const users = await User.find({});
  res.render("admin/users", { users });
}));

app.get("/listings/new", isLoggedIn, (req, res) => {
  res.render("listings/new");
});

app.post("/listings", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
  const newListing = new Listing(req.body.listing);
newListing.owner =req.user._id;
  if (!req.body.listing) {
    throw new ExpressError(400, "Send valid data for listing");
  }
  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
}));

app.get("/listings/:id", wrapAsync(async (req, res) => {
const listing = await Listing.findById(req.params.id)
  .populate("owner")
  .populate({
    path: "reviews",
    populate: {
      path: "author",
      select: "username"
    }
  });
  if (!listing) {
    req.flash("error","Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show", { listing });

}));


app.get("/listings/:id/edit", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
   if (!listing) {
    req.flash("error","Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/edit", { listing });
}));
//  Update route
app.put("/listings/:id", isLoggedIn,isOwner,validateListing, wrapAsync(async (req, res) => {
  if (!req.body.listing) {
    throw new ExpressError(400, "Send valid data for listing");
  }
  const { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
}));

app.delete("/listings/:id", isLoggedIn,isOwner, wrapAsync(async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");

  res.redirect("/listings");
}));

// review routes 

app.post("/listings/:id/reviews", isLoggedIn, validateReview, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) throw new ExpressError("Listing not found", 404);

  const review = new Review(req.body.review);

  // ✅ Set the author to the logged-in user
  review.author = req.user._id; // or req.user._id if using passport

  await review.save();

  listing.reviews.push(review);
  await listing.save();

  req.flash("success", "New Review Created!");
  res.redirect(`/listings/${id}`);
}));


app.delete("/listings/:id/reviews/:reviewId", isLoggedIn, wrapAsync(async (req, res) => {
  const { id, reviewId } = req.params;

  // Remove review reference from listing
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });

  // Delete the review document
  await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted!");


  res.redirect(`/listings/${id}`);
}));
app.use((req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  if (err.name === "CastError") {
    err.message = "Invalid listing ID format.";
    err.statusCode = 400;
  }

  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Something went wrong!";
  res.status(statusCode).render("error", { err });
});

app.listen(8080, () => {
  console.log("Server running at http://localhost:8080");
});
