const crypto = require("crypto");

const { getPool } = require("../config/db");
const logger = require("../utils/logger");
const { getSecrets } = require("../config/secrets");

// ======================================================
// Verify Razorpay Webhook Signature
// ======================================================

function verifyWebhookSignature(body, signature, secret) {

  if (!signature || !secret) {
    return false;
  }

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

// ======================================================
// Webhook Handler
// ======================================================

const webhookHandler = async (event) => {

  let connection;

  let eventId = null;
  let eventType = null;
  let razorpayOrderId = null;
  let razorpayPaymentId = null;

  try {

    // ======================================================
    // Handle Empty Ping
    // ======================================================

    if (!event.body || event.body.length === 0) {

      logger.info("Webhook ping received");

      return {
        statusCode: 200,
        body: "",
      };
    }

    // ======================================================
    // Handle Base64 Body
    // ======================================================

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    // ======================================================
    // Extract Signature
    // ======================================================

    const signature =
      event.headers?.["x-razorpay-signature"] ||
      event.headers?.["X-Razorpay-Signature"];

    // ======================================================
    // Load Secrets
    // ======================================================

    const secrets = await getSecrets();

    // ======================================================
    // Verify Signature
    // ======================================================

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

    // ======================================================
    // Parse Payload
    // ======================================================

    let eventData;

    try {

      eventData = JSON.parse(rawBody);

    } catch (err) {

      logger.warn("Invalid webhook JSON payload");

      return {
        statusCode: 400,
        body: "Invalid JSON payload",
      };
    }

    // ======================================================
    // Extract Payment Entity
    // ======================================================

    const payment =
      eventData.payload?.payment?.entity || {};

    eventId =
      eventData.id ||
      `evt_${payment.id || "unknown"}_${Date.now()}`;

    eventType =
      eventData.event || "unknown";

    razorpayOrderId =
      payment.order_id || null;

    razorpayPaymentId =
      payment.id || null;

    // ======================================================
    // Validate Event Type
    // ======================================================

    const allowedEvents = [
      "payment.captured",
      "payment.failed",
    ];

    if (!allowedEvents.includes(eventType)) {

      logger.info(`Ignoring unsupported webhook event: ${eventType}`);

      return {
        statusCode: 200,
        body: "",
      };
    }

    // ======================================================
    // Validate Order ID
    // ======================================================

    if (!razorpayOrderId) {

      logger.warn(`Webhook missing order_id: ${eventId}`);

      return {
        statusCode: 400,
        body: "Missing order_id",
      };
    }

    logger.info("Webhook received", {
      eventId,
      eventType,
      razorpayOrderId,
      razorpayPaymentId,
    });

    // ======================================================
    // Get DB Connection
    // ======================================================

    const pool = await getPool();

    connection = await pool.getConnection();

    // ======================================================
    // Insert Webhook Event (Idempotency)
    // ======================================================

    const [insertResult] = await connection.execute(
      `
      INSERT IGNORE INTO webhook_events
      (
        event_id,
        event_type,
        razorpay_order_id,
        razorpay_payment_id,
        payload
      )
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

    // ======================================================
    // Duplicate Event
    // ======================================================

    if (insertResult.affectedRows === 0) {

      logger.info(`Duplicate webhook ignored: ${eventId}`);

      return {
        statusCode: 200,
        body: "",
      };
    }

    // ======================================================
    // Start Transaction
    // ======================================================

    await connection.beginTransaction();

    // ======================================================
    // PAYMENT SUCCESS
    // ======================================================

    if (eventType === "payment.captured") {

      const [orderUpdateResult] = await connection.execute(
        `
        UPDATE orders
        SET status = 'PAID'
        WHERE razorpay_order_id = ?
        AND status IN ('CREATED', 'PENDING')
        `,
        [razorpayOrderId]
      );

      if (orderUpdateResult.affectedRows === 0) {
        throw new Error("Order not found or already paid");
      }

      await connection.execute(
        `
        UPDATE payments
        SET payment_status = 'CAPTURED',
            razorpay_payment_id = ?
        WHERE razorpay_order_id = ?
        `,
        [
          razorpayPaymentId,
          razorpayOrderId,
        ]
      );

      logger.info(`Payment captured: ${razorpayOrderId}`);
    }

    // ======================================================
    // PAYMENT FAILURE
    // ======================================================

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

      logger.info(`Payment failed: ${razorpayOrderId}`);
    }

    // ======================================================
    // Mark Event Processed
    // ======================================================

    await connection.execute(
      `
      UPDATE webhook_events
      SET processed = TRUE,
          processed_at = NOW()
      WHERE event_id = ?
      `,
      [eventId]
    );

    // ======================================================
    // Commit Transaction
    // ======================================================

    await connection.commit();

    logger.info(`Webhook processed successfully: ${eventId}`);

    return {
      statusCode: 200,
      body: "",
    };

  } catch (err) {

    logger.error("Webhook processing failed", {
      error: err.message,
      eventId,
      eventType,
      razorpayOrderId,
      razorpayPaymentId,
    });

    // ======================================================
    // Rollback Transaction
    // ======================================================

    if (connection) {

      try {
        await connection.rollback();
      } catch (rollbackError) {
        logger.error("Rollback failed", rollbackError);
      }
    }

    // ======================================================
    // Store Error
    // ======================================================

    try {

      const pool = await getPool();

      await pool.execute(
        `
        UPDATE webhook_events
        SET error = ?
        WHERE event_id = ?
        `,
        [
          err.message || "Unknown error",
          eventId,
        ]
      );

    } catch (dbError) {

      logger.error(
        "Failed to update webhook error log",
        dbError
      );
    }

    // ======================================================
    // IMPORTANT:
    // Return 500 So Razorpay Retries
    // ======================================================

    return {
      statusCode: 500,
      body: "Webhook processing failed",
    };

  } finally {

    // ======================================================
    // Release Connection
    // ======================================================

    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  webhookHandler,
};