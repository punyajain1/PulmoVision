const Prediction = require("../models/Prediction");

async function getStats(userId) {
  const predictions = await Prediction.find({ userId }).sort({ createdAt: -1 });

  const total = predictions.length;
  const highRisk = predictions.filter((p) => p.prediction === "High Risk").length;
  const lowRisk = total - highRisk;
  const recent = predictions.slice(0, 5);

  const avgProbability = total > 0 
    ? Math.round((predictions.reduce((acc, curr) => acc + (curr.probability || 0), 0) / total) * 100) / 100 
    : 0;

  return {
    total,
    highRisk,
    lowRisk,
    avgProbability,
    riskDistribution: [
      { name: "High Risk", value: highRisk },
      { name: "Low Risk", value: lowRisk },
    ],
    recent,
  };
}

module.exports = { getStats };
