const app = require("./app");
const logger = require("./utils/logger");
const env = require("./config/env");

const PORT = env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Payment service running on ${PORT}`);
});
