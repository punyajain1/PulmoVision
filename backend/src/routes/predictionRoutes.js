const express = require("express");
const { body, param } = require("express-validator");
const predictionController = require("../controllers/predictionController");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const { predictionLimiter, simulationLimiter } = require("../middleware/rateLimits");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /predictions:
 *   post:
 *     tags: [Predictions]
 *     summary: Run a lung cancer risk prediction and save it to history
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PredictionInput' }
 *     responses:
 *       201:
 *         description: Prediction created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       400:
 *         description: Invalid or missing input fields
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       502:
 *         description: The ML service rejected the request or returned an unexpected response
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: The ML service is unavailable or still starting up
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   get:
 *     tags: [Predictions]
 *     summary: List all predictions for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of predictions
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
const BINARY_FIELDS = [
  "SMOKING", "YELLOW_FINGERS", "ANXIETY", "PEER_PRESSURE", "CHRONIC_DISEASE",
  "FATIGUE", "ALLERGY", "WHEEZING", "ALCOHOL_CONSUMING", "COUGHING",
  "SHORTNESS_OF_BREATH", "SWALLOWING_DIFFICULTY", "CHEST_PAIN",
];
const SURVEY_KEYS = ["GENDER", "AGE", ...BINARY_FIELDS];

// Validates the 15 survey answers. `extraKeys` lists any other fields allowed.
function surveyValidators(extraKeys = []) {
  const allowed = new Set([...SURVEY_KEYS, ...extraKeys]);
  return [
    body().custom((payload) => {
      const unknown = Object.keys(payload || {}).filter((key) => !allowed.has(key));
      if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(", ")}`);
      return true;
    }),
    body("GENDER").isIn(["M", "F"]).withMessage("GENDER must be M or F"),
    body("AGE").isInt({ min: 1, max: 120 }).withMessage("AGE must be a whole number from 1 to 120").toInt(),
    ...BINARY_FIELDS.map((field) =>
      body(field).isIn([0, 1, "0", "1"]).withMessage(`${field} must be 0 or 1`).toInt()
    ),
  ];
}

router.post(
  "/",
  predictionLimiter,
  [
    ...surveyValidators(["details", "reports"]),
    body("details").optional().isObject().withMessage("details must be an object"),
    body("reports").optional().isObject().withMessage("reports must be an object"),
  ],
  validate,
  predictionController.create
);

/**
 * @openapi
 * /predictions/simulate:
 *   post:
 *     tags: [Predictions]
 *     summary: What-If - run the risk model on changed answers without saving
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PredictionInput' }
 *     responses:
 *       200:
 *         description: "{ prediction, probability, modelVersion }"
 *       503:
 *         description: The ML service is unavailable or still starting up
 */
router.post(
  "/simulate",
  simulationLimiter,
  surveyValidators(),
  validate,
  predictionController.simulate
);
router.get("/", predictionController.list);

/**
 * @openapi
 * /predictions/{id}:
 *   get:
 *     tags: [Predictions]
 *     summary: Get a single prediction by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Prediction found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   delete:
 *     tags: [Predictions]
 *     summary: Delete a prediction by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid prediction id")],
  validate,
  predictionController.getById
);
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid prediction id")],
  validate,
  predictionController.remove
);
router.patch(
  "/:id/review",
  [
    param("id").isMongoId().withMessage("Invalid prediction id"),
    body("clinicalNotes")
      .optional()
      .isString().withMessage("clinicalNotes must be text")
      .isLength({ max: 5000 }).withMessage("clinicalNotes can be at most 5000 characters"),
    body("doctorReviewed").optional().isBoolean({ strict: true }).withMessage("doctorReviewed must be true or false"),
  ],
  validate,
  predictionController.review
);

module.exports = router;
