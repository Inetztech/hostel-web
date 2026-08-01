import React from "react";
import { PermissionName } from "../lib/types";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "../lib/auth";

interface PermissionGateProps {
  /** Single permission required. */
  permission?: PermissionName;
  /** Passes if the user holds ANY of these. */
  anyOf?: PermissionName[];
  /** Passes if the user holds ALL of these. */
  allOf?: PermissionName[];
  /** Rendered when the check fails. Defaults to nothing. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  let allowed = true;

  if (permission) {
    allowed = allowed && hasPermission(permission);
  }
  if (anyOf && anyOf.length > 0) {
    allowed = allowed && hasAnyPermission(anyOf);
  }
  if (allOf && allOf.length > 0) {
    allowed = allowed && hasAllPermissions(allOf);
  }

  // No criteria passed at all => fail closed, not open. A gate with
  // nothing to check is almost certainly a mistake at the call site,
  // and failing open would silently show something to everyone.
  if (!permission && !anyOf && !allOf) {
    allowed = false;
  }

  return <>{allowed ? children : fallback}</>;
}