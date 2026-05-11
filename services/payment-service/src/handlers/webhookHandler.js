const { webhookHandler } = require("../controllers/webhookController");

exports.handler = async (event) => {
  try {
    const result = await webhookHandler({
      rawBody: event.body,
      headers: event.headers || {},
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result || { received: true }),
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