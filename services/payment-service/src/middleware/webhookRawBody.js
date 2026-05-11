const bodyParser = require("body-parser");

// Use raw body parsing for Stripe webhook verification.
module.exports = bodyParser.raw({
  type: "application/json",
});