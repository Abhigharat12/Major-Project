const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError");

// ---------------- SEARCH ----------------
module.exports.searchListings = async (req, res) => {
  const { q } = req.query;
  const listings = await Listing.find({
    title: { $regex: q, $options: 'i' }
  });
  res.render("listings/index", { listings });
};

// ---------------- INDEX ----------------
module.exports.index = async (req, res) => {
  const { q, type } = req.query;
  const query = {};

  if (q) {
    const regex = new RegExp(q, 'i'); // case-insensitive search
    query.$or = [
      { title: regex },
      { description: regex },
      { location: regex },
      { type: regex }
    ];
  }

  if (type) {
    query.type = type;
  }

  const listings = await Listing.find(query);
  res.render("listings/index", { listings, q, type });
};

// ---------------- RENDER NEW ----------------
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new");
};

// ---------------- CREATE ----------------
module.exports.createListing = async (req, res) => {
  if (!req.body.listing) {
    throw new ExpressError(400, "Send valid data for listing");
  }

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;

  // handle multiple images
  if (req.files && req.files.length > 0) {
    newListing.image = req.files.map(f => ({ url: f.path, filename: f.filename }));
  }

  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

// ---------------- SHOW ----------------
module.exports.showListing = async (req, res) => {
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
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show", { listing });
};

// ---------------- RENDER EDIT ----------------
module.exports.renderEditForm = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  res.render("listings/edit", { listing });
};

// ---------------- UPDATE ----------------
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  if (!req.body.listing) {
    throw new ExpressError(400, "Send valid data for listing");
  }

  // Update basic fields
  let listing = await Listing.findByIdAndUpdate(
    id,
    { ...req.body.listing },
    { new: true, runValidators: true }
  );

  // Handle new images
  if (req.files && req.files.length > 0) {
    const newImgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    listing.image = newImgs;
  }

  // Handle image deletion
  if (req.body.delete_images) {
    let imagesToDelete = req.body.delete_images;
    if (typeof imagesToDelete === 'string') {
      imagesToDelete = imagesToDelete.split(',');
    }
    listing.image = listing.image.filter(
      (img) => !imagesToDelete.includes(img.filename)
    );
  }

  await listing.save();

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

// ---------------- DELETE ----------------
module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
