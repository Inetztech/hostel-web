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
import NotFound        from "@/pages/NotFound";
import Unauthorized    from "@/pages/Unauthorized";
import BranchPage      from "@/pages/BranchPage";
import HostelAdminPage from "@/pages/HostelAdminPage";
import UserRegisterPage from "@/pages/UserRegisterPage";
import ComplaintsPage  from "@/pages/ComplaintPage";
import FlatPage        from "@/pages/FlatPage";
import FoodTimetablePage from "@/pages/FoodTimetablePage";
import SundayMealPage from "@/pages/Sundaymealpage";
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
import SubscriptionPage from "@/pages/SubscriptionPage";
import TenantNoticePeriodPage from "@/pages/TenantNoticePeriodPage";

import HomePage from "./pages/Home";
import PropertyDetailPage from "@/pages/PropertyDetailPage";
import DamagePage from "@/pages/DamagePage";



export const router = createBrowserRouter([

  // ── Public ──────────────────────────────────────────────────────────────
  { path: "/",             element: <HomePage /> },
  { path: "/property/:id",  element: <PropertyDetailPage /> },
  { path: "/login",        element: <Login /> },
  { path: "/admin",        element: <Navigate to="/dashboard" replace /> },
  { path: "/unauthorized", element: <Unauthorized /> },

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
      {
        path: "/super-admin/tickets",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN"]}>
            <SuperAdminTicketsPage />
          </ProtectedRoute>
        ),
      },

      {
        path: "/damages",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_DAMAGES">
            <DamagePage />
          </ProtectedRoute>
        ),
      },

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
        element: <ExpensePage/>,
      },
      {
        path: "/visitor",
        element: <VisitorPage/>,
      },
      {
        path: "/staff-register",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <PermissionRoute require={["MANAGE_WARDENS", "MANAGE_TENANTS"]}>
              <UserRegisterPage />
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },

      {
        path: "/subscription",
        element: (
          <ProtectedRoute allow={["ADMIN"]}>
            <SubscriptionPage />
          </ProtectedRoute>
        ),
      },

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

      // ── NEW: TENANT — self-service Notice Period ────────────────────────
      {
        path: "/notice-period",
        element: (
          <ProtectedRoute allow={["TENANT"]}>
            <TenantNoticePeriodPage />
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

      {
        path: "/profile",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"]}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },

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
      {
        path: "/sunday-meal",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]} permission="VIEW_SUNDAY_MEAL">
            <SundayMealPage />
          </ProtectedRoute>
        ),
      },
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

  { path: "*", element: <NotFound /> },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  }
});