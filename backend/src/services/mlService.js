const axios = require("axios");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

// Every prediction, metric and explanation shown in the app must come from the
// ML service. If it can't be reached, the request fails with a clear error
// instead of falling back to made-up numbers.
const mlClient = axios.create({
  baseURL: env.mlServiceUrl,
  timeout: env.mlTimeoutMs,
});

function toApiError(err, what) {
  const status = err.response?.status;

  // The ML service rejected the input (FastAPI validation error).
  if (status === 422 || status === 400) {
    const detail = err.response?.data?.detail;
    console.warn(`ML service rejected ${what}:`, JSON.stringify(detail));
    return new ApiError(502, `The risk model rejected the ${what} request.`, detail);
  }

  if (status === 404) {
    return new ApiError(404, `The ML service has no ${what} available.`);
  }

  // The service is up but crashed while handling the request.
  if (status >= 500 && status !== 503) {
    console.warn(`ML service error for ${what}:`, JSON.stringify(err.response?.data));
    return new ApiError(502, `The risk model service failed while processing the ${what} request.`);
  }

  // Timeout, connection refused, DNS error, or 503 "artifacts not found".
  console.warn(`ML service unavailable for ${what}:`, err.code || status || err.message);
  return new ApiError(
    503,
    "The risk model service is unavailable or still starting up. Please try again in a minute."
  );
}

async function callPredict(inputData, explain) {
  let response;
  try {
    response = await mlClient.post("/predict", inputData, { params: { explain } });
  } catch (err) {
    throw toApiError(err, "prediction");
  }

  const data = response.data || {};
  if (typeof data.prediction !== "string" || typeof data.probability !== "number") {
    throw new ApiError(502, "The risk model returned an unexpected response.");
  }
  return data;
}

// Calibration flag, threshold, uncertainty range, conformal set and
// unusual-input check, passed through unchanged from the ML service.
function reliabilityFields(data) {
  return {
    calibrated: Boolean(data.calibrated),
    threshold: typeof data.threshold === "number" ? data.threshold : null,
    trainingPositiveRate: typeof data.trainingPositiveRate === "number" ? data.trainingPositiveRate : null,
    uncertainty: data.uncertainty || null,
    conformal: data.conformal || null,
    outOfDistribution: data.outOfDistribution || null,
    lowConfidence: Boolean(data.lowConfidence),
  };
}

async function getPrediction(inputData) {
  const data = await callPredict(inputData, true);
  return {
    prediction: data.prediction,
    probability: data.probability,
    ...reliabilityFields(data),
    modelName: data.modelName || "unknown",
    modelVersion: data.modelVersion || null,
    engine: "FastAPI ML service",
    // Input columns the model actually uses; other answers can't change the result.
    modelFeatures: Array.isArray(data.modelFeatures) ? data.modelFeatures : [],
    // Exact SHAP values from the model: baseValue + sum(shap) == probability.
    baseValue: typeof data.baseValue === "number" ? data.baseValue : null,
    featureContributions: Array.isArray(data.explanation) ? data.explanation : [],
  };
}

// What-If: re-runs the real model on changed answers. Nothing is saved.
async function simulatePrediction(inputData) {
  const data = await callPredict(inputData, false);
  return {
    prediction: data.prediction,
    probability: data.probability,
    ...reliabilityFields(data),
    modelVersion: data.modelVersion || null,
  };
}

async function getFromMl(path, what) {
  try {
    const response = await mlClient.get(path);
    return response.data;
  } catch (err) {
    throw toApiError(err, what);
  }
}

const getModelInfo = () => getFromMl("/model/info", "model information");
const getModelComparison = () => getFromMl("/results/model-comparison", "model comparison");
const getFeatureElimination = () => getFromMl("/results/feature-elimination", "feature selection history");

module.exports = {
  getPrediction,
  simulatePrediction,
  getModelInfo,
  getModelComparison,
  getFeatureElimination,
};
