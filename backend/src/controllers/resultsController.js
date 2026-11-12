const mlService = require("../services/mlService");
const { success } = require("../utils/response");

async function getModelComparison(req, res, next) {
  try {
    const data = await mlService.getModelComparison();
    success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getFeatureElimination(req, res, next) {
  try {
    const data = await mlService.getFeatureElimination();
    success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getModelComparison, getFeatureElimination };
