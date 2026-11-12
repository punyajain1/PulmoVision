const rateLimit = require("express-rate-limit");

function limiter(windowMinutes, limit, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message },
  });
}

// Login and registration: slows down password guessing.
const authLimiter = limiter(15, 20, "Too many login or registration attempts. Please try again in 15 minutes.");

// Predictions run OCR and call the ML service, so they are the most expensive requests.
const predictionLimiter = limiter(15, 30, "Too many predictions in a short time. Please try again in a few minutes.");

// What-If calls are cheap (no OCR, no SHAP) and happen as the user clicks toggles.
const simulationLimiter = limiter(15, 300, "Too many What-If requests. Please wait a few minutes.");

// Chat calls the Gemini API and spends its quota.
const chatLimiter = limiter(15, 40, "Too many chat messages. Please try again in a few minutes.");

module.exports = { authLimiter, predictionLimiter, simulationLimiter, chatLimiter };
