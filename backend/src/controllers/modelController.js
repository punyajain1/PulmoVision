const mlService = require("../services/mlService");
const { success } = require("../utils/response");

async function info(req, res, next) {
  try {
    const data = await mlService.getModelInfo();
    success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { info };
