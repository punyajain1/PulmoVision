const express = require("express");
const resultsController = require("../controllers/resultsController");
const authenticate = require("../middleware/auth");

const router = express.Router();

router.get("/model-comparison", authenticate, resultsController.getModelComparison);
router.get("/feature-elimination", authenticate, resultsController.getFeatureElimination);

module.exports = router;
