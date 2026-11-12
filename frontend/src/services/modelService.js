import api from "./api";

async function getModelInfo() {
  const { data } = await api.get("/model/info");
  return data.data;
}

async function getModelComparison() {
  const { data } = await api.get("/results/model-comparison");
  return data.data;
}

async function getFeatureElimination() {
  const { data } = await api.get("/results/feature-elimination");
  return data.data;
}

export default { getModelInfo, getModelComparison, getFeatureElimination };
