const crypto = require("crypto");
const { getPool } = require("../config/db");
const logger = require("../utils/logger");
const { getSecrets } = require("../config/secrets");

// 🔐 Signature verification
function verifyWebhookSignature(body, signature, secret) {
  if (!signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

const webhookHandler = async (event) => {
  // 🔥 1. Handle empty ping
  if (!event.body || event.body.length === 0) {
    logger.info("Webhook ping / empty payload received");

    return {
      statusCode: 200,
      body: "",
    };
  }

  const signature =
    event.headers?.["x-razorpay-signature"] ||
    event.headers?.["X-Razorpay-Signature"];

  const rawBody = event.body;

  // 🔐 Load secrets FIRST
  const secrets = await getSecrets();

  // 🔐 Verify signature
  const isValid = verifyWebhookSignature(
    rawBody,
    signature,
    secrets.RAZORPAY_WEBHOOK_SECRET
  );

  if (!isValid) {
    logger.warn("Invalid Razorpay webhook signature");

    return {
      statusCode: 400,
      body: "Invalid signature",
    };
  }

  // 🔥 Parse safely
  let eventData;

  try {
    eventData = JSON.parse(rawBody.toString());

  } catch (err) {
    logger.warn("Invalid JSON in webhook");

    return {
      statusCode: 200,
      body: "",
    };
  }

  const payment = eventData.payload?.payment?.entity || {};

  // 🔥 Safe extraction
  const eventId =
    eventData.id ||
    `evt_${payment.id || "unknown"}_${eventData.created_at || Date.now()}`;

  const eventType = eventData.event || "unknown";

  const razorpayOrderId = payment.order_id ?? null;

  const razorpayPaymentId = payment.id ?? null;

  if (!razorpayOrderId) {
    logger.warn(`Webhook missing order_id: ${eventId}`);

    return {
      statusCode: 200,
      body: "",
    };
  }

  let connection;

  try {
    // ✅ Get pool AFTER secrets loaded
    const pool = await getPool();

    connection = await pool.getConnection();

    // ✅ STEP 1: INSERT webhook event OUTSIDE transaction
    const [insertResult] = await connection.execute(
      `
      INSERT IGNORE INTO webhook_events
      (event_id, event_type, razorpay_order_id, razorpay_payment_id, payload)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        eventId,
        eventType,
        razorpayOrderId,
        razorpayPaymentId,
        JSON.stringify(eventData),
      ]
    );

    // 🔁 Duplicate event → ignore safely
    if (insertResult.affectedRows === 0) {
      logger.info(`Duplicate webhook ignored: ${eventId}`);

      return {
        statusCode: 200,
        body: "",
      };
    }

    // 🔥 STEP 2: Transaction
    await connection.beginTransaction();

    // 🔥 SUCCESS FLOW
    if (eventType === "payment.captured") {
      await connection.execute(
        `
        UPDATE orders
        SET status = 'PAID'
        WHERE razorpay_order_id = ?
        AND status != 'PAID'
        `,
        [razorpayOrderId]
      );

      await connection.execute(
        `
        UPDATE payments
        SET payment_status = 'CAPTURED',
            razorpay_payment_id = ?
        WHERE razorpay_order_id = ?
        `,
        [razorpayPaymentId, razorpayOrderId]
      );
    }

    // 🔥 FAILURE FLOW
    if (eventType === "payment.failed") {
      await connection.execute(
        `
        UPDATE orders
        SET status = 'FAILED'
        WHERE razorpay_order_id = ?
        AND status != 'FAILED'
        `,
        [razorpayOrderId]
      );

      await connection.execute(
        `
        UPDATE payments
        SET payment_status = 'FAILED',
            failure_reason = ?
        WHERE razorpay_order_id = ?
        `,
        [
          payment.error_description || "Payment failed",
          razorpayOrderId,
        ]
      );
    }

    // 🔥 STEP 3: Mark processed
    await connection.execute(
      `
      UPDATE webhook_events
      SET processed = TRUE,
          processed_at = NOW()
      WHERE event_id = ?
      `,
      [eventId]
    );

    await connection.commit();

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    logger.error(`Webhook processing failed: ${err.message}`, {
      eventId,
      eventType,
      razorpayOrderId,
      razorpayPaymentId,
    });

    try {
      const pool = await getPool();

      await pool.execute(
        `
        UPDATE webhook_events
        SET error = ?
        WHERE event_id = ?
        `,
        [err.message || "Unknown error", eventId]
      );

    } catch (e) {
      logger.error("Failed to update webhook error log", e);
    }

  } finally {
    if (connection) {
      connection.release();
    }
  }

  return {
    statusCode: 200,
    body: "",
  };
};

module.exports = {
  webhookHandler,
};