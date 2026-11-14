/**
 * Deletes legacy predictions created by the old fallback scoring formula.
 *
 * Those records were written before model v2.1.0 and never had a modelVersion.
 * Every real prediction from the current ML service sets modelVersion
 * ("2.1.0"), so filtering on its absence targets only the stale rows and
 * leaves genuine predictions untouched.
 *
 * Usage (from backend/), reads MONGODB_URI from backend/.env or the shell:
 *     node scripts/clean_legacy_predictions.js          # dry run: counts only
 *     node scripts/clean_legacy_predictions.js --delete # actually delete
 *
 * To wipe EVERY prediction instead (e.g. for a clean demo), use:
 *     node scripts/clean_legacy_predictions.js --all --delete
 */

const mongoose = require("mongoose");
const env = require("../src/config/env");
const Prediction = require("../src/models/Prediction");

const DELETE = process.argv.includes("--delete");
const ALL = process.argv.includes("--all");

// Legacy = no modelVersion (fallback formula) OR engine not from the ML service.
const legacyFilter = {
  $or: [
    { modelVersion: { $in: [null, ""] } },
    { modelVersion: { $exists: false } },
    { engine: { $ne: "FastAPI ML service" } },
  ],
};
const filter = ALL ? {} : legacyFilter;

async function main() {
  await mongoose.connect(env.mongodbUri);
  const total = await Prediction.countDocuments({});
  const matched = await Prediction.countDocuments(filter);
  console.log(`Total predictions: ${total}`);
  console.log(`${ALL ? "ALL" : "Legacy (no modelVersion / old engine)"} matched: ${matched}`);
  console.log(`Will keep: ${total - matched}`);

  if (!DELETE) {
    console.log("\nDry run only. Re-run with --delete to remove them.");
  } else {
    const res = await Prediction.deleteMany(filter);
    console.log(`\nDeleted ${res.deletedCount} prediction(s).`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
