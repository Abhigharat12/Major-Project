const mongoose = require("mongoose");
const Listing = require("../models/listing"); // Adjust if seed.js is inside init/
const data = require("./data"); // This points to data.js (your listings)

const MONGO_URL = "mongodb://127.0.0.1:27017/feel-alive"; // Adjust if needed

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log("Database connected");
    return seedDB();
  })
  .catch((err) => {
    console.log("Connection error:", err);
  });

const seedDB = async () => {
  await Listing.deleteMany({});
  await Listing.insertMany(data);
  console.log("All listings added to DB");
  mongoose.connection.close();
};
