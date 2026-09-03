import { Link, useLocation, useNavigate, Outlet, Navigate } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { 
  getUserRole, 
  logout, 
  getUserPermissions 
} from "@/lib/auth";
import { getMyProfile, getResponsibleContact } from "@/lib/store";
import type { ResponsibleContact } from "@/lib/types";

import {
  Building2, Users, Zap, LayoutDashboard, IndianRupee, LogOut,
  Menu, X, GitBranch, BedDouble, BookUser,
  Megaphone, MessageSquareWarning, UtensilsCrossed, Drumstick,
  ShieldCheck, ShieldAlert, ChevronRight, ChevronDown, User, Building, CreditCard,
  ScrollText, Search, Ticket, Wrench, Receipt, CalendarClock
} from "lucide-react";

import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

/* ================= NAV CONFIGURATION ================= */
interface SubNavItem {
  to: string;
  label: string;
  icon: any;
  color: string;
  allow: string[];
  permission?: string;
  anyOf?: string[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  color?: string;
  allow?: string[];
  permission?: string;
  anyOf?: string[];
  to?: string; // For single links without children
  children?: SubNavItem[];
}

const navGroups: NavGroup[] = [
  // Standalone Dashboards
  { 
    id: "dashboard-user",
    to: "/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    color: "text-blue-400", 
    allow: ["ADMIN", "WARDEN", "TENANT"], 
    permission: "VIEW_DASHBOARD" 
  },
  { 
    id: "dashboard-super",
    to: "/super-admin", 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    color: "text-blue-400", 
    allow: ["SUPER_ADMIN"] 
  },

  // Standalone: Staff Register (promoted out of Property group)
  {
    id: "staff-register",
    to: "/staff-register",
    label: "Staff Register",
    icon: Users,
    color: "text-purple-400",
    allow: ["ADMIN", "WARDEN"],
    anyOf: ["MANAGE_WARDENS", "MANAGE_TENANTS"]
  },

  // ── NEW: Standalone — Notice Period (TENANT only, create/view own).
  // Per spec: only the Tenant can create/submit a notice period
  // request; Admin/Warden never get a "Create" entry point — they
  // only monitor via the "Tenants & Notice Period" screen below. ──
  {
    id: "notice-period-tenant",
    to: "/notice-period",
    label: "Notice Period",
    icon: CalendarClock,
    color: "text-indigo-400",
    allow: ["TENANT"],
  },

  // Super Admin Specific Group
  {
    id: "super-admin-group",
    label: "Platform Admin",
    icon: Building,
    allow: ["SUPER_ADMIN"],
    children: [
      { to: "/super-admin/hostels", label: "Hostels", icon: Building, color: "text-teal-400", allow: ["SUPER_ADMIN"], permission: "MANAGE_HOSTELS" },
      { to: "/super-admin/tickets", label: "Support Tickets", icon: Ticket, color: "text-violet-400", allow: ["SUPER_ADMIN"] },
    ]
  },

  // Group 1: Property
  {
    id: "property-mgmt",
    label: "Property",
    icon: Building2,
    allow: ["ADMIN", "WARDEN"],
    children: [
      { to: "/branch", label: "Branch", icon: GitBranch, color: "text-indigo-400", allow: ["ADMIN"], permission: "MANAGE_BRANCHES" },
      { to: "/rooms", label: "Room & Bed", icon: BedDouble, color: "text-orange-400", allow: ["ADMIN", "WARDEN"], permission: "MANAGE_ROOMS" },
      // ── RELABELED: this screen also hosts notice-period monitoring
      // (Warden/Admin view/manage-only — no create option, per spec) ──
      { to: "/tenants", label: "Tenants", icon: BookUser, color: "text-pink-400", allow: ["ADMIN", "WARDEN"], permission: "MANAGE_TENANTS" },
      { to: "/checkout", label: "Tenant Check-Out", icon: LogOut, color: "text-gray-400", allow: ["ADMIN", "WARDEN"], permission: "MANAGE_TENANTS" },
      { to: "/eb-readings", label: "EB Readings", icon: Zap, color: "text-yellow-400", allow: ["ADMIN", "WARDEN"], permission: "MANAGE_EB_READINGS" },
      { to: "/damages", label: "Damage/Penalty", icon: ShieldAlert, color: "text-red-400", allow: ["ADMIN", "WARDEN"], permission: "MANAGE_DAMAGES" },
    ]
  },

  // Group 2: Finances & Billing
  {
    id: "finances",
    label: "Finances & Billing",
    icon: CreditCard,
    allow: ["ADMIN", "WARDEN", "TENANT"],
    children: [
      { to: "/rent", label: "Rent", icon: IndianRupee, color: "text-green-400", allow: ["ADMIN", "WARDEN"], permission: "MANAGE_RENTS" },
      { to: "/payments", label: "Payments", icon: CreditCard, color: "text-emerald-400", allow: ["ADMIN", "WARDEN", "TENANT"], anyOf: ["MANAGE_PAYMENTS", "VIEW_PAYMENTS"] },
      { to: "/expenses", label: "Expenses", icon: Receipt, color: "text-rose-400", allow: ["ADMIN", "WARDEN"], anyOf: ["MANAGE_PAYMENTS", "VIEW_PAYMENTS"] },
    ]
  },

  // Group 3: Operations & Support
  // NOTE: "Raise Ticket" has been moved OUT of this group and is now
  // rendered as a pinned standalone item at the bottom of the sidebar.
  {
    id: "operations",
    label: "Operations & Support",
    icon: Wrench,
    allow: ["ADMIN", "WARDEN", "TENANT"],
    children: [
      { to: "/complaints", label: "Complaints", icon: MessageSquareWarning, color: "text-red-400", allow: ["ADMIN", "TENANT", "WARDEN"], permission: "MANAGE_COMPLAINTS" },
      { to: "/maintenance", label: "Maintenance", icon: Wrench, color: "text-slate-400", allow: ["ADMIN", "WARDEN"] },
      { to: "/visitor", label: "Visitor Log", icon: Users, color: "text-teal-400", allow: ["ADMIN", "WARDEN", "TENANT"] },
    ]
  },

  // Group 4: Info & Rules
  {
    id: "information",
    label: "Info & Rules",
    icon: ScrollText,
    allow: ["ADMIN", "WARDEN", "TENANT"],
    children: [
      { to: "/food-timetable", label: "Food Timetable", icon: UtensilsCrossed, color: "text-orange-400", allow: ["ADMIN", "TENANT", "WARDEN"], permission: "MANAGE_FOOD_TIMETABLE" },
      { to: "/sunday-meal", label: "Sunday Chicken Count", icon: Drumstick, color: "text-amber-500", allow: ["ADMIN", "TENANT", "WARDEN"], permission: "VIEW_SUNDAY_MEAL" },
      { to: "/announcements", label: "Announcements", icon: Megaphone, color: "text-cyan-400", allow: ["ADMIN", "WARDEN", "TENANT"], permission: "MANAGE_ANNOUNCEMENTS" },
      { to: "/rules-regulations", label: "Rules & Regulations", icon: ScrollText, color: "text-cyan-400", allow: ["ADMIN", "WARDEN", "TENANT"] },
    ]
  },

  // Standalone: Raise Ticket — pinned to the bottom corner of the sidebar
  {
    id: "raise-ticket",
    to: "/tickets",
    label: "Raise Ticket",
    icon: Ticket,
    color: "text-violet-400",
    allow: ["ADMIN"],
  },
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

// Group id(s) that should be rendered pinned at the bottom of the sidebar
// instead of inside the scrollable main navigation list.
const PINNED_BOTTOM_GROUP_IDS = ["raise-ticket"];

export default function AppLayout() {
  const role = getUserRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchName, setBranchName] = useState<string>("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [contact, setContact] = useState<ResponsibleContact | null>(null);

  // Accordion state management
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [userName, setUserName] = useState<string>(
    sessionStorage.getItem("userName") ??
    sessionStorage.getItem("name") ??
    sessionStorage.getItem("user_name") ?? ""
  );
  const [userEmail, setUserEmail] = useState<string>(
    sessionStorage.getItem("email") ?? sessionStorage.getItem("userEmail") ?? ""
  );


  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userPermissions, setUserPermissionsState] = useState<string[]>(getUserPermissions());

  if (!role) return <Navigate to="/" replace />;

  const meta = roleMeta[role?.toUpperCase() ?? ""] ?? { label: role, bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-200", dot: "bg-gray-400" };
  const permissionMessage = permissionMessages[role?.toUpperCase() ?? ""] ?? "";

  const initials = (userName || meta.label)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Helper function to verify permissions — now reads from the tracked
  // `userPermissions` state instead of re-reading sessionStorage fresh
  // on every call, so the whole nav re-evaluates correctly whenever
  // that state updates.
  const checkAccess = (item: { allow?: string[]; permission?: string; anyOf?: string[] }) => {
    if (item.allow && !item.allow.includes(role?.toUpperCase() ?? "")) return false;
    if (item.permission && role !== "SUPER_ADMIN" && !userPermissions.includes(item.permission)) return false;
    if (item.anyOf && role !== "SUPER_ADMIN" && !item.anyOf.some((p) => userPermissions.includes(p))) return false;
    return true;
  };

  // Filter groups and sub-items dynamically based on user role/permissions
  const visibleGroups = navGroups.map(group => {
    if (group.children) {
      const validChildren = group.children.filter(checkAccess);
      return { ...group, children: validChildren };
    }
    return group;
  }).filter(group => {
    if (group.children) return group.children.length > 0;
    return checkAccess(group);
  });

  // Split into the groups that live in the scrollable nav vs. the ones
  // pinned to the bottom corner of the sidebar (e.g. Raise Ticket)
  const mainNavGroups = visibleGroups.filter(g => !PINNED_BOTTOM_GROUP_IDS.includes(g.id));
  const pinnedBottomGroups = visibleGroups.filter(g => PINNED_BOTTOM_GROUP_IDS.includes(g.id));

  // Flat array of all accessible routes for search & titles
  const allVisibleSubItems = visibleGroups.flatMap(g => 
    g.children ? g.children : (g.to ? [{ to: g.to, label: g.label, icon: g.icon, color: g.color ?? "text-blue-400", allow: g.allow ?? [] }] : [])
  );

  // Automatically expand group containing the active page route
  useEffect(() => {
    visibleGroups.forEach((group) => {
      if (group.children?.some(child => child.to === pathname)) {
        setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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

        // ── NEW: always force a permissions state update, regardless
        // of whether name/email/branch actually changed. This is what
        // guarantees a re-render happens and noPermissionsAssigned
        // gets re-evaluated against the freshly-fetched permissions,
        // instead of silently keeping whatever it computed on the
        // very first render (often before the fetch even started).
        setUserPermissionsState(getUserPermissions());
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        if (!cancelled) setProfileLoaded(true);
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

  const searchResults = searchQuery.trim()
    ? allVisibleSubItems.filter((item) =>
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

  // ── CHANGED: now gated on `profileLoaded` and reads from the tracked
  // `userPermissions` state instead of calling getUserPermissions()
  // live. Won't show "no permissions" prematurely before the first
  // profile fetch resolves, and will correctly clear once it does.
  const noPermissionsAssigned =
    role !== "SUPER_ADMIN" && profileLoaded && userPermissions.length === 0;

  useEffect(() => {
    let cancelled = false;
    if (noPermissionsAssigned) {
      getResponsibleContact().then((c) => {
        if (!cancelled) setContact(c);
      });
    }
    return () => { cancelled = true; };
  }, [noPermissionsAssigned]);

  const activeItem = allVisibleSubItems.find((item) => item.to === pathname);
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
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">

      {/* ================= MOBILE OVERLAY ================= */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={cn(
          "fixed md:relative z-50 h-full w-[240px] flex flex-col transition-transform duration-300 select-none",
          "bg-[#0f172a] text-slate-300 border-r border-slate-800/80 shadow-xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <style>{`
          .hms-sidebar-nav {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .hms-sidebar-nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* LOGO */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[14px] font-bold tracking-tight text-white leading-none">Hostel HMS</h1>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Management System</p>
            </div>
          </div>
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors bg-transparent border-none p-1"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION (scrollable, everything except pinned items) */}
        <nav className="hms-sidebar-nav flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* SECTION LABEL */}
          <div className="px-3 pt-1 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {role === "SUPER_ADMIN" ? "Platform Admin" : "Navigation"}
            </p>
          </div>

          {noPermissionsAssigned && (
            <div className="mx-1 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <p className="text-[11px] font-medium text-amber-300 leading-snug">
                No permissions assigned.
              </p>
              <p className="text-[10px] text-amber-300/70 mt-1 leading-snug">
                Please contact {contact?.name ?? "your Administrator"}.
              </p>
            </div>
          )}

          {mainNavGroups.map((group) => {
            // Standalone single link
            if (group.to) {
              const active = pathname === group.to;
              return (
                <Link
                  key={group.id}
                  to={group.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                    active
                      ? "bg-indigo-500/10 text-indigo-300 font-semibold"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-indigo-400" />
                  )}
                  <group.icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                  )} />
                  <span className="flex-1 truncate">{group.label}</span>
                </Link>
              );
            }

            // Collapsible Category Group
            const isExpanded = expandedGroups[group.id];
            const hasActiveChild = group.children?.some(c => c.to === pathname);

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-left bg-transparent border-none",
                    hasActiveChild
                      ? "text-slate-100 font-semibold bg-slate-800/50"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  )}
                >
                  <group.icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    hasActiveChild ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                  )} />
                  <span className="flex-1 truncate">{group.label}</span>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-slate-500 transition-transform duration-200 shrink-0",
                    isExpanded && "rotate-180 text-slate-300"
                  )} />
                </button>

                {/* Sub-Items */}
                {isExpanded && (
                  <div className="ml-4 pl-3 space-y-0.5 border-l border-slate-800/80 my-1">
                    {group.children?.map((item) => {
                      const active = pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all duration-150",
                            active
                              ? "bg-indigo-500/10 text-indigo-300 font-semibold"
                              : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/30"
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r-full bg-indigo-400" />
                          )}
                          <item.icon className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                          )} />
                          <span className="flex-1 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ================= PINNED BOTTOM CORNER ITEM(S) ================= */}
        {/* Raise Ticket lives here — always visible, never scrolls away,
            and stays out of the collapsible "Operations & Support" group.
            Rendered as a bordered square/card-style button. */}
        {pinnedBottomGroups.length > 0 && (
          <div className="px-3 py-3 border-t border-slate-800/60 shrink-0 space-y-2">
            {pinnedBottomGroups.map((group) => {
              if (!group.to) return null;
              const active = pathname === group.to;
              return (
                <Link
                  key={group.id}
                  to={group.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[13px] font-semibold transition-all duration-150",
                    active
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                      : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/70 hover:border-slate-600"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg shrink-0 border transition-colors",
                      active
                        ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                        : "bg-slate-900/60 border-slate-700/60 text-slate-400 group-hover:text-violet-300 group-hover:border-violet-500/30"
                    )}
                  >
                    <group.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 truncate">{group.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 overflow-auto flex flex-col">

        {/* ================= TOP HEADER ================= */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 py-3">
          <div className="flex items-center gap-4 min-w-0">
            <button
              className="md:hidden text-slate-500 hover:text-slate-800 transition-colors shrink-0 bg-transparent border-none p-1"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <h1 className="text-sm font-semibold text-slate-800">Hostel HMS</h1>
            </div>
            <div className="hidden md:block min-w-0">
              <h1 className="text-[20px] font-semibold text-slate-900 leading-tight truncate">
                {pageTitle}
              </h1>
              <div className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <span className="hover:text-slate-700 cursor-pointer">Dashboard</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
                <span className="text-slate-900">{pageTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Search input */}
            <div className="relative hidden md:block w-[260px]" ref={searchRef}>
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-colors"
              >
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 ml-2 w-full placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                    className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 bg-transparent border-none p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {searchOpen && searchQuery.trim() && (
                <div className="absolute right-0 left-0 mt-1.5 bg-white rounded-xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden z-40 animate-in fade-in duration-150">
                  {searchResults.length > 0 ? (
                    <ul className="py-1.5 max-h-72 overflow-y-auto">
                      {searchResults.map((item) => (
                        <li key={item.to}>
                          <button
                            type="button"
                            onClick={() => goToSearchResult(item.to)}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left bg-transparent border-none"
                          >
                            <item.icon className="h-4 w-4 text-slate-400 shrink-0" />
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-400">
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
                className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition-colors bg-transparent border-none p-0"
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white bg-blue-600 shadow-sm">
                  {initials || <User className="h-4 w-4" />}
                </div>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-[13px] font-semibold text-slate-800 leading-tight">{userName || meta.label}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{meta.label}{branchName ? ` · ${branchName}` : ""}</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-slate-400 ml-1 transition-transform duration-200",
                  profileOpen && "rotate-180"
                )} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-blue-600 shrink-0">
                        {initials || <User className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{userName || meta.label}</p>
                        {userEmail && <p className="text-xs text-slate-400 truncate">{userEmail}</p>}
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 mt-2.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full ring-1",
                      meta.bg, meta.text, meta.ring
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                      {meta.label}{branchName ? ` · ${branchName}` : ""}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 py-1">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors bg-transparent border-none"
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
          {!profileLoaded ? (
            // ── NEW: lightweight loading state for the gap between
            // mount and the first profile fetch resolving, instead of
            // flashing "No permissions" and then replacing it.
            <div className="flex items-center justify-center py-24 text-sm text-slate-400">
              Loading your workspace…
            </div>
          ) : noPermissionsAssigned ? (
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