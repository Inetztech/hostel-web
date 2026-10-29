// // src/components/PermissionRoute.tsx
// import { Navigate, Outlet } from "react-router-dom";
// import { getUserRole, hasAnyPermission } from "@/lib/auth";

// interface PermissionRouteProps {
//   /** Permission(s) required to view this route (any one is enough). */
//   require: string | string[];
//   children?: React.ReactNode;
// }

// /**
//  * Nest this INSIDE an existing <ProtectedRoute allow={[...]}> to add a
//  * permission-level check on top of the role check. SUPER_ADMIN always
//  * passes (full system access). ADMIN/WARDEN/TENANT must hold at least
//  * one of the required permissions, or they're redirected the same way
//  * ProtectedRoute redirects for a disallowed role.
//  *
//  * Usage:
//  *   <ProtectedRoute allow={["ADMIN"]}>
//  *     <PermissionRoute require="MANAGE_BRANCHES">
//  *       <BranchPage />
//  *     </PermissionRoute>
//  *   </ProtectedRoute>
//  */
// const PermissionRoute: React.FC<PermissionRouteProps> = ({ require, children }) => {
//   const role = getUserRole();

//   if (!role) return <Navigate to="/" replace />;
//   if (role === "SUPER_ADMIN") return <>{children ?? <Outlet />}</>;

//   const required = Array.isArray(require) ? require : [require];
//   if (!hasAnyPermission(required)) return <Navigate to="/unauthorized" replace />;

//   return <>{children ?? <Outlet />}</>;
// };

// export default PermissionRoute;





































// src/components/PermissionRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { getUserRole, hasAnyPermission } from "@/lib/auth";

interface PermissionRouteProps {
  /** Permission(s) required to view this route (any one is enough). */
  require: string | string[];
  /**
   * When true the permission is only enforced for ADMIN and WARDEN. Use it on
   * pages that tenants also open (e.g. Rules & Regulations) so their access is
   * not changed by a Hostel Admin page switch.
   */
  staffOnly?: boolean;
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
const PermissionRoute: React.FC<PermissionRouteProps> = ({ require, staffOnly, children }) => {
  const role = getUserRole();

  if (!role) return <Navigate to="/" replace />;
  if (role === "SUPER_ADMIN") return <>{children ?? <Outlet />}</>;
  if (staffOnly && role !== "ADMIN" && role !== "WARDEN") return <>{children ?? <Outlet />}</>;

  const required = Array.isArray(require) ? require : [require];
  if (!hasAnyPermission(required)) return <Navigate to="/unauthorized" replace />;

  return <>{children ?? <Outlet />}</>;
};

export default PermissionRoute;