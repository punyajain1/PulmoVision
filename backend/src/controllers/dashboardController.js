const dashboardService = require("../services/dashboardService");
const { success } = require("../utils/response");

async function stats(req, res, next) {
  try {
    const data = await dashboardService.getStats(req.user.id);
    success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { stats };
