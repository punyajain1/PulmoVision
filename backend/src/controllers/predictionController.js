const predictionService = require("../services/predictionService");
const { success } = require("../utils/response");

async function create(req, res, next) {
  try {
    const prediction = await predictionService.createPrediction(req.user.id, req.body);
    success(res, prediction, 201);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const predictions = await predictionService.listPredictions(req.user.id);
    success(res, predictions);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const prediction = await predictionService.getPredictionById(req.user.id, req.params.id);
    success(res, prediction);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await predictionService.deletePrediction(req.user.id, req.params.id);
    success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

async function review(req, res, next) {
  try {
    const updated = await predictionService.updateDoctorReview(req.params.id, req.body);
    success(res, updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, remove, review };
