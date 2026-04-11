// import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
// import { useState } from "react";
// import { getUserRole, logout } from "@/lib/auth";

// import {
//   Building2,
//   Users,
//   Zap,
//   BarChart3,
//   LayoutDashboard,
//   IndianRupee,
//   LogOut,
//   Menu,
//   X,
// } from "lucide-react";
// import { Separator } from "@/components/ui/separator";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";

// /* ================= NAV ITEMS ================= */
// const navItems = [
//   { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, allow: ["ADMIN", "VIEWER"] },
//   { to: "/branch", label: "Branch", icon: BarChart3, allow: ["ADMIN", "VIEWER"] },
//   { to: "/rooms", label: "Rooms & Beds", icon: Building2, allow: ["ADMIN", "VIEWER"] },
//   { to: "/tenants", label: "Tenants", icon: Users, allow: ["ADMIN", "VIEWER"] },
//   { to: "/eb-readings", label: "EB Readings", icon: Zap, allow: ["ADMIN", "VIEWER"] },
//   { to: "/rent", label: "Rent", icon: IndianRupee, allow: ["ADMIN", "VIEWER"] },
//   { to: "/checkout", label: "Check-Out", icon: LogOut, allow: ["ADMIN", "VIEWER"] },
//   { to: "/reports", label: "Reports", icon: BarChart3, allow: ["ADMIN", "VIEWER"] },
// ];


// export default function AppLayout() {
//   const role = getUserRole();
//   const { pathname } = useLocation();

//   const [mobileOpen, setMobileOpen] = useState(false);

//   if (!role) return <Navigate to="/" replace />;

//   return (
//     <div className="flex h-screen overflow-hidden bg-background">
//       {/* ================= MOBILE OVERLAY ================= */}
//       {mobileOpen && (
//         <div
//           className="fixed inset-0 bg-black/40 z-40 md:hidden"
//           onClick={() => setMobileOpen(false)}
//         />
//       )}

//       {/* ================= SIDEBAR ================= */}
//       <aside
//         className={cn(
//           "fixed md:relative z-50 h-full w-60 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-transform duration-300",
//           mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
//         )}
//       >
//         {/* Logo + Close Button */}
//         <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="h-10 w-10 rounded-md bg-sidebar-primary/15 border border-sidebar-primary/30 flex items-center justify-center">
//               <Building2 className="h-5 w-5 text-sidebar-primary" />
//             </div>
//             <div>
//               <h1 className="text-sm font-bold">Hostel HMS</h1>
//               <p className="text-[11px] opacity-50">Management System</p>
//             </div>
//           </div>

//           {/* Close button (mobile only) */}
//           <button
//             className="md:hidden"
//             onClick={() => setMobileOpen(false)}
//           >
//             <X className="h-5 w-5" />
//           </button>
//         </div>

//         {/* ================= NAVIGATION ================= */}
//         <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
//           <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest opacity-40">
//             Navigation
//           </p>

//           {navItems
//             .filter((item) => item.allow.includes(role))
//             .map((item) => {
//               const active = pathname === item.to;

//               return (
//                 <Link
//                   key={item.to}
//                   to={item.to}
//                   onClick={() => setMobileOpen(false)}
//                   className={cn(
//                     "flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-all",
//                     active
//                       ? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary -ml-px"
//                       : "opacity-60 hover:bg-sidebar-accent/50 hover:opacity-90"
//                   )}
//                 >
//                   <item.icon className="h-4 w-4" />
//                   {item.label}
//                 </Link>
//               );
//             })}
//         </nav>

//         {/* ================= FOOTER ================= */}
//         <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
//           <Separator />

//           <div className="flex items-center justify-between">
//             <p className="text-[11px] opacity-50">Role: {role}</p>

//             <Button
//               size="sm"
//               variant="ghost"
//               className="text-destructive"
//               onClick={logout}
//             >
//               Logout
//             </Button>
//           </div>
//         </div>
//       </aside>

//       {/* ================= MAIN CONTENT ================= */}
//       <main className="flex-1 overflow-auto">
//         {/* Mobile Header */}
//         <div className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-card">
//           <button onClick={() => setMobileOpen(true)}>
//             <Menu className="h-6 w-6" />
//           </button>

//           <h1 className="text-sm font-semibold">Hostel HMS</h1>
//         </div>

//         {/* Page Content */}
//         <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-7">
//           <Outlet />
//         </div>
//       </main>
//     </div>
//   );
// }




import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useState } from "react";
import { getUserRole, logout } from "@/lib/auth";
import { getBranchId } from "@/lib/store";

import {
  Building2,
  Users,
  Zap,
  BarChart3,
  LayoutDashboard,
  IndianRupee,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ================= NAV ITEMS ================= */
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, allow: ["ADMIN", "VIEWER"] },
  { to: "/user-register", label: "User-Register", icon: Users, allow: ["ADMIN"] },
  { to: "/branch", label: "Branch", icon: BarChart3, allow: ["ADMIN"] },
  { to: "/rooms", label: "Rooms & Beds", icon: Building2, allow: ["ADMIN", "VIEWER"] },
  { to: "/tenants", label: "Tenants", icon: Users, allow: ["ADMIN", "VIEWER"] },
  { to: "/eb-readings", label: "EB Readings", icon: Zap, allow: ["ADMIN", "VIEWER"] },
  { to: "/rent", label: "Rent", icon: IndianRupee, allow: ["ADMIN", "VIEWER"] },
  { to: "/checkout", label: "Check-Out", icon: LogOut, allow: ["ADMIN", "VIEWER"] },
  { to: "/reports", label: "Reports", icon: BarChart3, allow: ["ADMIN"] },
];

export default function AppLayout() {
  const role = getUserRole();
  const branchId = null;
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!role) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ================= MOBILE OVERLAY ================= */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={cn(
          "fixed md:relative z-50 h-full w-60 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo + Close Button */}
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-sidebar-primary/15 border border-sidebar-primary/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Hostel HMS</h1>
              <p className="text-[11px] opacity-50">Management System</p>
            </div>
          </div>

          {/* Close button (mobile only) */}
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================= NAVIGATION ================= */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest opacity-40">
            Navigation
          </p>

          {navItems
            .filter((item) => item.allow.includes(role))
            .map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-all",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary -ml-px"
                      : "opacity-60 hover:bg-sidebar-accent/50 hover:opacity-90"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {/* SHOW branch for VIEWER */}
                  {role === "VIEWER" && branchId && item.to !== "/dashboard" && (
                    <span className="ml-auto text-[10px] opacity-50">
                      Branch: {branchId}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* ================= FOOTER ================= */}
        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-[11px] opacity-50">
              Role: {role} {role === "VIEWER" && branchId ? `| Branch: ${branchId}` : ""}
            </p>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-card">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-sm font-semibold">Hostel HMS</h1>
        </div>

        {/* Page Content */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}