// ======== app.js ========

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const flash = require("connect-flash");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const crypto = require("crypto");
const upload = multer({ storage });
const apiRoutes = require("./routes/api.js");

const Listing = require("./models/listing");
const User = require("./models/user");
const Payment = require("./models/payment");

require("./config/passport");

const authRoutes = require("./routes/auth");
const wrapAsync = require("./utils/wrapAsync");
const ExpressError = require("./utils/ExpressError");

// Import middlewares
const {
  isLoggedIn,
  isAdmin,
  isOwner,
  isReviewAuthor,
  validateListing,
  validateReview
} = require("./middleware");

// ✅ Import controllers
const listingController = require("./controllers/listing");
const reviewController = require("./controllers/review");

// ================== Cashfree Setup ==================
const { Cashfree, CFEnvironment } = require("cashfree-pg");

const env =
  process.env.CASHFREE_ENV === "production"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;


    console.log("Cashfree Env:", env,
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET );
const cashfree = new Cashfree(
  env,
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET
);

// ================== App Config ==================



// ================== Session Config ==================
const sessionOptions = {
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    touchAfter: 24 * 3600 // update session only once in 24 hours
  }),
  secret: process.env.SESSION_SECRET || "mysupersecret", // ⚠️ change to strong secret in .env
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: true, // uncomment this when using HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
};

app.use(session(sessionOptions));
app.use(flash());

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Webhook - must be BEFORE app.use(express.json()) etc.
app.post(
  "/cashfree-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      console.log("---- /cashfree-webhook hit ----");
      // Basic presence checks
      const webhookSignature = req.headers["x-webhook-signature"];
      const webhookTimestamp = req.headers["x-webhook-timestamp"];
      console.log("[Webhook Debug] Received Timestamp:", webhookTimestamp);
      console.log("[Webhook Debug] Received Signature:", webhookSignature);

      // Raw body checks
      console.log("[Webhook Debug] Type of req.body:", typeof req.body);
      console.log("[Webhook Debug] Is req.body a Buffer?:", Buffer.isBuffer(req.body));
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);
      console.log("[Webhook Debug] Raw body length:", rawBody.length);
      console.log("[Webhook Debug] Full Raw Body:", rawBody);

      // Secret checks (do NOT print full secret)
      const secretKey = process.env.CASHFREE_CLIENT_SECRET;
      const secretPreview =
        secretKey
          ? `${secretKey.slice(0, 4)}...${secretKey.slice(-4)} (len=${secretKey.length})`
          : "NOT FOUND";
      console.log("[Webhook Debug] Using secret preview:", secretPreview);

      // Compute expected signature exactly: base64(HMAC_SHA256(secret, timestamp + rawBody))
      const dataToSign = (webhookTimestamp || "") + rawBody;
      const expectedSig = crypto
        .createHmac("sha256", secretKey)
        .update(dataToSign)
        .digest("base64");
      console.log("[Webhook Debug] Generated Signature:", expectedSig);

      // Compare
      if (!webhookSignature || expectedSig !== webhookSignature) {
        console.error(
          "[Cashfree Webhook] Signature mismatch. Returning VALIDATION_FAILED"
        );
        // Respond exactly so Cashfree records validation failed
        return res
          .status(400)
          .json({ status: "VALIDATION_FAILED", message: "FAILED" });
      }

      // If signature ok, parse event and save to DB using existing Payment model
      const event = JSON.parse(rawBody);
      console.log(
        "[Cashfree Webhook] Valid signature. Event type:",
        event.type,
        "Order ID:",
        event.data?.order?.order_id
      );

      // Save minimal Payment doc (be tolerant if model fields differ)
      try {
        const Payment = require("./models/payment");
        const paymentDoc = new Payment({
          orderId: event.data?.order?.order_id,
          paymentId:
            event.data?.payment?.cf_payment_id ||
            event.data?.payment?.gateway_payment_id,
          amount:
            event.data?.payment?.payment_amount ||
            event.data?.order?.order_amount,
          status: (event.data?.payment?.payment_status || "UNKNOWN").toLowerCase(),
          signature: webhookSignature, // Store the valid signature
        });
        await paymentDoc.save();
        console.log("[Cashfree Webhook] Payment saved:", paymentDoc._id);
      } catch (dbErr) {
        console.error(
          "[Cashfree Webhook] Failed to save payment (non-fatal):",
          dbErr
        );
      }

      // Reply success
      return res.status(200).json({ status: "SUCCESS" });
    } catch (err) {
      console.error("[Cashfree Webhook] Handler error:", err);
      return res.status(500).json({ status: "FAILED", message: "ERROR" });
    }
  }
);

