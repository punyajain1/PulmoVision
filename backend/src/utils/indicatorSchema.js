/**
 * Server-side mirror of the frontend's FOLLOWUP_SCHEMAS (see
 * frontend/src/components/PredictionForm.jsx). The frontend already blocks
 * submission until every "Yes" indicator has its required follow-up
 * questions answered, but that is only a client-side check - anyone calling
 * this API directly (Postman, curl, a modified client) could send
 * `SMOKING: 1` with no supporting detail at all. This module lets the
 * backend independently re-verify the same rule before a prediction is run.
 *
 * Only the required question ids are listed here (optional ones are left
 * out on purpose - they are optional on the backend too).
 */

const INDICATOR_LABELS = {
  SMOKING: "Active Smoking History",
  ALCOHOL_CONSUMING: "Alcohol Consumption",
  PEER_PRESSURE: "Environmental / Peer Pressure",
  YELLOW_FINGERS: "Yellow Fingers / Nails",
  ANXIETY: "Heightened Anxiety",
  CHRONIC_DISEASE: "Chronic Respiratory / Lung Condition",
  FATIGUE: "Unexplained Fatigue",
  ALLERGY: "Respiratory Allergies",
  WHEEZING: "Wheezing Sound in Breath",
  COUGHING: "Persistent Chronic Cough",
  SHORTNESS_OF_BREATH: "Shortness of Breath (Dyspnea)",
  SWALLOWING_DIFFICULTY: "Difficulty Swallowing (Dysphagia)",
  CHEST_PAIN: "Frequent Chest Pain",
};

const REQUIRED_DETAIL_FIELDS = {
  SMOKING: ["smokerType", "productType", "perDay", "yearsSmoked", "ageStarted", "quitAttempts"],
  ALCOHOL_CONSUMING: ["type", "amount", "frequency", "duration", "currentOrFormer", "heavyHistory"],
  PEER_PRESSURE: ["exposureType", "hoursExposure", "yearsExposure", "indoorOutdoor", "householdSmoker"],
  YELLOW_FINGERS: ["duration", "handsAffected", "location", "worsening", "smokingStatus", "otherSymptoms"],
  ANXIETY: ["duration", "frequency", "severity", "interferesSleep", "diagnosed", "inTreatment"],
  CHRONIC_DISEASE: ["condition", "diagnosedWhen", "symptomFrequency", "hospitalizations", "priorLungTest"],
  FATIGUE: ["duration", "pattern", "severity", "interferesActivities", "weightLoss", "nightSweats", "sleepProblems", "recentIllness"],
  ALLERGY: ["triggers", "frequency", "symptoms", "duration", "diagnosed"],
  WHEEZING: ["duration", "frequency", "timing", "nighttime", "withCough", "shortnessOfBreath", "historyAsthmaCopd", "smokingHistory"],
  COUGHING: ["duration", "type", "frequency", "worsening", "bloodInSputum", "chestPain", "shortnessOfBreath", "fever", "weightLoss", "smokingHistory", "knownRespiratoryDisease"],
  SHORTNESS_OF_BREATH: ["when", "duration", "worsening", "severity", "chestPain", "wheezing", "cough", "knownCondition", "smokingHistory", "walkTolerance"],
  SWALLOWING_DIFFICULTY: ["duration", "difficultyWith", "painWhileSwallowing", "foodStuckFeeling", "worsening", "weightLoss", "hoarseness", "coughWhileEating"],
  CHEST_PAIN: ["location", "onset", "frequency", "episodeDuration", "severity", "type", "activityRelated", "radiates", "affectedByBreathing", "shortnessOfBreath", "associatedSymptoms"],
};

// Indicators whose supporting report/image is mandatory (not optional).
// Keep this in sync with `required: true` on the matching field's
// `upload` config in the frontend's FOLLOWUP_SCHEMAS.
const REQUIRED_REPORT_FIELDS = [
  "YELLOW_FINGERS",
  "CHRONIC_DISEASE",
  "COUGHING",
  "SHORTNESS_OF_BREATH",
  "SWALLOWING_DIFFICULTY",
  "CHEST_PAIN",
];

function isAnswered(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function hasReport(reports, fieldId) {
  const report = reports && reports[fieldId];
  return !!(report && typeof report.dataUrl === "string" && report.dataUrl.trim() !== "");
}

/**
 * Checks every indicator that is marked "Yes" (1) in inputData against the
 * required-question list above, and - for indicators in
 * REQUIRED_REPORT_FIELDS - against whether a supporting report was
 * actually attached.
 *
 * @param {Object} inputData - the 0/1 indicator fields (e.g. { SMOKING: 1, ... })
 * @param {Object} details - the follow-up answers, keyed by indicator id
 * @param {Object} reports - the uploaded reports, keyed by indicator id
 * @returns {Array<{ field: string, label: string, missingQuestions: string[], missingReport: boolean }>}
 *          empty array when everything required has been provided
 */
function getMissingIndicatorDetails(inputData = {}, details = {}, reports = {}) {
  const missing = [];

  for (const fieldId of Object.keys(REQUIRED_DETAIL_FIELDS)) {
    if (Number(inputData[fieldId]) !== 1) continue;

    const answers = details[fieldId] || {};
    const missingQuestions = REQUIRED_DETAIL_FIELDS[fieldId].filter(
      (questionId) => !isAnswered(answers[questionId])
    );

    const missingReport =
      REQUIRED_REPORT_FIELDS.includes(fieldId) && !hasReport(reports, fieldId);

    if (missingQuestions.length > 0 || missingReport) {
      missing.push({
        field: fieldId,
        label: INDICATOR_LABELS[fieldId] || fieldId,
        missingQuestions,
        missingReport,
      });
    }
  }

  return missing;
}

/**
 * Turns the array returned by getMissingIndicatorDetails into one
 * human-readable sentence fragment for use in an error message, e.g.
 * "Frequent Chest Pain (missing required follow-up questions and required
 * supporting report)".
 */
function describeMissing(missing) {
  return missing
    .map((m) => {
      const parts = [];
      if (m.missingQuestions.length > 0) parts.push("required follow-up questions");
      if (m.missingReport) parts.push("required supporting report");
      return `${m.label} (missing ${parts.join(" and ")})`;
    })
    .join("; ");
}

module.exports = {
  INDICATOR_LABELS,
  REQUIRED_DETAIL_FIELDS,
  REQUIRED_REPORT_FIELDS,
  getMissingIndicatorDetails,
  describeMissing,
};