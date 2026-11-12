const express = require("express");
const { body } = require("express-validator");
const { generateAIResponse } = require("../services/aiChatService");
const validate = require("../middleware/validate");
const { success } = require("../utils/response");

const router = express.Router();

router.post(
  "/chat",
  [body("message").trim().notEmpty().withMessage("Message is required")],
  validate,
  async (req, res, next) => {
    try {
      const { message, history } = req.body;
      const result = await generateAIResponse(message, history);
      success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
