const mongoose = require("mongoose");
const initData = require("./data.js"); // This should be an array
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/feel-alive";

main()
  .then(() => {
    console.log("✅ Connected to DB");
    return initDB();
  })
  .catch((err) => {
    console.log("❌ Connection error:", err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});

  const userId = "685be0e1e3dfcbd7a7e9e123"; // Replace with your actual User _id

  const listingsWithOwner = initData.map((obj) => ({
    ...obj,
    owner: userId,
  }));

  await Listing.insertMany(listingsWithOwner);
  console.log("✅ Data was initialized with owner");
  mongoose.connection.close();
};

initDB();
