import { Link } from "react-router-dom";
import { getUserRole, getUserPermissions } from "@/lib/auth";

/**
 * FIX (RBAC): distinguishes "you have permissions, just not this one" from
 * "you have been granted no permissions at all" — the latter needs the
 * specific messaging required by the RBAC spec ("No permissions have been
 * assigned. Please contact the Super Admin / your Administrator.").
 */
export default function Unauthorized() {
  const role = getUserRole();
  const noPermissionsAssigned = role !== "SUPER_ADMIN" && getUserPermissions().length === 0;

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Access Denied</h2>
      {noPermissionsAssigned ? (
        <p>
          No permissions have been assigned to your account. Please contact
          the Super Admin{role === "TENANT" || role === "WARDEN" ? "/Administrator" : ""} to get access.
        </p>
      ) : (
        <p>You don&rsquo;t have permission to access this page.</p>
      )}
      <p style={{ marginTop: 16 }}>
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  );
}
