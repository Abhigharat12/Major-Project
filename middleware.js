const Listing = require("./models/listing");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError");
const { listingSchema, reviewSchema } = require("./schema.js");

// =======================
// ✅ Auth Middleware
// =======================

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();

  // Save the original URL to redirect after login
  if (!req.session.returnTo) {
    req.session.returnTo = req.originalUrl;
  }

  return res.redirect("/auth/login");
}

function isAdmin(req, res, next) {
  const user = req.session.user || req.user;
  if (user && user.isAdmin) return next();

  req.flash("error", "Access denied: Admins only.");
  res.redirect("/listings");
}

// =======================
// ✅ Authorization Middleware
// =======================

const isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

const isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId).populate("author");

  if (!review.author.equals(req.user._id)) {
  req.flash("error", "Oops! You can only delete your own review.");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// =======================
// ✅ Validation Middleware
// =======================

const validateListing = (req, res, next) => {
  if (req.body.delete_images && typeof req.body.delete_images === 'string') {
    req.body.delete_images = req.body.delete_images.split(',');
  }
  const { error } = listingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const msg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(msg, 400);
  }

  next();
};

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const msg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(msg, 400);
  }

  next();
};

// =======================
// ✅ Export all
// =======================

module.exports = {
  isLoggedIn,
  isAdmin,
  isOwner,
  isReviewAuthor,
  validateListing,
  validateReview
};
