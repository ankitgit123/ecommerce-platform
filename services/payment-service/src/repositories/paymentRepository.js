const db = require("../config/db");
const logger = require("../utils/logger");

const createPayment = async (data) => {
  try {
    const query = `
      INSERT INTO payments (
        user_id,
        amount,
        currency,
        status,
        stripe_session_id
      )
      VALUES (?,?,?,?,?)
    `;

    const values = [data.user_id, data.amount, data.currency, data.status, data.session_id];

    const [result] = await db.query(query, values);
    return result;
  } catch (error) {
    logger.error(`Failed to create payment: ${error.message}`);
    throw error;
  }
};

const markPaid = async (sessionId) => {
  try {
    const query = `
      UPDATE payments
      SET status = ?
      WHERE stripe_session_id = ?
    `;

    const [result] = await db.query(query, ["paid", sessionId]);
    return result;
  } catch (error) {
    logger.error(`Failed to mark payment as paid: ${error.message}`);
    throw error;
  }
};

const findWebhookEvent = async (eventId) => {
  try {
    const query = `
      SELECT *
      FROM webhook_events
      WHERE event_id = ?
    `;

    const [rows] = await db.query(query, [eventId]);
    return rows[0] || null;
  } catch (error) {
    logger.error(`Failed to find webhook event: ${error.message}`);
    throw error;
  }
};

const saveWebhookEvent = async (id, type) => {
  try {
    const query = `
      INSERT INTO webhook_events (
        event_id,
        event_type
      )
      VALUES (?,?)
    `;

    const [result] = await db.query(query, [id, type]);
    return result;
  } catch (error) {
    logger.error(`Failed to save webhook event: ${error.message}`);
    throw error;
  }
};

const createRetryJob = async (job) => {
  try {
    const query = `
      INSERT INTO retry_jobs (
        payment_id,
        job_type,
        retry_count,
        status
      )
      VALUES (?,?,?,?)
    `;

    const values = [job.payment_id, job.job_type, job.retry_count, job.status];

    const [result] = await db.query(query, values);
    return result;
  } catch (error) {
    logger.error(`Failed to create retry job: ${error.message}`);
    throw error;
  }
};

const getRetryJobs = async () => {
  try {
    const query = `
      SELECT *
      FROM retry_jobs
      WHERE status = 'pending' AND retry_count < 5
      ORDER BY created_at ASC
      LIMIT 10
    `;

    const [rows] = await db.query(query);
    return rows || [];
  } catch (error) {
    logger.error(`Failed to get retry jobs: ${error.message}`);
    throw error;
  }
};

const markRetrySuccess = async (jobId) => {
  try {
    const query = `
      UPDATE retry_jobs
      SET status = 'completed'
      WHERE id = ?
    `;

    const [result] = await db.query(query, [jobId]);
    return result;
  } catch (error) {
    logger.error(`Failed to mark retry as success: ${error.message}`);
    throw error;
  }
};

const incrementRetry = async (jobId) => {
  try {
    const query = `
      UPDATE retry_jobs
      SET retry_count = retry_count + 1,
          updated_at = NOW()
      WHERE id = ?
    `;

    const [result] = await db.query(query, [jobId]);
    return result;
  } catch (error) {
    logger.error(`Failed to increment retry count: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createPayment,
  markPaid,
  findWebhookEvent,
  saveWebhookEvent,
  createRetryJob,
  getRetryJobs,
  markRetrySuccess,
  incrementRetry,
};