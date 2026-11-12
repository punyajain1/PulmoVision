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
  const reportReview = await analyzeAllReports(inputData, reports, REQUIRED_REPORT_FIELDS);

  const result = await mlService.getPrediction(inputData);

  const prediction = result.data || result;

  const savedPrediction = await Prediction.create({
    userId,
    inputData,
    details: details || {},
    reports: reports || {},
    reportReview,
    featureContributions: prediction.featureContributions || [],
    prediction: prediction.prediction,
    probability: prediction.probability,
    modelName: prediction.modelName,
  });

  return savedPrediction;
}

async function listPredictions(userId) {
  return Prediction.find({ userId })
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

async function updateDoctorReview(predictionId, { clinicalNotes, doctorReviewed }) {
  if (!mongoose.Types.ObjectId.isValid(predictionId)) {
    throw new ApiError(400, "Invalid prediction id");
  }

  const prediction = await Prediction.findByIdAndUpdate(
    predictionId,
    { clinicalNotes, doctorReviewed: Boolean(doctorReviewed) },
    { new: true }
  );

  if (!prediction) {
    throw new ApiError(404, "Prediction not found");
  }

  return prediction;
}

module.exports = {
  createPrediction,
  listPredictions,
  getPredictionById,
  deletePrediction,
  updateDoctorReview,
};