// src/components/ModuleGate.tsx
//
// Wraps the page outlet in AppLayout. If the current URL belongs to a module
// the account has not unlocked, the page is never rendered: the user is moved
// to the Absconded List and told why. Covers direct URLs and stale tabs
// (e.g. a subscription that just expired). The backend enforces the same rule
// on every API call, so this is the user-facing half only.
import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUserRole } from "@/lib/auth";
import { isPathLocked, useEntitlements, MODULE_LOCKED_EVENT } from "@/lib/entitlements";
import { moduleForPath } from "@/lib/modules";

export default function ModuleGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const entitlements = useEntitlements();
  // /absconded is the landing page for locked users, so it is never redirected
  // (prevents a redirect loop if entitlements could not be loaded).
  const locked =
    getUserRole() !== "SUPER_ADMIN" &&
    pathname !== "/absconded" &&
    isPathLocked(pathname, entitlements);

  useEffect(() => {
    if (locked) {
      window.dispatchEvent(
        new CustomEvent(MODULE_LOCKED_EVENT, { detail: { module: moduleForPath(pathname) } })
      );
    }
  }, [locked, pathname]);

  if (locked) return <Navigate to="/absconded" replace />;
  return <>{children}</>;
}
