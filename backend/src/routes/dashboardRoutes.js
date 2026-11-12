const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const authenticate = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get aggregate dashboard stats for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get("/stats", authenticate, dashboardController.stats);

module.exports = router;
