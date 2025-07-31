const mongoose = require("mongoose");
const Listing = require("../models/listing");
const User = require("../models/user");
const data = require("./data");

const MONGO_URL = "mongodb://127.0.0.1:27017/feel-alive";

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB at", new Date().toLocaleString());
    confirmAndSeed();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Step 1: Confirmation prompt
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

function confirmAndSeed() {
  readline.question("⚠️  This will DELETE all listings and insert fresh seed data. Proceed? (yes/no): ", async (answer) => {
    if (answer.trim().toLowerCase() !== "yes") {
      console.log("❌ Operation cancelled.");
      readline.close();
      mongoose.connection.close();
      return;
    }

    await seedDB();
    readline.close();
  });
}

// Step 2: Seeding logic
const seedDB = async () => {
  try {
    console.log("🗑️ Deleting all existing listings...");
    await Listing.deleteMany({}); // or { seeded: true } for only seeded ones

    // Validate and filter listings
    const validData = data.filter(item => item.title);
    if (validData.length === 0) {
      console.warn("⚠️ No valid listings found in data.");
      return;
    }

    // Optional: assign default user to each listing (if applicable)
    const defaultUser = await User.findOne({ isAdmin: true }) || await User.findOne();
    if (defaultUser) {
      validData.forEach(item => {
        item.seeded = true;
        item.owner = defaultUser._id; // adjust field name as per your schema
      });
      console.log("👤 Assigned default user to all listings.");
    } else {
      console.warn("⚠️ No default user found. Listings will have no owner.");
    }

    await Listing.insertMany(validData);
    console.log(`✅ ${validData.length} listings seeded successfully!`);
  } catch (err) {
    console.error("❌ Error during seeding:", err);
  } finally {
    mongoose.connection.close();
  }
};