const dns = require("dns");
const mongoose = require("mongoose");
const env = require("./env");

if (env.mongodbUri && env.mongodbUri.startsWith("mongodb+srv://")) {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (err) {
    // Container networking fallback
  }
}

async function connectDB() {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;