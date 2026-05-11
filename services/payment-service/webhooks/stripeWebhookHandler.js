const stripe = require("../src/config/razorpay");
const webhookService = require("../src/services/webhookService");
const env = require("../src/config/env");

function verifyStripeEvent(req) {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    throw new Error("Missing Stripe signature header");
  }

  try {
    return stripe.webhooks.constructEvent(req.body, signature, env.WEBHOOK_SECRET);
  } catch (error) {
    throw new Error(`Stripe webhook verification failed: ${error.message}`);
  }
}

async function process(req) {
  const event = verifyStripeEvent(req);
  await webhookService.handleEvent(event);
}

module.exports = {
  process,
};