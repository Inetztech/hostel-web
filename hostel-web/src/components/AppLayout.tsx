import { Link, useLocation, useNavigate, Outlet, Navigate } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { 
  getUserRole, 
  logout, 
  hasPermission, 
  hasAnyPermission, 
  getUserPermissions
} from "@/lib/auth";
import { getMyProfile, getResponsibleContact } from "@/lib/store";
import type { ResponsibleContact } from "@/lib/types";

import {
  Building2, Users, Zap, LayoutDashboard, IndianRupee, LogOut,
  Menu, X, GitBranch, TableProperties, BedDouble, BookUser,
  Megaphone, MessageSquareWarning, UtensilsCrossed,
  ShieldCheck, ChevronRight, ChevronDown, User, Building, CreditCard,
  ScrollText, Search, Ticket, Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

/* ================= NAV ITEMS ================= */
const navItems = [
  // ── SUPER_ADMIN sidebar ──────────────────────────────────────────────────
  { to: "/dashboard",        label: "Dashboard",          icon: LayoutDashboard,  color: "text-blue-400",    allow: ["ADMIN", "WARDEN", "TENANT"], permission: "VIEW_DASHBOARD" },
  { to: "/super-admin",               label: "Dashboard",          icon: LayoutDashboard, color: "text-blue-400",    allow: ["SUPER_ADMIN"] },
  { to: "/super-admin/hostels",       label: "Hostels",   icon: Building,        color: "text-teal-400",    allow: ["SUPER_ADMIN"], permission: "MANAGE_HOSTELS" },
  { to: "/super-admin/tickets",       label: "Support Tickets",     icon: Ticket,          color: "text-violet-400",  allow: ["SUPER_ADMIN"] },

  // ── ADMIN ────────────────────────────────────────────────────────────────
  { to: "/tickets",           label: "Raise Ticket",        icon: Ticket,               color: "text-violet-400",  allow: ["ADMIN"] },

  // ── ADMIN / WARDEN / TENANT ─────────────────────────────────────────────
  { to: "/staff-register",     label: "Staff-Register",        icon: Users,                color: "text-purple-400",  allow: ["ADMIN", "WARDEN"], anyOf: ["MANAGE_WARDENS", "MANAGE_TENANTS"] },
  { to: "/branch",            label: "Branch",               icon: GitBranch,            color: "text-indigo-400",  allow: ["ADMIN"], permission: "MANAGE_BRANCHES" },
  // { to: "/flat",              label: "Flat",                 icon: TableProperties,      color: "text-red-400",     allow: ["ADMIN", "WARDEN"], permission: "MANAGE_FLAT" },
  { to: "/rooms",             label: "Rooms & Beds",         icon: BedDouble,            color: "text-orange-400",  allow: ["ADMIN", "WARDEN"], permission: "MANAGE_ROOMS" },
  { to: "/tenants",           label: "Tenants",              icon: BookUser,             color: "text-pink-400",    allow: ["ADMIN", "WARDEN"], permission: "MANAGE_TENANTS" },
  { to: "/eb-readings",       label: "EB Readings",          icon: Zap,                  color: "text-yellow-400",  allow: ["ADMIN", "WARDEN"], permission: "MANAGE_EB_READINGS" },
  { to: "/rent",              label: "Rent",                 icon: IndianRupee,          color: "text-green-400",   allow: ["ADMIN", "WARDEN"], permission: "MANAGE_RENTS" },
  { to: "/payments",          label: "Payments",             icon: CreditCard,           color: "text-emerald-400", allow: ["ADMIN", "WARDEN", "TENANT"], anyOf: ["MANAGE_PAYMENTS", "VIEW_PAYMENTS"] },
  { to: "/checkout",          label: "Tenant Check-Out",     icon: LogOut,               color: "text-gray-400",    allow: ["ADMIN", "WARDEN"], permission: "MANAGE_TENANTS" },
  { to: "/expenses",          label: "Expenses",             icon: CreditCard,           color: "text-emerald-400", allow: ["ADMIN", "WARDEN"], anyOf: ["MANAGE_PAYMENTS", "VIEW_PAYMENTS"] },
  { to: "/visitor",           label: "Visitor",              icon: CreditCard,           color: "text-emerald-400", allow: ["ADMIN", "WARDEN", "TENANT"], anyOf: ["MANAGE_PAYMENTS", "VIEW_PAYMENTS"] },
  { to: "/complaints",        label: "Complaints",           icon: MessageSquareWarning, color: "text-red-400",     allow: ["ADMIN", "TENANT", "WARDEN"], permission: "MANAGE_COMPLAINTS" },
  { to: "/maintenance",       label: "Maintenance",          icon: Wrench,               color: "text-slate-400",   allow: ["ADMIN", "WARDEN"] },
  { to: "/food-timetable",    label: "Food Timetable",       icon: UtensilsCrossed,      color: "text-orange-400",  allow: ["ADMIN", "TENANT", "WARDEN"], permission: "MANAGE_FOOD_TIMETABLE" },
  { to: "/announcements",     label: "Announcements",        icon: Megaphone,            color: "text-cyan-400",    allow: ["ADMIN", "WARDEN", "TENANT"], permission: "MANAGE_ANNOUNCEMENTS" },
  { to: "/rules-regulations", label: "Rules & Regulations", icon: ScrollText,           color: "text-cyan-400",    allow: ["ADMIN", "WARDEN", "TENANT"] },
];

const roleMeta: Record<string, { label: string; bg: string; text: string; ring: string; dot: string }> = {
  SUPER_ADMIN: { label: "Super Admin", bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200",  dot: "bg-violet-500" },
  ADMIN:       { label: "Admin",       bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    dot: "bg-blue-500" },
  WARDEN:      { label: "Warden",      bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  TENANT:      { label: "Tenant",      bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500" },
};

const permissionMessages: Record<string, string> = {
  ADMIN:  "Please contact the Super Admin to have permissions assigned to your account before you can access any modules.",
  WARDEN: "Please contact the Admin to have permissions assigned to your account before you can access any modules.",
  TENANT: "Please contact the Admin or Warden to have permissions assigned to your account before you can access any modules.",
};

const superAdminTitles: Record<string, string> = {
  "/super-admin": "Super Admin Dashboard",
  "/super-admin/hostels": "Hostels & Admins",
};

const roleDashboardTitles: Record<string, string> = {
  ADMIN: "Admin Dashboard",
  WARDEN: "Warden Dashboard",
  TENANT: "Tenant Dashboard",
};

export default function AppLayout() {
  const role = getUserRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [branchName,  setBranchName]  = useState<string>("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [contact, setContact] = useState<ResponsibleContact | null>(null);

  const [userName, setUserName] = useState<string>(
    sessionStorage.getItem("userName") ??
    sessionStorage.getItem("name") ??
    sessionStorage.getItem("user_name") ?? ""
  );
  const [userEmail, setUserEmail] = useState<string>(
    sessionStorage.getItem("email") ?? sessionStorage.getItem("userEmail") ?? ""
  );

  if (!role) return <Navigate to="/" replace />;

  const meta = roleMeta[role?.toUpperCase() ?? ""] ?? { label: role, bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-200", dot: "bg-gray-400" };
  const permissionMessage = permissionMessages[role?.toUpperCase() ?? ""] ?? "";

  const initials = (userName || meta.label)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile: any = await getMyProfile();
        if (cancelled) return;

        if (profile.unitName) setBranchName(profile.unitName);
        if (profile.name) {
          setUserName(profile.name);
          sessionStorage.setItem("userName", profile.name);
        }
        if (profile.email) {
          setUserEmail(profile.email);
          sessionStorage.setItem("email", profile.email);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const visibleItems = navItems.filter((item) => {
    if (!item.allow.includes(role?.toUpperCase() ?? "")) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.anyOf && !hasAnyPermission(item.anyOf)) return false;
    return true;
  });

  const searchResults = searchQuery.trim()
    ? visibleItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : [];

  const goToSearchResult = (to: string) => {
    navigate(to);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) goToSearchResult(searchResults[0].to);
  };

  const noPermissionsAssigned =
    role !== "SUPER_ADMIN" && getUserPermissions().length === 0;

  useEffect(() => {
    let cancelled = false;
    if (noPermissionsAssigned) {
      getResponsibleContact().then((c) => {
        if (!cancelled) setContact(c);
      });
    }
    return () => { cancelled = true; };
  }, [noPermissionsAssigned]);

  const activeItem = visibleItems.find((item) => item.to === pathname);
  const pageTitle =
    superAdminTitles[pathname]
    ?? (pathname === "/dashboard" ? roleDashboardTitles[role?.toUpperCase() ?? ""] : undefined)
    ?? (activeItem?.label ?? "Dashboard");

  const renderContactMessage = (textClass: string, linkClass: string) => {
    if (!contact) return permissionMessage;
    return (
      <>
        Please contact <span className={cn("font-semibold", textClass)}>{contact.name}</span>
        {contact.phone && (
          <>
            {" · "}
            <a href={`tel:${contact.phone}`} className={cn("underline", linkClass)}>
              {contact.phone}
            </a>
          </>
        )}
        {" to have permissions assigned to your account before you can access any modules."}
      </>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8]">

      {/* ================= MOBILE OVERLAY ================= */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={cn(
          "fixed md:relative z-50 h-full w-[220px] flex flex-col transition-transform duration-300",
          "hms-sidebar text-white border-r border-white/[0.06]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <style>{`
          .hms-sidebar {
            background:
              radial-gradient(120% 60% at 0% 0%, rgba(59,130,246,0.14) 0%, transparent 55%),
              radial-gradient(90% 50% at 100% 100%, rgba(139,92,246,0.12) 0%, transparent 60%),
              linear-gradient(180deg, #141726 0%, #101220 55%, #0b0c14 100%);
          }
          .hms-sidebar-nav {
            scrollbar-width: thin;
            scrollbar-color: rgba(139,92,246,0.35) transparent;
          }
          .hms-sidebar-nav::-webkit-scrollbar { width: 5px; }
          .hms-sidebar-nav::-webkit-scrollbar-track { background: transparent; }
          .hms-sidebar-nav::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(96,165,250,0.4), rgba(167,139,250,0.4));
            border-radius: 10px;
          }
          .hms-sidebar-nav::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(96,165,250,0.65), rgba(167,139,250,0.65));
          }
        `}</style>

        {/* LOGO */}
        <div className="px-5 pt-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 border border-blue-400/25 flex items-center justify-center shadow-[0_0_14px_rgba(129,140,248,0.25)]">
              <Building2 className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold tracking-tight leading-none">Hostel HMS</h1>
              <p className="text-[10px] text-white/35 mt-[3px]">Management System</p>
            </div>
          </div>
          <button
            className="md:hidden text-white/40 hover:text-white/80 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-4 border-t border-white/[0.06]" />

        {/* NAVIGATION */}
        <nav className="hms-sidebar-nav flex-1 px-3 py-4 pb-8 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
            {role === "SUPER_ADMIN" ? "Platform Management" : "Navigation"}
          </p>

          {noPermissionsAssigned && (
            <div className="mx-1 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <p className="text-[11px] font-medium text-amber-300 leading-snug">
                No permissions have been assigned.
              </p>
              <p className="text-[10px] text-amber-300/70 mt-1 leading-snug">
                Please contact {contact?.name ?? "your Administrator"}.
              </p>
            </div>
          )}

          {visibleItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-[9px] rounded-lg text-[12.5px] font-medium transition-all duration-150",
                  active
                    ? "bg-gradient-to-r from-blue-500/[0.16] via-indigo-500/[0.12] to-transparent text-white shadow-[inset_0_0_0_1px_rgba(129,140,248,0.15)]"
                    : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]"
                )}
              >
                <span className={cn(
                  "absolute left-0 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-blue-400 to-violet-400 transition-opacity duration-150",
                  active ? "opacity-100" : "opacity-0"
                )} />

                <item.icon className={cn(
                  "h-[15px] w-[15px] shrink-0 transition-colors duration-150",
                  active ? item.color : "text-white/30 group-hover:text-white/55"
                )} />

                <span className="flex-1 truncate">{item.label}</span>

                {active ? (
                  <ChevronRight className="h-3 w-3 text-white/20 shrink-0" />
                ) : (
                  item.allow.includes("SUPER_ADMIN") && !item.allow.includes("ADMIN") && item.label !== "Dashboard" && (
                    <ChevronRight className="h-3 w-3 text-white/15 shrink-0" />
                  )
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 overflow-auto flex flex-col">

        {/* ================= TOP HEADER ================= */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white px-4 md:px-8 py-3">
          <div className="flex items-center gap-4 min-w-0">
            <button
              className="md:hidden text-gray-500 hover:text-gray-800 transition-colors shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <h1 className="text-sm font-semibold text-gray-800">Hostel HMS</h1>
            </div>
            <div className="hidden md:block min-w-0">
              <h1 className="text-[20px] font-semibold text-gray-900 leading-tight truncate">
                {pageTitle}
              </h1>
              <div className="text-[13px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-gray-900">{pageTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search input */}
            <div className="relative hidden md:block w-[280px]" ref={searchRef}>
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-colors"
              >
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                  className="bg-transparent border-none outline-none text-sm text-gray-700 ml-2 w-full placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                    className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {searchOpen && searchQuery.trim() && (
                <div className="absolute right-0 left-0 mt-1.5 bg-white rounded-xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                  {searchResults.length > 0 ? (
                    <ul className="py-1.5 max-h-72 overflow-y-auto">
                      {searchResults.map((item) => (
                        <li key={item.to}>
                          <button
                            type="button"
                            onClick={() => goToSearchResult(item.to)}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <item.icon className="h-4 w-4 text-gray-400 shrink-0" />
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      No matching pages for "{searchQuery.trim()}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NOTIFICATIONS */}
            <NotificationBell />

            {/* PROFILE DROPDOWN */}
            <div className="relative shrink-0" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 transition-colors"
              >
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-sm">
                  {initials || <User className="h-4 w-4" />}
                </div>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-[13px] font-semibold text-gray-900 leading-tight">{userName || meta.label}</span>
                  <span className="text-[11px] text-gray-500 font-medium">{meta.label}{branchName ? ` · ${branchName}` : ""}</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-gray-400 ml-1 transition-transform duration-200",
                  profileOpen && "rotate-180"
                )} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-sm shrink-0">
                        {initials || <User className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{userName || meta.label}</p>
                        {userEmail && <p className="text-xs text-gray-400 truncate">{userEmail}</p>}
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 mt-3 text-[10px] font-medium px-2.5 py-1 rounded-full ring-1",
                      meta.bg, meta.text, meta.ring
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                      {meta.label}{branchName ? ` · ${branchName}` : ""}
                    </span>
                  </div>

                  <div className="py-1.5">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      Profile
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 py-1.5">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 w-full">
          {noPermissionsAssigned ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border border-amber-200 bg-amber-50">
              <ShieldCheck className="h-10 w-10 text-amber-500 mb-3" />
              <h2 className="text-lg font-semibold text-amber-800">
                No permissions have been assigned
              </h2>
              <p className="text-sm text-amber-700/80 mt-1 max-w-sm">
                {renderContactMessage("text-amber-900", "text-amber-800 hover:text-amber-900")}
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>

      </main>
    </div>
  );
}