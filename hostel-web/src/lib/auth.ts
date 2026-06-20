import { Role } from "./types";

export const getToken = (): string | null =>
  sessionStorage.getItem("token");

export const getRefreshToken = (): string | null =>
  sessionStorage.getItem("refreshToken");

export const setToken = (token: string) =>
  sessionStorage.setItem("token", token);

export const getUserRole = (): Role | null => {
  const role = sessionStorage.getItem("role");
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "WARDEN" || role === "TENANT") {
    return role as Role;
  }
  return null;
};

export const logout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("branchId");
  window.location.href = "/";
};