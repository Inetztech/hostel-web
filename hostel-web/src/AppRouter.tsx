// src/AppRouter.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PermissionRoute from "@/components/PermissionRoute";

import Login           from "@/pages/Login";
import SuperAdminPage  from "@/pages/SuperAdminPage";
import Dashboard       from "@/pages/Dashboard";
import RoomsPage       from "@/pages/RoomsPage";
import TenantsPage     from "@/pages/TenantsPage";
import EBReadingsPage  from "@/pages/EBReadingsPage";
import RentPage        from "@/pages/RentPage";
import CheckoutPage    from "@/pages/CheckoutPage";
import ReportsPage     from "@/pages/ReportsPage";
import NotFound        from "@/pages/NotFound";
import Unauthorized    from "@/pages/Unauthorized";
import BranchPage      from "@/pages/BranchPage";
import HostelAdminPage from "@/pages/HostelAdminPage";
import UserRegisterPage from "@/pages/UserRegisterPage";
import ComplaintsPage  from "@/pages/ComplaintPage";
import FlatPage        from "@/pages/FlatPage";
import FoodTimetablePage from "@/pages/FoodTimetablePage";
import AnnouncementPage from "@/pages/AnnouncementPage";
import RuleRegulationPage from "@/pages/RuleRegulationPage";
import ProfilePage      from "@/pages/ProfilePage";
import PaymentsPage     from "@/pages/PaymentsPage";
import PermissionManagementPage from "@/pages/PermissionManagementPage";
import TicketsPage from "@/pages/TicketsPage";
import SuperAdminTicketsPage from "@/pages/SuperAdminTicketsPage";
import ExpensePage from "./pages/ExpenseTracker";
import VisitorPage from "./pages/Visitor";
import MaintenancePage from "@/pages/MaintenancePage";

