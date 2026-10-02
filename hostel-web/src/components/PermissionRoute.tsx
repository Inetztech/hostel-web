// src/components/PermissionRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { getUserRole, hasAnyPermission } from "@/lib/auth";

interface PermissionRouteProps {
  /** Permission(s) required to view this route (any one is enough). */
  require: string | string[];
  children?: React.ReactNode;
}

/**
 * Nest this INSIDE an existing <ProtectedRoute allow={[...]}> to add a
 * permission-level check on top of the role check. SUPER_ADMIN always
 * passes (full system access). ADMIN/WARDEN/TENANT must hold at least
 * one of the required permissions, or they're redirected the same way
 * ProtectedRoute redirects for a disallowed role.
 *
 * Usage:
 *   <ProtectedRoute allow={["ADMIN"]}>
 *     <PermissionRoute require="MANAGE_BRANCHES">
 *       <BranchPage />
 *     </PermissionRoute>
 *   </ProtectedRoute>
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({ require, children }) => {
  const role = getUserRole();

  if (!role) return <Navigate to="/" replace />;
  if (role === "SUPER_ADMIN") return <>{children ?? <Outlet />}</>;

  const required = Array.isArray(require) ? require : [require];
  if (!hasAnyPermission(required)) return <Navigate to="/unauthorized" replace />;

  return <>{children ?? <Outlet />}</>;
};

export default PermissionRoute;