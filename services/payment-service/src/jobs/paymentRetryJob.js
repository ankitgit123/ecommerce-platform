const paymentRepo = require("../repositories/paymentRepository");
const invoiceService = require("../services/invoiceService");
const logger = require("../utils/logger");

async function processJobByType(job) {
  if (job.job_type === "invoice") {
    return invoiceService.generate({
      id: job.payment_id,
    });
  }

  throw new Error(`Unknown job type: ${job.job_type}`);
}

async function processRetries() {
  try {
    const retryJobs = await paymentRepo.getRetryJobs();

    if (!retryJobs || retryJobs.length === 0) {
      logger.info("No retry jobs to process");
      return;
    }

    for (const job of retryJobs) {
      try {
        await processJobByType(job);
        await paymentRepo.markRetrySuccess(job.id);
        logger.info(`Retry job completed: ${job.id}`);
      } catch (error) {
        const errorMsg = error.message || "Unknown error";
        await paymentRepo.incrementRetry(job.id);
        logger.error(`Retry job failed for ID ${job.id}: ${errorMsg}`);
      }
    }
  } catch (error) {
    logger.error(`Retry job process crashed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processRetries,
};