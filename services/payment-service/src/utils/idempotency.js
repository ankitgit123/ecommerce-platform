const paymentRepository = require("../repositories/paymentRepository");
const logger = require("./logger");

/**
 * Check if a webhook event has already been processed
 */
async function checkEvent(eventId) {
  try {
    const existing = await paymentRepository.findWebhookEvent(eventId);

    if (existing) {
      logger.info(`Webhook event ${eventId} already processed`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`Failed to check event idempotency: ${error.message}`);
    throw error;
  }
}

/**
 * Save a webhook event record to mark it as processed
 */
async function saveEvent(eventId, eventType) {
  try {
    await paymentRepository.saveWebhookEvent(eventId, eventType);
    logger.info(`Webhook event ${eventId} saved for idempotency`);
  } catch (error) {
    logger.error(`Failed to save webhook event: ${error.message}`);
    throw error;
  }
}

module.exports = {
  checkEvent,
  saveEvent,
};