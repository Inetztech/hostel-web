import axios from "axios";
import {
  getToken,
  getRefreshToken,
  setToken,
  logout,
} from "./auth";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
});


// ---------- REQUEST ----------
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// ---------- RESPONSE ----------
api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {

      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();

        const response = await axios.post(
          "http://localhost:8080/api/auth/refresh",
          { refreshToken }
        );

        // ✅ FIX HERE
        const newToken = response.data.data.token;

        setToken(newToken);

        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return api(originalRequest);

      } catch (e) {
        logout();
      }
    }

    return Promise.reject(err);
  }
);

export default api;