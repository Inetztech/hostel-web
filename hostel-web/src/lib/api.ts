import axios from "axios";
import { getToken, getRefreshToken, setToken, logout } from "./auth";

const api = axios.create({
  baseURL: "https://api.brindhavanamhostels.com/api",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
    config.transformRequest = (data) => data;
  } else {
    config.headers["Content-Type"] = "application/json";
  }

  config.headers["Cache-Control"] = "no-cache";
  config.headers["Pragma"] = "no-cache";

  return config;
});

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;

    if (err.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            orig.headers.Authorization = `Bearer ${token}`;
            return api(orig);
          })
          .catch((e) => Promise.reject(e));
      }

      orig._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post("https://api.brindhavanamhostels.com/api/auth/refresh", {
          refreshToken: getRefreshToken(),
        });
        const token = data.data.token;
        setToken(token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        orig.headers.Authorization = `Bearer ${token}`;
        processQueue(null, token);
        return api(orig);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;