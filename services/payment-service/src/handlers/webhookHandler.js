const { webhookHandler } = require("../controllers/webhookController");

exports.handler = async (event) => {
  try {
    const result = await webhookHandler({
      body: event.body,
      isBase64Encoded: event.isBase64Encoded,
      headers: event.headers || {},
    });

    return result;
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};