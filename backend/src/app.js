const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const env = require("./config/env");
const swaggerSpec = require("./config/swagger");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { authLimiter, chatLimiter } = require("./middleware/rateLimits");

const authRoutes = require("./routes/authRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const modelRoutes = require("./routes/modelRoutes");
const resultsRoutes = require("./routes/resultsRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// Render and similar hosts sit behind one proxy; needed so rate limits
// see the real client IP instead of the proxy's.
app.set("trust proxy", 1);

app.use(helmet());

// Only the configured frontend origins (CLIENT_URLS) may call the API from a
// browser. Localhost is also allowed outside production for development.
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        env.clientUrls.includes(origin) ||
        (!env.isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
      callback(null, allowed);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "25mb" }));
if (env.nodeEnv !== "test") {
  app.use(morgan(env.isProduction ? "combined" : "dev"));
}

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PulmoDetect API is online",
    version: "1.0.0",
    docs: "/api-docs",
    health: "/api/health",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/ai", chatLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/model", modelRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
