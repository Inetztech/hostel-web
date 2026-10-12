// import { Link } from "react-router-dom";
// import { getUserRole, getUserPermissions } from "@/lib/auth";

// export default function Unauthorized() {
//   const role = getUserRole();
//   const noPermissionsAssigned = role !== "SUPER_ADMIN" && getUserPermissions().length === 0;

//   return (
//     <div style={{ padding: 40, textAlign: "center" }}>
//       <h2>Access Denied</h2>
//       {noPermissionsAssigned ? (
//         <p>
//           No permissions have been assigned to your account. Please contact
//           the Super Admin{role === "TENANT" || role === "WARDEN" ? "/Administrator" : ""} to get access.
//         </p>
//       ) : (
//         <p>You don&rsquo;t have permission to access this page.</p>
//       )}
//       <p style={{ marginTop: 16 }}>
//         <Link to="/dashboard">Back to Dashboard</Link>
//       </p>
//     </div>
//   );
// }






























import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { getUserRole, getUserPermissions, hasPermission } from "@/lib/auth";

export default function Unauthorized() {
  const role = getUserRole();
  const home = hasPermission("VIEW_DASHBOARD") ? "/dashboard" : "/profile";
  const noPermissionsAssigned = role !== "SUPER_ADMIN" && getUserPermissions().length === 0;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
        {noPermissionsAssigned ? (
          <p className="mt-2 text-sm text-slate-600">
            No permissions have been assigned to your account. Please contact
            the Super Admin{role === "TENANT" || role === "WARDEN" ? "/Administrator" : ""} to get access.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            You don&rsquo;t have permission to access this page. If you think this is a mistake,
            ask your administrator to enable it for your account.
          </p>
        )}
        <Link
          to={home}
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {home === "/dashboard" ? "Back to Dashboard" : "Go to Profile"}
        </Link>
      </div>
    </div>
  );
}
