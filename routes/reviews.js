const express = require("express");
const router = express.Router({ mergeParams: true });
const Listing = require("../models/listing");
const Review = require("../models/review");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { reviewSchema } = require("../schema");
const { isLoggedIn } = require("../middleware/auth");

// Validation middleware
const validateReview = (req, res, next) => {
  if (!req.body.review) {
    throw new ExpressError("Send valid data for review", 400);
  }
  const { error } = reviewSchema.validate(req.body.review, { abortEarly: false });
  if (error) {
    const msg = error.details.map(el => el.message).join(", ");
    throw new ExpressError(msg, 400);
  }
  next();
};

// CREATE: add review to a listing
router.post("/", isLoggedIn, validateReview, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) throw new ExpressError("Listing not found", 404);

  const review = new Review(req.body.review);
  // If you track author: review.author = req.user._id;
  await review.save();

  listing.reviews.push(review);
  await listing.save();

  res.redirect(`/listings/${id}`);
}));

// DELETE: remove a review
router.delete("/:reviewId", isLoggedIn, wrapAsync(async (req, res) => {
  const { id, reviewId } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) throw new ExpressError("Listing not found", 404);

  // remove reference from listing
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  const deleted = await Review.findByIdAndDelete(reviewId);
  if (!deleted) throw new ExpressError("Review not found", 404);

  res.redirect(`/listings/${id}`);
}));

module.exports = router;
