const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { listingSchema } = require("../schema");
const { isLoggedIn } = require("../middleware/auth");


const validateListing = (req, res, next) => {
  if (!req.body.listing) {
    throw new ExpressError('"listing" data is missing', 400);
  }

  const { error } = listingSchema.validate(req.body.listing, { abortEarly: false });
  if (error) {
    const msg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(msg, 400);
  }
  next();
};



router.get("/", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
}));

// NEW: form to create a new listing
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new");
});

// CREATE: add new listing
router.post("/", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
  const listing = new Listing(req.body.listing);
  // If you have an author field: listing.author = req.user._id;
  await listing.save();
  res.redirect(`/listings/${listing._id}`);
}));

// SHOW: show one listing
router.get("/:id", wrapAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("reviews");
  if (!listing) throw new ExpressError("Listing not found", 404);
  res.render("listings/show", { listing });
}));

// EDIT: form to edit a listing
router.get("/:id/edit", isLoggedIn, wrapAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ExpressError("Listing not found", 404);
  res.render("listings/edit", { listing });
}));

// UPDATE: apply edits
router.put("/:id", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const updated = await Listing.findByIdAndUpdate(
    id,
    { ...req.body.listing },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ExpressError("Listing not found", 404);
  res.redirect(`/listings/${updated._id}`);
}));

// DELETE: remove a listing
router.delete("/:id", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const deleted = await Listing.findByIdAndDelete(id);
  if (!deleted) throw new ExpressError("Listing not found", 404);
  res.redirect("/listings");
}));

module.exports = router;
