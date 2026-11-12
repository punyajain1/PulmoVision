const { validationResult } = require("express-validator");

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const list = errors.array();
    // Same shape as errorHandler: { success, message, errors }. The frontend
    // shows `message`, so it must describe what's wrong.
    const messages = [...new Set(list.map((e) => e.msg))];
    return res.status(400).json({
      success: false,
      message: messages.join("; "),
      errors: list,
    });
  }

  next();
}

module.exports = validate;
