const express = require("express");
const { body, param } = require("express-validator");
const predictionController = require("../controllers/predictionController");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");

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
 *       502:
 *         description: ML service error
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
router.post(
  "/",
  [
    body("GENDER").notEmpty().withMessage("GENDER is required"),
    body("AGE").isInt({ min: 1, max: 120 }).withMessage("AGE must be a valid number"),
  ],
  validate,
  predictionController.create
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
  [param("id").isMongoId().withMessage("Invalid prediction id")],
  validate,
  predictionController.review
);

module.exports = router;
