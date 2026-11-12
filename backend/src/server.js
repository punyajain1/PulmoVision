const app = require("./app");
const env = require("./config/env");
const connectDB = require("./config/db");

async function startServer() {
  try {
    await connectDB();

    app.listen(env.port, "0.0.0.0", () => {
      console.log(`Backend running on port ${env.port}`);
      console.log(`Swagger docs: http://localhost:${env.port}/api-docs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();