// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { getUserRole, hasPermission } from "@/lib/auth";

interface ProtectedRouteProps {
  allow: ("SUPER_ADMIN" | "ADMIN" | "WARDEN" | "TENANT")[];
  /**
   * Optional fine-grained permission key (e.g. "MANAGE_FOOD_TIMETABLE").
   * If provided, the route also requires the logged-in user to hold this
   * permission — even if their role is in `allow`. SUPER_ADMIN always
   * passes (see hasPermission). Omit for routes that are role-gated only.
   */
  permission?: string;
  children?: React.ReactNode;
}

/**
 * ProtectedRoute:
 * - If user role is allowed, renders children or nested <Outlet />
 * - If a `permission` is given and the user lacks it, redirects to /unauthorized
 * - Otherwise redirects to /unauthorized
 * - Redirects to login if not logged in
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allow, permission, children }) => {
  const role = getUserRole();

  if (!role) return <Navigate to="/" replace />; // not logged in
  if (!allow.includes(role)) return <Navigate to="/unauthorized" replace />; // role not allowed
  if (permission && !hasPermission(permission)) return <Navigate to="/unauthorized" replace />; // permission not granted

  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;