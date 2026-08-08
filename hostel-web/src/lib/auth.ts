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

export const setUserProfile = (data: {
  email?: string;
  name?: string;
  phone?: string;
  userId?: number | null;
  hostelId?: number | null;
  hostelName?: string | null;
}) => {
  if (data.email) sessionStorage.setItem("email", data.email);
  if (data.name)  sessionStorage.setItem("displayName", data.name);
  if (data.phone) sessionStorage.setItem("phone", data.phone);
  if (data.userId != null) sessionStorage.setItem("userId", String(data.userId));
  else sessionStorage.removeItem("userId");
  if (data.hostelId != null) sessionStorage.setItem("hostelId", String(data.hostelId));
  else sessionStorage.removeItem("hostelId");
  if (data.hostelName) sessionStorage.setItem("hostelName", data.hostelName);
  else sessionStorage.removeItem("hostelName");
};

export const getUserEmail = (): string =>
  sessionStorage.getItem("email") ?? sessionStorage.getItem("userEmail") ?? "";

export const getUserDisplayName = (): string =>
  sessionStorage.getItem("displayName") ?? "";

export const getUserPhone = (): string =>
  sessionStorage.getItem("phone") ?? "";

export const getUserId = (): number | null => {
  const v = sessionStorage.getItem("userId");
  return v ? Number(v) : null;
};

export const getUserHostelId = (): number | null => {
  const v = sessionStorage.getItem("hostelId");
  return v ? Number(v) : null;
};

export const getUserHostelName = (): string | null =>
  sessionStorage.getItem("hostelName");

const PERMISSIONS_KEY = "permissions";

export const setUserPermissions = (permissions: string[] | undefined | null) => {
  sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions ?? []));
};

export const getUserPermissions = (): string[] => {
  try {
    const raw = sessionStorage.getItem(PERMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const hasPermission = (name: string): boolean => {
  if (getUserRole() === "SUPER_ADMIN") return true;
  return getUserPermissions().includes(name);
};

export const hasAnyPermission = (names: string[]): boolean => {
  if (names.length === 0) return true;
  if (getUserRole() === "SUPER_ADMIN") return true;
  const mine = getUserPermissions();
  return names.some((n) => mine.includes(n));
};

export const hasAllPermissions = (names: string[]): boolean => {
  if (names.length === 0) return true;
  if (getUserRole() === "SUPER_ADMIN") return true;
  const mine = getUserPermissions();
  return names.every((n) => mine.includes(n));
};

export const logout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("branchId");
  sessionStorage.removeItem("email");
  sessionStorage.removeItem("displayName");
  sessionStorage.removeItem("phone");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("hostelId");
  sessionStorage.removeItem("hostelName");
  sessionStorage.removeItem("permissions");
  sessionStorage.removeItem("tenantId");
  sessionStorage.removeItem("tenantIdToken");
  window.location.href = "/login";
};