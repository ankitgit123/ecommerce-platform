const crypto = require("crypto");
const { getPool } = require("../config/db");
const { getRazorpayInstance } = require("../config/razorpay");
const { getSecrets } = require("../config/secrets");
const logger = require("../utils/logger");

// ✅ Validation
function validatePaymentRequest(data) {
  if (!data) {
    const error = new Error("Request body is required");
    error.statusCode = 400;
    throw error;
  }

  if (!data.user_id || typeof data.user_id !== "string") {
    const error = new Error("user_id is required and must be a string");
    error.statusCode = 400;
    throw error;
  }

  if (typeof data.amount !== "number" || Number.isNaN(data.amount)) {
    const error = new Error("amount must be a number");
    error.statusCode = 400;
    throw error;
  }

  if (data.amount <= 0) {
    const error = new Error("amount must be greater than 0");
    error.statusCode = 400;
    throw error;
  }
}

// 🔵 CREATE PAYMENT
async function createPayment(body) {
  try {
    validatePaymentRequest(body);

    const pool = await getPool();

    const { user_id, amount } = body;

    const currency = (body.currency || "INR").toUpperCase();

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const razorpay = await getRazorpayInstance();

      logger.info("Creating Razorpay order", {
        amount,
        currency: "INR",
      });

      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency,
        receipt: `rcpt_${Date.now()}`,
        notes: { user_id },
      });

      logger.info("Order created successfully", {
        orderId: order.id,
        amount: order.amount,
      });

      if (!order?.id) {
        throw new Error("Failed to create Razorpay order");
      }

      await connection.execute(
        `INSERT INTO orders
        (razorpay_order_id, user_id, amount, currency, status, receipt)
        VALUES (?, ?, ?, ?, 'CREATED', ?)`,
        [order.id, user_id, amount, currency, order.receipt]
      );

      await connection.execute(
        `INSERT INTO payments
        (razorpay_order_id, amount, currency, payment_status)
        VALUES (?, ?, ?, 'CREATED')`,
        [order.id, amount, currency]
      );

      await connection.commit();

      const secrets = await getSecrets();


      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: secrets.RAZORPAY_KEY_ID,
      };

    } catch (error) {
      await connection.rollback();
      throw error;

    } finally {
      connection.release();
    }

  } catch (error) {
    logger.error(`Error creating payment: ${error}`);
    throw error;
  }
}

// 🟡 VERIFY PAYMENT
async function verifyPayment(body) {
  const pool = await getPool();

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = body;

  try {
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      const err = new Error("Missing required fields");
      err.statusCode = 400;
      throw err;
    }

    const secrets = await getSecrets();

    const generatedSignature = crypto
      .createHmac("sha256", secrets.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const signatureVerified =
      generatedSignature === razorpay_signature;

    // Save failed verification attempt
    if (!signatureVerified) {

      await pool.execute(
        `UPDATE payments
         SET signature_verified = ?,
             raw_response = ?,
             retry_count = retry_count + 1,
             failure_reason = ?
         WHERE razorpay_order_id = ?`,
        [
          false,
          JSON.stringify(body),
          "Invalid payment signature",
          razorpay_order_id,
        ]
      );

      const err = new Error("Invalid payment signature");
      err.statusCode = 400;
      throw err;
    }

    // Success update
    await pool.execute(
      `UPDATE payments
       SET payment_status = 'CAPTURED',
           razorpay_payment_id = ?,
           signature_verified = ?,
           raw_response = ?,
           failure_reason = NULL
       WHERE razorpay_order_id = ?
       AND payment_status != 'CAPTURED'`,
      [
        razorpay_payment_id,
        true,
        JSON.stringify(body),
        razorpay_order_id,
      ]
    );

    await pool.execute(
      `UPDATE orders
       SET status = 'PAID'
       WHERE razorpay_order_id = ?
       AND status != 'PAID'`,
      [razorpay_order_id]
    );

    return {
      success: true,
    };

  } catch (error) {

    // Save unexpected backend failure
    if (razorpay_order_id) {
      try {
        await pool.execute(
          `UPDATE payments
           SET retry_count = retry_count + 1,
               failure_reason = ?
           WHERE razorpay_order_id = ?`,
          [
            error.message,
            razorpay_order_id,
          ]
        );
      } catch (dbError) {
        logger.error(
          `Failed to update payment failure metadata: ${dbError.message}`
        );
      }
    }

    logger.error(`Error verifying payment: ${error.message}`);

    throw error;
  }
}

module.exports = {
  createPayment,
  verifyPayment,
};