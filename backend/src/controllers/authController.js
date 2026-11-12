const authService = require("../services/authService");
const { success } = require("../utils/response");

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    success(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    success(res, user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
