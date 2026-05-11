require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || 'local'}`
});

const requiredEnvVars = [
  "STRIPE_SECRET",
  "WEBHOOK_SECRET",
  "AWS_REGION",
  "INVOICE_LAMBDA",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

//validateEnvironment();

// module.exports = {
//   PORT: process.env.PORT || 3000,
//   STRIPE_SECRET: process.env.STRIPE_SECRET,
//   WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
//   AWS_REGION: process.env.AWS_REGION,
//   INVOICE_LAMBDA: process.env.INVOICE_LAMBDA,
//   DB_HOST: process.env.DB_HOST,
//   DB_USER: process.env.DB_USER,
//   DB_PASSWORD: process.env.DB_PASSWORD,
//   DB_NAME: process.env.DB_NAME,
//   NODE_ENV: process.env.NODE_ENV || "development",
// };