const express = require("express");
const { body } = require("express-validator");
const { generateAIResponse } = require("../services/aiChatService");
const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const { success } = require("../utils/response");

const router = express.Router();

// Login required: each message can spend Gemini API quota.
router.use(authenticate);

router.post(
  "/chat",
  [
    body("message")
      .isString().withMessage("Message must be text")
      .trim()
      .notEmpty().withMessage("Message is required")
      .isLength({ max: 2000 }).withMessage("Message can be at most 2000 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await generateAIResponse(req.body.message);
      success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
