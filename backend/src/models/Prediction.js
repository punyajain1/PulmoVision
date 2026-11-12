const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inputData: { type: Object, required: true },
    prediction: { type: String, required: true },
    probability: { type: Number, required: true },
    modelName: { type: String, required: true },
    // Which service and model version produced this result.
    modelVersion: { type: String, default: null },
    engine: { type: String, default: null },
    // Input columns the model uses, and the SHAP base value (average
    // prediction over training cases). baseValue + sum of SHAP = probability.
    modelFeatures: { type: [String], default: [] },
    baseValue: { type: Number, default: null },
    // Reliability information from the ML service (model v2.1.0+):
    // calibrated probability, screening threshold, tree-spread range,
    // conformal set and the unusual-input check.
    calibrated: { type: Boolean, default: false },
    threshold: { type: Number, default: null },
    trainingPositiveRate: { type: Number, default: null },
    uncertainty: { type: Object, default: null },
    conformal: { type: Object, default: null },
    outOfDistribution: { type: Object, default: null },
    lowConfidence: { type: Boolean, default: false },
    reports: { type: Object, default: {} },
    reportReview: { type: Object, default: {} },
    details: { type: Object, default: {} },
    featureContributions: { type: Array, default: [] },
    clinicalNotes: { type: String, default: "", maxlength: 5000 },
    doctorReviewed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Prediction", predictionSchema);
