
const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError");


module.exports.searchListings = async (req, res) => {
  const { q } = req.query;
  const listings = await Listing.find({
    title: { $regex: q, $options: 'i' }
  });
  res.render("listings/index", { listings });
};

module.exports.index = async (req, res) => {
  const { q, type } = req.query;
  const query = {};

  if (q) {
    const regex = new RegExp(q, 'i'); // case-insensitive
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
  res.render('listings/index', { listings, q, type });
};



module.exports.renderNewForm = (req, res) => {
  res.render("listings/new");
};

module.exports.createListing = async (req, res) => {
  
const url = req.file.path;        
const filename = req.file.filename;

  if (!req.body.listing) {
    throw new ExpressError(400, "Send valid data for listing");
  }
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image ={url,filename};
  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

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

module.exports.renderEditForm = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/edit", { listing });
};

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  // Validate incoming data
  if (!req.body.listing) {
    throw new ExpressError(400, "Send valid data for listing");
  }

  // Update the listing with new data
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true, runValidators: true });

  // If image was uploaded, update the image object
  if (req.file) {
    const { path: url, filename } = req.file;
    listing.image = { url, filename };
    await listing.save(); // Save the updated listing with image
  }

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};


module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
