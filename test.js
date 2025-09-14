require("dotenv").config();
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");

const payload = fs.readFileSync("./payload.json", "utf8");
const ts = Date.now().toString();
const secret = process.env.CASHFREE_CLIENT_SECRET;

const sig = crypto
  .createHmac("sha256", secret)
  .update(ts + payload)
  .digest("base64");

const opts = {
  method: "POST",
  port: process.env.PORT || 8080,
  path: "/cashfree-webhook",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-timestamp": ts,
    "x-webhook-signature": sig,
  },
};

const r = http.request(opts, (res) => {
  console.log("resp", res.statusCode);
  res.on("data", (d) => process.stdout.write(d));
});

r.write(payload);
r.end();