export const router = createBrowserRouter([

  // ── Public ──────────────────────────────────────────────────────────────
  { path: "/",             element: <Login /> },
  { path: "/unauthorized", element: <Unauthorized /> },

  // ── ONE shared layout tree — all authenticated roles ────────────────────
  // AppLayout is wrapped in a single ProtectedRoute that accepts every role.
  // Individual pages are then guarded by their own inner ProtectedRoute.
  {
    element: (
      <ProtectedRoute allow={["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [

      // ── SUPER_ADMIN ────────────────────────────────────────────────────
      {
        path: "/super-admin",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN"]}>
            <SuperAdminPage />
          </ProtectedRoute>
        ),
      },
      // ── MERGED: Hostels + Admins now live on one URL/screen. The old
      // /hostels and /super-admin/admins routes redirect here so existing
      // bookmarks/links keep working. ─────────────────────────────────
      {
        path: "/super-admin/hostels",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN"]} permission="MANAGE_HOSTELS">
            <HostelAdminPage />
          </ProtectedRoute>
        ),
      },
      { path: "/hostels", element: <Navigate to="/super-admin/hostels" replace /> },
      { path: "/super-admin/admins", element: <Navigate to="/super-admin/hostels" replace /> },
      // ── SUPER_ADMIN: Support Tickets dashboard (Raise Ticket module) ────
      {
        path: "/super-admin/tickets",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN"]}>
            <SuperAdminTicketsPage />
          </ProtectedRoute>
        ),
      },
      // {
      //   path: "/super-admin/subscriptions",
      //   element: (
      //     <ProtectedRoute allow={["SUPER_ADMIN"]}>
      //       <SubscriptionsPage />
      //     </ProtectedRoute>
      //   ),
      // },
      // {
      //   path: "/super-admin/plans",
      //   element: (
      //     <ProtectedRoute allow={["SUPER_ADMIN"]}>
      //       <PlansPage />
      //     </ProtectedRoute>
      //   ),
      // },

      // ── PERMISSION MANAGEMENT (ADMIN + WARDEN only) ─────────────────────
      // SUPER_ADMIN manages hostels/admins/plans/status instead; Admins get
      // full permissions automatically on creation. Tenants do not have
      // permission routing, keeping alignment with your page spec.
      {
        path: "/permissions",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <PermissionManagementPage />
          </ProtectedRoute>
        ),
      },

      {
        path: "/maintenance",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]}>
            <MaintenancePage />
          </ProtectedRoute>
        ),
      },
      // ── ADMIN / WARDEN / TENANT — Dashboard ───────────────────────────
      // SUPER_ADMIN who manually types /dashboard gets redirected home.
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]} permission="VIEW_DASHBOARD">
            <Dashboard />
          </ProtectedRoute>
        ),
      },

      // ── ADMIN only ─────────────────────────────────────────────────────
      {
        path: "/branch",
        element: (
          <ProtectedRoute allow={["ADMIN"]} permission="MANAGE_BRANCHES">
            <BranchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/expenses",
        element: (
          // <ProtectedRoute allow={["ADMIN", "WARDEN",]} permission="MANAGE_EXPENSES">
          <ExpensePage/>
          // </ProtectedRoute>
        ),
      },
       {
        path: "/visitor",
        element: (
          // <ProtectedRoute allow={["ADMIN", "WARDEN",]} permission="MANAGE_EXPENSES">
          <VisitorPage/>
          // </ProtectedRoute>
        ),
      },
      {
        path: "/staff-register",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            {/* Registering users covers both wardens (ADMIN) and tenants
                (ADMIN/WARDEN) — either underlying permission unlocks the page. */}
            <PermissionRoute require={["MANAGE_WARDENS", "MANAGE_TENANTS"]}>
              <UserRegisterPage />
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },
      // {
      //   path: "/reports",
      //   element: (
      //     <ProtectedRoute allow={["ADMIN"]} permission="VIEW_REPORTS">
      //       <ReportsPage />
      //     </ProtectedRoute>
      //   ),
      // },
      // {
      //   path: "/subscription",
      //   element: (
      //     <ProtectedRoute allow={["ADMIN"]}>
      //       <AdminSubscriptionPage />
      //     </ProtectedRoute>
      //   ),
      // },

      // ── ADMIN + WARDEN ─────────────────────────────────────────────────
      {
        path: "/flat",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_FLAT">
            <FlatPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/rooms",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_ROOMS">
            <RoomsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/tenants",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_TENANTS">
            <TenantsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/eb-readings",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_EB_READINGS">
            <EBReadingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/rent",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_RENTS">
            <RentPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/announcements",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]} permission="MANAGE_ANNOUNCEMENTS">
            <AnnouncementPage />
          </ProtectedRoute>
        ),
      },

      // ── RULES & REGULATIONS — ADMIN full CRUD, WARDEN/TENANT view-only ──
      // No `permission` prop on purpose: per the RBAC spec, Warden and
      // Tenant must always be able to view rules, regardless of whether an
      // Admin has assigned them any fine-grained PERM_x permission. The
      // page itself hides Create/Edit/Delete controls for non-Admins, and
      // the backend (@PreAuthorize) is the authoritative enforcement point.
      {
        path: "/rules-regulations",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]}>
            <RuleRegulationPage />
          </ProtectedRoute>
        ),
      },

      {
        path: "/checkout",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_TENANTS">
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },

      // ── ALL ROLES — Profile ─────────────────────────────────────────────
      {
        path: "/profile",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"]}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },

      // ── ADMIN + WARDEN + TENANT ────────────────────────────────────────
      {
        path: "/payments",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]}>
            <PermissionRoute require={["MANAGE_PAYMENTS", "VIEW_PAYMENTS"]}>
              <PaymentsPage />
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },
      // ── ADMIN + WARDEN + TENANT ────────────────────────────────────────
      {
        path: "/complaints",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]} permission="MANAGE_COMPLAINTS">
            <ComplaintsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/food-timetable",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]} permission="MANAGE_FOOD_TIMETABLE">
            <FoodTimetablePage />
          </ProtectedRoute>
        ),
      },
      // ── ADMIN only — Raise Ticket module ────────────────────────────────
      {
        path: "/tickets",
        element: (
          <ProtectedRoute allow={["ADMIN"]}>
            <TicketsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // ── 404 ─────────────────────────────────────────────────────────────────
  { path: "*", element: <NotFound /> },
]);