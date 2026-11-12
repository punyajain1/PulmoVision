import api from "./api";

async function createPrediction(inputData) {
  const { data } = await api.post("/predictions", inputData);
  return data.data;
}

async function listPredictions() {
  const { data } = await api.get("/predictions");
  return data.data;
}

async function getPrediction(id) {
  const { data } = await api.get(`/predictions/${id}`);
  return data.data;
}

async function deletePrediction(id) {
  const { data } = await api.delete(`/predictions/${id}`);
  return data.data;
}

async function getDashboardStats() {
  const { data } = await api.get("/dashboard/stats");
  return data.data;
}

async function updateDoctorReview(id, reviewData) {
  const { data } = await api.patch(`/predictions/${id}/review`, reviewData);
  return data.data;
}

export default {
  createPrediction,
  listPredictions,
  getPrediction,
  deletePrediction,
  getDashboardStats,
  updateDoctorReview,
};
