module.exports = (err, req, res, next) => {
  console.error("Unhandled error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    error: message,
  });
};