app.get('/cashfree-webhook-health', (req,res) => res.send('webhook ok'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(passport.initialize());
app.use(passport.session());

// Cashfree Webhook Handler
app.post(
  "/cashfree-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookTimestamp = req.headers["x-webhook-timestamp"];
    const webhookSignature = req.headers["x-webhook-signature"];
    const rawBody = req.body;

    console.log(
      `[Cashfree Webhook] Received event. Order ID: ${
        JSON.parse(rawBody.toString())?.data?.order?.order_id || "N/A"
      }`
    );

    try {
      const secretKey = process.env.CASHFREE_CLIENT_SECRET;

      // --- Start Debug Logging ---
      console.log("[Webhook Debug] Received Timestamp:", webhookTimestamp);
      console.log("[Webhook Debug] Received Signature:", webhookSignature);

      console.log("[Webhook Debug] Type of req.body:", typeof rawBody);
      console.log("[Webhook Debug] Is req.body a Buffer?:", Buffer.isBuffer(rawBody));

      if (!Buffer.isBuffer(rawBody)) {
        console.error("[Webhook Error] req.body is not a Buffer! This might be because another body parser is running first. Webhook processing cannot continue.");
        return res.status(400).json({ status: "FAILED" });
      }

      const bodyString = rawBody.toString("utf8");
      
      const secretKeyForLogging = secretKey ? `${secretKey.substring(0, 4)}...${secretKey.slice(-4)}` : "NOT FOUND";
      console.log("[Webhook Debug] Using Secret Key (truncated):", secretKeyForLogging);
      // --- End Debug Logging ---

      const dataToSign = webhookTimestamp + bodyString;
      const generatedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(dataToSign)
        .digest("base64");
      
      console.log("[Webhook Debug] Generated Signature:", generatedSignature);

      if (generatedSignature === webhookSignature) {
        console.log("[Cashfree Webhook] Signature verified.");
        const event = JSON.parse(bodyString); // Use the string we already have
        const { data } = event;

        // Gracefully handle payload structure
        const orderId = data?.order?.order_id;
        const paymentId = data?.payment?.cf_payment_id;
        const amount = data?.order?.order_amount;
        const status = data?.payment?.payment_status;
        const customerEmail = data?.customer_details?.customer_email;
        const listingId = data?.order?.order_meta?.listingId;
        const userId = data?.order?.order_meta?.userId;

        if (event.type === "PAYMENT_SUCCESS_WEBHOOK" && orderId) {
          // Avoid saving duplicate payments
          const existingPayment = await Payment.findOne({ orderId: orderId });
          if (existingPayment) {
            console.log(
              `[Cashfree Webhook] Payment for orderId: ${orderId} already processed.`
            );
            return res.status(200).json({ status: "SUCCESS" });
          }

          const newPayment = new Payment({
            orderId: orderId,
            paymentId: paymentId || "N/A",
            signature: webhookSignature,
            amount: amount || 0,
            user: userId,
            listing: listingId,
            status: "success",
          });

          await newPayment.save();
          console.log(
            `[Cashfree Webhook] Successfully saved payment for orderId: ${orderId}`
          );
        }

        res.status(200).json({ status: "SUCCESS" });
      } else {
        console.error("[Cashfree Webhook] Signature verification failed.");
        res.status(400).json({ status: "FAILED" });
      }
    } catch (error) {
      console.error("[Cashfree Webhook] Error processing webhook:", error);
      res.status(500).json({ status: "ERROR", message: error.message });
    }
  }
);

app.use(express.json());
app.use(express.static("public"));
app.use("/api", apiRoutes);

// Flash messages & user context
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.currentRoute = req.path;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// ================== Routes ==================
app.use("/auth", authRoutes);

// Home & Listing Routes
app.get("/search", wrapAsync(listingController.searchListings));
app.get("/", wrapAsync(listingController.index));
app.get("/listings", wrapAsync(listingController.index));
app.get("/listings/new", isLoggedIn, listingController.renderNewForm);
app.post(
  "/listings",
  isLoggedIn,
  upload.array("images", 5),
  validateListing,
  wrapAsync(listingController.createListing)
);

app.get("/listings/return", (req, res) => {
  const { status, orderId, amount, listingTitle } = req.query;
  res.render("listings/return", { status, orderId, amount, listingTitle });
});

app.get("/listings/:id", wrapAsync(listingController.showListing));
app.get(
  "/listings/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);
app.put(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  upload.array("image", 5),
  validateListing,
  wrapAsync(listingController.updateListing)
);

app.delete(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.deleteListing)
);

// Admin user list
app.get(
  "/admin/users",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).send("Access Denied");
    }
    const users = await User.find({});
    res.render("admin/users", { users });
  })
);

