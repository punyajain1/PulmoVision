import api from "./api";

async function register(name, email, password) {
  const { data } = await api.post("/auth/register", { name, email, password });
  return data.data;
}

async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data.data;
}

async function getMe() {
  const { data } = await api.get("/auth/me");
  return data.data;
}

export default { register, login, getMe };
