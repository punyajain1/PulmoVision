const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Unexpected server error";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field} already in use`;
  }

  // Mongoose cast error (bad ObjectId, etc.)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier supplied";
  }

  if (process.env.NODE_ENV !== "production" && statusCode === 500) {
    console.error(err);
  }

  const response = { success: false, message };
  if (err.details) response.errors = err.details;
  res.status(statusCode).json(response);
}

module.exports = { notFound, errorHandler };
