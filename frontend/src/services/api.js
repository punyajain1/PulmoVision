import axios from "axios";

let rawUrl = (import.meta.env.VITE_API_URL || "https://pulmoscanai-eut9.onrender.com/api").trim();
if (rawUrl.endsWith("/")) rawUrl = rawUrl.slice(0, -1);
if (!rawUrl.endsWith("/api")) rawUrl = `${rawUrl}/api`;
const API_URL = rawUrl;

// Free hosting (Render) puts the backend and ML service to sleep when idle,
// and the first request can take ~60 s or more while they wake up. A short
// timeout would report an error for a request that is still running.
const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;
