require("dotenv").config();
require("module-alias/register");
const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/paymentRoutes");
const webhookRoutes = require("./routes/webhookRoutes");


const app = express();

// 🔥 Webhook FIRST (IMPORTANT)
app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

// Other middleware
app.use(cors());
app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.send("payment ok");
});

// routes
app.use("/payment", paymentRoutes);

module.exports = app;