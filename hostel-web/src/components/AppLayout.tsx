import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUserRole, logout } from "@/lib/auth";
import { getBranchId, getBranches } from "@/lib/store";

import {
  Building2, Users, Zap, LayoutDashboard, IndianRupee, LogOut,
  Menu, X, GitBranch, TableProperties, BedDouble, BookUser,
  Megaphone, MessageSquareWarning, UtensilsCrossed, FileBarChart2,
  ShieldCheck,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ================= NAV ITEMS ================= */
const navItems = [
  // Add this as the FIRST item:
{ to: "/super-admin", label: "Admin Management", icon: ShieldCheck, color: "text-violet-400", allow: ["SUPER_ADMIN"] },
  { to: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard,      color: "text-blue-400",   allow: ["ADMIN", "WARDEN", "TENANT"] },
  { to: "/branch",         label: "Branch",         icon: GitBranch,            color: "text-indigo-400", allow: ["ADMIN"] },
  { to: "/user-register",  label: "User-Register",  icon: Users,                color: "text-purple-400", allow: ["ADMIN"] },
  { to: "/flat",           label: "Flat",           icon: TableProperties,      color: "text-red-400",    allow: ["ADMIN", "WARDEN"] },
  { to: "/rooms",          label: "Rooms & Beds",   icon: BedDouble,            color: "text-orange-400", allow: ["ADMIN", "WARDEN"] },
  { to: "/tenants",        label: "Tenants",        icon: BookUser,             color: "text-pink-400",   allow: ["ADMIN", "WARDEN"] },
  { to: "/eb-readings",    label: "EB Readings",    icon: Zap,                  color: "text-yellow-400", allow: ["ADMIN", "WARDEN"] },
  { to: "/rent",           label: "Rent",           icon: IndianRupee,          color: "text-green-400",  allow: ["ADMIN", "WARDEN"] },
  { to: "/complaints",     label: "Complaints",     icon: MessageSquareWarning, color: "text-red-400",    allow: ["ADMIN", "TENANT", "WARDEN"] },
  { to: "/food-timetable", label: "Food Timetable", icon: UtensilsCrossed,      color: "text-orange-400", allow: ["ADMIN", "TENANT", "WARDEN"] },
  { to: "/announcements",  label: "Announcements",  icon: Megaphone,            color: "text-cyan-400",   allow: ["ADMIN", "WARDEN"] },
  { to: "/checkout",       label: "Check-Out",      icon: LogOut,               color: "text-gray-400",   allow: ["ADMIN", "WARDEN"] },
  { to: "/reports",        label: "Reports",        icon: FileBarChart2,        color: "text-cyan-400",   allow: ["ADMIN"] },
];

export default function AppLayout() {
  const role = getUserRole();
  const branchId = getBranchId();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchName, setBranchName] = useState<string>("");

  if (!role) return <Navigate to="/" replace />;

useEffect(() => {
  const loadBranchName = async () => {
    if (!branchId) return;

    try {
      const response = await getBranches(0, 10);

      const branches = response.content ?? [];

      const found = branches.find((b: any) => b.id === branchId);

      if (found) {
        setBranchName(found.unitName);
      }
    } catch (err) {
      console.error("Failed to load branch name", err);
    }
  };

  loadBranchName();
}, [branchId]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">

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
          "fixed md:relative z-50 h-full w-60 flex flex-col transition-transform duration-300",
          "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white border-r border-white/10",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ================= LOGO ================= */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center shadow-inner">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Hostel HMS</h1>
              <p className="text-[11px] opacity-60">Management System</p>
            </div>
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================= NAVIGATION ================= */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto scrollbar-hide">
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all",
                    active
                      ? "bg-white/10 text-white border-l-4 border-blue-400 shadow-md"
                      : "opacity-70 hover:bg-white/5 hover:opacity-100 hover:shadow-sm"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", item.color)} />
                  {item.label}

                  {/* Branch label for WARDEN */}
                  {role === "WARDEN" && branchId && item.to !== "/dashboard" && (
                    <span className="ml-auto text-[10px] opacity-50">
                      {branchName}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* ================= FOOTER ================= */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <Separator className="bg-white/10" />

          <div className="flex items-center justify-between">
            <p className="text-[11px] opacity-60">
              Role: {role}
              {role === "WARDEN" && branchName && ` | ${branchName}`}
            </p>

            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:bg-red-500/10"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-white">
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


















































// import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
// import { useEffect, useState } from "react";
// import { getUserRole, logout } from "@/lib/auth";
// import { getBranchId, getBranches } from "@/lib/store";

// import {
//   Building2, Users, Zap, LayoutDashboard, IndianRupee, LogOut,
//   Menu, X, GitBranch, TableProperties, BedDouble, BookUser,
//   Megaphone, MessageSquareWarning, UtensilsCrossed, FileBarChart2,
// } from "lucide-react";

// import { Separator } from "@/components/ui/separator";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";

// const navItems = [
//   { to: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard,        color: "text-blue-400",   allow: ["ADMIN", "WARDEN", "TENANT"] },
//   { to: "/branch",         label: "Branch",         icon: GitBranch,              color: "text-indigo-400", allow: ["ADMIN"] },
//   { to: "/user-register",  label: "User-Register",  icon: Users,                  color: "text-purple-400", allow: ["ADMIN"] },
//   { to: "/flat",           label: "Flat",           icon: TableProperties,        color: "text-red-400",    allow: ["ADMIN", "WARDEN"] },
//   { to: "/rooms",          label: "Rooms & Beds",   icon: BedDouble,              color: "text-orange-400", allow: ["ADMIN", "WARDEN"] },
//   { to: "/tenants",        label: "Tenants",        icon: BookUser,               color: "text-pink-400",   allow: ["ADMIN", "WARDEN"] },
//   { to: "/eb-readings",    label: "EB Readings",    icon: Zap,                    color: "text-yellow-400", allow: ["ADMIN", "WARDEN"] },
//   { to: "/rent",           label: "Rent",           icon: IndianRupee,            color: "text-green-400",  allow: ["ADMIN", "WARDEN"] },
//   { to: "/complaints",     label: "Complaints",     icon: MessageSquareWarning,   color: "text-red-400",    allow: ["ADMIN", "TENANT", "WARDEN"] },
//   { to: "/food-timetable", label: "Food Timetable", icon: UtensilsCrossed,        color: "text-orange-400", allow: ["ADMIN", "TENANT", "WARDEN"] },
//   { to: "/announcements",  label: "Announcements",  icon: Megaphone,              color: "text-cyan-400",   allow: ["ADMIN", "WARDEN"] },
//   { to: "/checkout",       label: "Check-Out",      icon: LogOut,                 color: "text-gray-400",   allow: ["ADMIN", "WARDEN"] },
//   { to: "/reports",        label: "Reports",        icon: FileBarChart2,          color: "text-cyan-400",   allow: ["ADMIN"] },
// ];

// export default function AppLayout() {
//   const role = getUserRole();
//   const branchId = getBranchId();
//   const { pathname } = useLocation();
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const [branchName, setBranchName] = useState<string>("");

//   if (!role) return <Navigate to="/" replace />;

//   useEffect(() => {
//     const loadBranchName = async () => {
//       if (!branchId) return;
//       try {
//         const branches = await getBranches(0, 100);
//         const found = branches.find((b) => b.id === branchId);
//         if (found) setBranchName(found.unitName);
//       } catch (err) {
//         console.error("Failed to load branch name", err);
//       }
//     };
//     loadBranchName();
//   }, [branchId]);

//   return (
//     /* ── Root shell: dark background fills everything ── */
//     <div
//       className="flex h-screen overflow-hidden"
//       style={{ background: "#0f1117" }}
//     >
//       {/* Mobile overlay */}
//       {mobileOpen && (
//         <div
//           className="fixed inset-0 bg-black/50 z-40 md:hidden"
//           onClick={() => setMobileOpen(false)}
//         />
//       )}

//       {/* ── Sidebar ── */}
//       <aside
//         className={cn(
//           "fixed md:relative z-50 h-full w-60 flex flex-col transition-transform duration-300",
//           "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white border-r border-white/10",
//           mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
//         )}
//       >
//         {/* Logo */}
//         <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center shadow-inner">
//               <Building2 className="h-5 w-5 text-blue-400" />
//             </div>
//             <div>
//               <h1 className="text-sm font-bold">Hostel HMS</h1>
//               <p className="text-[11px] opacity-60">Management System</p>
//             </div>
//           </div>
//           <button className="md:hidden" onClick={() => setMobileOpen(false)}>
//             <X className="h-5 w-5" />
//           </button>
//         </div>

//         {/* Nav */}
//         <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto scrollbar-hide">
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
//                     "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all",
//                     active
//                       ? "bg-white/10 text-white border-l-4 border-blue-400 shadow-md"
//                       : "opacity-70 hover:bg-white/5 hover:opacity-100 hover:shadow-sm"
//                   )}
//                 >
//                   <item.icon className={cn("h-4 w-4", item.color)} />
//                   {item.label}
//                   {role === "WARDEN" && branchId && item.to !== "/dashboard" && (
//                     <span className="ml-auto text-[10px] opacity-50">{branchName}</span>
//                   )}
//                 </Link>
//               );
//             })}
//         </nav>

//         {/* Footer */}
//         <div className="px-4 py-4 border-t border-white/10 space-y-3">
//           <Separator className="bg-white/10" />
//           <div className="flex items-center justify-between">
//             <p className="text-[11px] opacity-60">
//               Role: {role}
//               {role === "WARDEN" && branchName && ` | ${branchName}`}
//             </p>
//             <Button
//               size="sm"
//               variant="ghost"
//               className="text-red-400 hover:bg-red-500/10"
//               onClick={logout}
//             >
//               Logout
//             </Button>
//           </div>
//         </div>
//       </aside>

//       {/* ── Main content ── */}
//       <main
//         className="flex-1 overflow-auto"
//         style={{ background: "#0f1117" }}
//       >
//         {/* Mobile header */}
//         <div
//           className="md:hidden flex items-center justify-between border-b border-white/10 px-4 py-3"
//           style={{ background: "#161b2e" }}
//         >
//           <button onClick={() => setMobileOpen(true)}>
//             <Menu className="h-6 w-6 text-white" />
//           </button>
//           <h1 className="text-sm font-semibold text-white">Hostel HMS</h1>
//         </div>

//         {/* Page content */}
//         <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-7">
//           <Outlet />
//         </div>
//       </main>
//     </div>
//   );
// }