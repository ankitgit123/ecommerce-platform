require("module-alias/register");

const { verifyPayment } = require("../controllers/paymentController");

exports.handler = async (event) => {

  console.log({
    version: process.env.APP_VERSION,
    branch: process.env.GIT_BRANCH,
    environment: process.env.ENVIRONMENT,
  });

  console.log(process.env.APP_VERSION);

  try {
    const body = JSON.parse(event.body || "{}");

    const result = await verifyPayment(body);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};