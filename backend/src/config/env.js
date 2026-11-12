require("dotenv").config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// Fail fast in production instead of signing tokens with a publicly known
// default secret (anyone who knows the default could forge a login).
const DEV_JWT_SECRET = "dev-only-secret-not-for-production";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : DEV_JWT_SECRET);
if (isProduction && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters when NODE_ENV=production");
}
if (!process.env.JWT_SECRET && !isProduction) {
  console.warn("JWT_SECRET is not set - using an insecure development secret.");
}

// Comma-separated list of frontend origins allowed to call the API,
// e.g. "https://pulmodetect.vercel.app,http://localhost:5173".
const clientUrls = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const env = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/lung_cancer_risk",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  mlServiceUrl: (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/$/, ""),
  // Free hosting (Render) sleeps when idle and needs up to ~60 s to wake up.
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS) || 75000,
  clientUrls,
  nodeEnv,
  isProduction,
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
};

module.exports = env;
