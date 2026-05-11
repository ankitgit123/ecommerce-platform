const paymentRepository = require("../repositories/paymentRepository");
const logger = require("./logger");

async function saveRetry(paymentId, jobType, error) {
  try {
    if (!paymentId || typeof paymentId !== "string") {
      throw new Error("Invalid payment ID for retry");
    }

    await paymentRepository.createRetryJob({
      payment_id: paymentId,
      job_type: jobType || "invoice",
      retry_count: 0,
      status: "pending",
    });

    logger.info(`Retry job created for payment ${paymentId}`);
  } catch (err) {
    logger.error(`Failed to save retry: ${err.message}`);
    throw err;
  }
}

module.exports = {
  saveRetry,
};