// src/lib/routePermissions.ts
//
// One place that says which permission(s) each protected page needs. It mirrors
// the <ProtectedRoute>/<PermissionRoute> wiring in AppRouter.tsx and the sidebar
// in AppLayout.tsx, and is used by the app shell to move a user OFF a page the
// moment the Super Admin switches it off (without waiting for a re-login).
//
// The router and the backend remain the real enforcement - this is only the
// "live revoke" check, so a stale rule here can never grant access.
import type { Role } from "./types";

export interface RoutePermissionRule {
  path: string;
  /** Roles that are subject to this rule. Others are not checked here. */
  appliesTo: Role[];
  /** Holding ANY of these grants access. */
  anyOf: string[];
}

const ADMIN_WARDEN: Role[] = ["ADMIN", "WARDEN"];
const ALL_NON_SUPER: Role[] = ["ADMIN", "WARDEN", "TENANT"];

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  { path: "/dashboard",         appliesTo: ALL_NON_SUPER, anyOf: ["VIEW_DASHBOARD"] },
  { path: "/branch",            appliesTo: ["ADMIN"],      anyOf: ["MANAGE_BRANCHES"] },
  { path: "/rooms",             appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_ROOMS"] },
  { path: "/tenants",           appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_TENANTS"] },
  { path: "/checkout",          appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_TENANTS"] },
  { path: "/staff-register",    appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_WARDENS", "MANAGE_TENANTS"] },
  { path: "/eb-readings",       appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_EB_READINGS"] },
  { path: "/damages",           appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_DAMAGES"] },
  { path: "/rent",              appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_RENTS"] },
  { path: "/payments",          appliesTo: ALL_NON_SUPER,  anyOf: ["MANAGE_PAYMENTS", "VIEW_PAYMENTS"] },
  { path: "/expenses",          appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_EXPENSES", "MANAGE_PAYMENTS", "VIEW_PAYMENTS"] },
  { path: "/maintenance",       appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_MAINTENANCE", "VIEW_MAINTENANCE"] },
  { path: "/visitor",           appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_VISITORS"] },
  { path: "/complaints",        appliesTo: ALL_NON_SUPER,  anyOf: ["MANAGE_COMPLAINTS"] },
  { path: "/announcements",     appliesTo: ALL_NON_SUPER,  anyOf: ["MANAGE_ANNOUNCEMENTS"] },
  { path: "/food-timetable",    appliesTo: ALL_NON_SUPER,  anyOf: ["MANAGE_FOOD_TIMETABLE"] },
  { path: "/sunday-meal",       appliesTo: ALL_NON_SUPER,  anyOf: ["VIEW_SUNDAY_MEAL"] },
  { path: "/rules-regulations", appliesTo: ADMIN_WARDEN,   anyOf: ["MANAGE_RULES_REGULATIONS"] },
];

const findRule = (pathname: string): RoutePermissionRule | undefined =>
  ROUTE_PERMISSION_RULES.find(
    (r) => pathname === r.path || pathname.startsWith(r.path + "/")
  );

/** True when the user may stay on `pathname`. Unlisted paths are not governed here. */
export const canAccessPath = (
  pathname: string,
  role: Role | null,
  permissions: string[]
): boolean => {
  if (!role || role === "SUPER_ADMIN") return true;
  const rule = findRule(pathname);
  if (!rule || !rule.appliesTo.includes(role)) return true;
  return rule.anyOf.some((p) => permissions.includes(p));
};