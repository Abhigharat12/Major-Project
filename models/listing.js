const mongoose = require("mongoose");
const Review = require("./review"); // ✅ Import is correct
const { type } = require("os");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    url: String,
    filename:String,
  },
  price: {
    type: Number,
    min: [0, "Price must be a positive number"]
  },
  location: String,
  country: String,

  // ✅ FIXED HERE: use "Review" instead of "Reviews"
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }
  ],
  owner:{
    type: Schema.Types.ObjectId,
    ref:"User",
  },
  type: {
  type: String,
  enum: [
    "Adventure", "Beach", "Mountain", "City", "Historical",
    "Luxury", "Rural", "Camping", "Cultural", "Desert"
  ],
  required: true
}



});

// ✅ Cascade delete reviews when listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
