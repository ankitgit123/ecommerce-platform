require("module-alias/register");

const { createPayment } = require("../controllers/paymentController");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const result = await createPayment(body);

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