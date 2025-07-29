require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/route", async (req, res) => {
  const { start, end, mode } = req.body;

  try {
    const orsRes = await axios.post(
      `https://api.openrouteservice.org/v2/directions/${mode}/geojson`,
      { coordinates: [start, end] },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(orsRes.data);
  } catch (err) {
    console.error("ORS Error:", err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get route from ORS" });
  }
  // console.log("📦 Incoming route request:", req.body);
});



module.exports = router;
