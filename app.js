const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");

const MONGO_URL = "mongodb://127.0.0.1:27017/feel-alive";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

//Index Route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
});

//New Route
app.get("/listings/new", (req, res) => {
  res.render("listings/new.ejs");
});

//Show Route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/show.ejs", { listing });
});

//Create Route
app.post("/listings", async (req, res) => {
  const newListing = new Listing(req.body.listing);
  await newListing.save();
  res.redirect("/listings");
});

//Edit Route
app.get("/listings/:id/edit", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
});

//Update Route
app.put("/listings/:id", async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  res.redirect(`/listings/${id}`);
});

//Delete Route
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});


// used for testing app
// app.get("/testListing", async (req, res) => {
//   const sampleListing = new Listing({
//     title: "Valley of Flowers",
//     description: "A scenic national park located in Uttarakhand, famous for its vibrant alpine flowers.",
//     image: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.indiatvnews.com%2Fphotos%2Ffashion-lifestyle-5-most-beautiful-flower-valleys-in-india-you-should-visit-2025-02-23-977591&psig=AOvVaw3myLtBx5iKVGhj8IbKjbg5&ust=1749555391777000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCLCUkPCf5I0DFQAAAAAdAAAAABAE", 
//     price: 1500,
//     location: "Chamoli, Uttarakhand",
//     country: "India",
//   });

//   await sampleListing.save();
//   console.log("sample was saved");
//   res.send("successful testing");
// });

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});