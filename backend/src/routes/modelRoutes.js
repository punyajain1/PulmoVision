const express = require("express");
const modelController = require("../controllers/modelController");
const authenticate = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /model/info:
 *   get:
 *     tags: [Model]
 *     summary: Get info about the currently deployed ML model
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Model metadata
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       502:
 *         description: ML service error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/info", authenticate, modelController.info);

module.exports = router;
