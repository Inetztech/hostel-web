import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUserRole } from "@/lib/auth";
import { useEntitlements } from "@/lib/entitlements";
import { isPathAllowedForCustomer, moduleForPath } from "@/lib/modules";

/**
 * Route-level protection for self-registered customers (role CUSTOMER).
 * Wrap the app layout with it: every URL a customer opens - typed, bookmarked or linked - is checked
 * against their plan, and anything not unlocked is sent to the Absconded List with the locked notice.
 * Other roles pass straight through, so existing behaviour is unchanged. The backend
 * (ModuleAccessFilter) enforces the same rule on every API call.
 */
export default function CustomerRouteGuard({ children }: { children: ReactNode }) {
  const role = getUserRole();
  const { pathname } = useLocation();
  const ent = useEntitlements();

  if (role !== "CUSTOMER") return <>{children}</>;

  // Plan still loading: show the page straight away (no blocking loading screen).
  // The lock check below applies as soon as the plan arrives; the backend enforces it either way.
  if (!ent.loaded) return <>{children}</>;

  if (!isPathAllowedForCustomer(pathname, ent.modules)) {
    return <Navigate to="/absconded" replace state={{ locked: moduleForPath(pathname) ?? "UNKNOWN" }} />;
  }

  return <>{children}</>;
}
