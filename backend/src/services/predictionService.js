const mongoose = require("mongoose");

const Prediction = require("../models/Prediction");
const mlService = require("./mlService");
const ApiError = require("../utils/ApiError");
const {
  getMissingIndicatorDetails,
  describeMissing,
  REQUIRED_REPORT_FIELDS,
  INDICATOR_LABELS,
} = require("../utils/indicatorSchema");
const { validateReportFile } = require("../utils/fileValidation");
const { analyzeAllReports } = require("./reportAnalysisService");

async function createPrediction(userId, payload) {
  // The clinical follow-up answers and uploaded reports travel alongside the
  // 0/1 indicator fields but should not be sent to the ML microservice -
  // split them out here.
  const { details, reports, ...inputData } = payload;

  // 1) Re-check, on the server, that every indicator marked "Yes" has its
  // required follow-up questions answered AND - for the indicators where a
  // report is mandatory - that a report was actually attached. The frontend
  // already enforces both of these, but that check alone can be bypassed by
  // calling this endpoint directly, so a prediction is only run once the
  // inserted data passes this validation.
  const missing = getMissingIndicatorDetails(inputData, details, reports);
  if (missing.length > 0) {
    throw new ApiError(
      400,
      `Prediction blocked - missing required data: ${describeMissing(missing)}`,
      missing
    );
  }

  // 2) For the indicators whose report is mandatory, confirm the attached
  // file is a genuine, uncorrupted JPG/PNG/WEBP/PDF rather than trusting the
  // MIME label the browser sent. A spoofed or corrupted file is treated the
  // same as no file at all - the prediction is blocked.
  const invalidFiles = REQUIRED_REPORT_FIELDS
    .filter((fieldId) => Number(inputData[fieldId]) === 1)
    .map((fieldId) => ({ fieldId, validation: validateReportFile(reports?.[fieldId]) }))
    .filter(({ validation }) => !validation.valid);

  if (invalidFiles.length > 0) {
    const summary = invalidFiles
      .map(({ fieldId, validation }) => `${INDICATOR_LABELS[fieldId] || fieldId} (${validation.reason})`)
      .join("; ");
    throw new ApiError(400, `Prediction blocked - invalid file(s): ${summary}`, invalidFiles);
  }

  // 3) Read the content of each mandatory report: extract its text (OCR for
  // images, direct extraction for PDFs) and check whether it actually
  // mentions terms relevant to the indicator it was attached to. This is
  // informational only - it does NOT block the prediction and it does NOT
  // change the ML model's input. See reportAnalysisService.js for the
  // limits of what this can and can't verify.
  //
  // The ML call runs at the same time. It throws a 503/502 ApiError if the ML
  // service can't produce a real result, which rejects immediately and saves
  // nothing for a failed prediction.
  const [reportReview, prediction] = await Promise.all([
    analyzeAllReports(inputData, reports, REQUIRED_REPORT_FIELDS),
    mlService.getPrediction(inputData),
  ]);

  const savedPrediction = await Prediction.create({
    userId,
    inputData,
    details: details || {},
    reports: reports || {},
    reportReview,
    featureContributions: prediction.featureContributions,
    prediction: prediction.prediction,
    probability: prediction.probability,
    modelName: prediction.modelName,
    modelVersion: prediction.modelVersion,
    engine: prediction.engine,
    modelFeatures: prediction.modelFeatures,
    baseValue: prediction.baseValue,
    calibrated: prediction.calibrated,
    threshold: prediction.threshold,
    trainingPositiveRate: prediction.trainingPositiveRate,
    uncertainty: prediction.uncertainty,
    conformal: prediction.conformal,
    outOfDistribution: prediction.outOfDistribution,
    lowConfidence: prediction.lowConfidence,
  });

  return savedPrediction;
}

// What-If simulator: runs the model on changed answers without saving anything.
async function simulatePrediction(inputData) {
  return mlService.simulatePrediction(inputData);
}

// List views never need the uploaded files (base64, up to several MB each).
// They are still returned by getPredictionById.
async function listPredictions(userId) {
  return Prediction.find({ userId })
    .select("-reports")
    .sort({ createdAt: -1 })
    .lean();
}

async function getPredictionById(userId, predictionId) {
  if (!mongoose.Types.ObjectId.isValid(predictionId)) {
    throw new ApiError(400, "Invalid prediction id");
  }

  const prediction = await Prediction.findOne({
    _id: predictionId,
    userId,
  }).lean();

  if (!prediction) {
    throw new ApiError(404, "Prediction not found");
  }

  return prediction;
}

async function deletePrediction(userId, predictionId) {
  if (!mongoose.Types.ObjectId.isValid(predictionId)) {
    throw new ApiError(400, "Invalid prediction id");
  }

  const prediction = await Prediction.findOneAndDelete({
    _id: predictionId,
    userId,
  });

  if (!prediction) {
    throw new ApiError(404, "Prediction not found");
  }

  return prediction;
}

async function updateDoctorReview(userId, predictionId, { clinicalNotes, doctorReviewed }) {
  if (!mongoose.Types.ObjectId.isValid(predictionId)) {
    throw new ApiError(400, "Invalid prediction id");
  }

  // Only update the fields that were sent, so omitting one doesn't reset it.
  const update = {};
  if (clinicalNotes !== undefined) update.clinicalNotes = clinicalNotes;
  if (doctorReviewed !== undefined) update.doctorReviewed = doctorReviewed;

  // Scoped to the owner: a user can only review their own predictions.
  const prediction = await Prediction.findOneAndUpdate(
    { _id: predictionId, userId },
    update,
    { new: true, runValidators: true }
  ).select("-reports");

  if (!prediction) {
    throw new ApiError(404, "Prediction not found");
  }

  return prediction;
}

module.exports = {
  createPrediction,
  simulatePrediction,
  listPredictions,
  getPredictionById,
  deletePrediction,
  updateDoctorReview,
};