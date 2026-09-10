import { Navigate } from "react-router-dom";
import { getUserRole } from "@/lib/auth";
import { Role } from "@/lib/types";

interface RoleGuardProps {
  allow: Role[];
  children: JSX.Element;
}

export default function RoleGuard({ allow, children }: RoleGuardProps) {
  const role = getUserRole();

  if (!role) return <Navigate to="/" replace />;
  if (!allow.includes(role)) return <Navigate to="/unauthorized" replace />;

  return children;
}