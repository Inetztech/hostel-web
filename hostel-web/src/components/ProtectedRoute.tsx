// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { getUserRole } from "@/lib/auth";

interface ProtectedRouteProps {
  allow: ("SUPER_ADMIN" | "ADMIN" | "WARDEN" | "TENANT")[];
  children?: React.ReactNode;
}

/**
 * ProtectedRoute:
 * - If user role is allowed, renders children or nested <Outlet />
 * - Otherwise redirects to /unauthorized
 * - Redirects to login if not logged in
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allow, children }) => {
  const role = getUserRole();

  if (!role) return <Navigate to="/" replace />; // not logged in
  if (!allow.includes(role)) return <Navigate to="/unauthorized" replace />; // role not allowed

  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;