// Review Routes
app.post(
  "/listings/:id/reviews",
  isLoggedIn,
  validateReview,
  wrapAsync(reviewController.createReview)
);
app.delete(
  "/listings/:id/reviews/:reviewId",
  isLoggedIn,
  isReviewAuthor,
  wrapAsync(reviewController.deleteReview)
);

// ================== Cashfree Payment Routes ==================

// Create order API
app.post("/create-order", isLoggedIn, async (req, res) => {
  try {
    const { amount, customer, listingId } = req.body;
    const userId = req.user._id;

    const request = {
      order_amount: String(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: customer?.id || `cust_${Date.now()}`,
        customer_name: customer?.name || "Guest",
        customer_email: customer?.email || "guest@example.com",
        customer_phone: customer?.phone || "9999999999"
      },
      order_meta: {
        return_url: `${process.env.BASE_URL}/payment/callback?order_id={order_id}`,
        listingId: listingId,
        userId: userId
      },
      order_note: "Order from Major-project"
    };

    const response = await cashfree.PGCreateOrder(request);
    return res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("Cashfree order creation error:", err?.response?.data || err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.get("/payment/callback", wrapAsync(async (req, res, next) => {
  console.log("Entered /payment/callback");
  const { order_id } = req.query;

  try {
    console.log("Fetching order from Cashfree...");
    console.log("Attempting to fetch order with Order ID:", order_id); // Modified log
    const order = await cashfree.PGFetchOrder(order_id);
    console.log("Order fetched:", order);
    console.log("Full Order Object from Cashfree:", order);

    if (order.data.order_status === "PAID") {
      console.log("Order is PAID");
      // Safely access metadata
      const listingId = order.data.order_meta?.listingId;
      const userId = order.data.order_meta?.userId;
      console.log("Metadata:", { listingId, userId, orderMeta: order.data.order_meta });

      // We no longer strictly require listingId or userId for saving due to schema change,
      // but we can still log if they are missing for debugging.
      if (!listingId || !userId) {
        console.warn("Missing listingId or userId in order meta for callback:", order.data.order_meta);
        // We can still proceed to save the payment, but it will be less complete.
        // No need to redirect to error immediately if payment itself is PAID.
      }

      let listingTitle = "N/A"; // Default value
      if (listingId) {
        const listing = await Listing.findById(listingId);
        if (listing) {
          listingTitle = listing.title;
        }
      }

      console.log("Creating new Payment document...");
      const payment = new Payment({
        orderId: order.data.order_id,
        paymentId: order.data.cf_order_id,
        signature: "signature", // Placeholder - consider making this dynamic or removing if not used
        amount: order.data.order_amount,
        user: userId, // Will be undefined if not present, which is now allowed by schema
        listing: listingId, // Will be undefined if not present, which is now allowed by schema
        status: "success", // Always save as lowercase 'success'
      });
      console.log("Payment document created:", payment);

      console.log("Saving payment...");
      await payment.save();
      console.log("Payment saved successfully.");

      req.flash("success", "Payment successful!");
      console.log("Redirecting to success page...");
      return res.redirect(`/listings/return?status=success&orderId=${order.data.order_id}&amount=${order.data.order_amount}&listingTitle=${listingTitle}`);
    } else {
      console.log("Order is not PAID. Status:", order.data.order_status);
      req.flash("error", "Payment failed or is pending.");
      return res.redirect(`/listings/return?status=failed&orderId=${order.data.order_id}`);
    }
  } catch (err) {
    console.error("Payment callback error:", err);
    req.flash("error", "An error occurred during payment verification.");
    return res.redirect("/listings/return?status=error");
  }
}));

// Verify order API
app.get("/verify-order/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const version = "2025-01-01"; // API version
    const response = await cashfree.PGFetchOrder(version, orderId);
    return res.json({ success: true, data: response });
  } catch (err) {
    console.error("Cashfree verify-order error:", err?.response?.data || err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});



// ================== Error Handling ==================
app.use((req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  // if (err.name === "CastError") {
  //   err.message = "Invalid ID format.";
  //   err.statusCode = 400;
  // }

  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Something went wrong!";
  res.status(statusCode).render("error", { err });
});

// ================== Start Server ==================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
