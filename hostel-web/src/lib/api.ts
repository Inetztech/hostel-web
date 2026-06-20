import axios from "axios";
import { getToken, getRefreshToken, setToken, logout } from "./auth";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers["Content-Type"];
  else config.headers["Content-Type"] = "application/json";
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        const { data } = await axios.post("http://localhost:8080/api/auth/refresh", {
          refreshToken: getRefreshToken(),
        });
        const token = data.data.token;
        setToken(token);
        orig.headers.Authorization = `Bearer ${token}`;
        return api(orig);
      } catch {
        logout();
      }
    }
    return Promise.reject(err);
  }
);

export default api;