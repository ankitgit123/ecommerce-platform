function getTimestamp() {
  return new Date().toISOString();
}

function info(msg) {
  console.log(`${getTimestamp()} [INFO] ${msg}`);
}

function warn(msg) {
  console.warn(`${getTimestamp()} [WARN] ${msg}`);
}

function error(msg) {
  console.error(`${getTimestamp()} [ERROR] ${msg}`);
}

function debug(msg) {
  if (process.env.NODE_ENV === "development") {
    console.log(`${getTimestamp()} [DEBUG] ${msg}`);
  }
}

module.exports = {
  info,
  warn,
  error,
  debug,
};