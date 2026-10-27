// src/AppRouter.tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PermissionRoute from "@/components/PermissionRoute";

import Login           from "@/pages/Login";
const SuperAdminPage = lazy(() => import("@/pages/SuperAdminPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const RoomsPage = lazy(() => import("@/pages/RoomsPage"));
const TenantsPage = lazy(() => import("@/pages/TenantsPage"));
const EBReadingsPage = lazy(() => import("@/pages/EBReadingsPage"));
const RentPage = lazy(() => import("@/pages/RentPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
import NotFound        from "@/pages/NotFound";
import Unauthorized    from "@/pages/Unauthorized";
const BranchPage = lazy(() => import("@/pages/BranchPage"));
const HostelAdminPage = lazy(() => import("@/pages/HostelAdminPage"));
// import BusinessModelPage from "@/pages/BusinessModelPage";
const UserRegisterPage = lazy(() => import("@/pages/UserRegisterPage"));
const ComplaintsPage = lazy(() => import("@/pages/ComplaintPage"));
// import FlatPage        from "@/pages/FlatPage";
const FoodTimetablePage = lazy(() => import("@/pages/FoodTimetablePage"));
const SundayMealPage = lazy(() => import("@/pages/Sundaymealpage"));
const AnnouncementPage = lazy(() => import("@/pages/AnnouncementPage"));
const RuleRegulationPage = lazy(() => import("@/pages/RuleRegulationPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const PermissionManagementPage = lazy(() => import("@/pages/PermissionManagementPage"));
const TicketsPage = lazy(() => import("@/pages/TicketsPage"));
const SuperAdminTicketsPage = lazy(() => import("@/pages/SuperAdminTicketsPage"));
const ExpensePage = lazy(() => import("./pages/ExpenseTracker"));
const VisitorPage = lazy(() => import("./pages/Visitor"));
const MaintenancePage = lazy(() => import("@/pages/MaintenancePage"));
const SubscriptionPage = lazy(() => import("@/pages/SubscriptionPage"));
const TenantNoticePeriodPage = lazy(() => import("@/pages/TenantNoticePeriodPage"));

import HomePage from "./pages/Home";
const PropertyDetailPage = lazy(() => import("@/pages/PropertyDetailPage"));
const DamagePage = lazy(() => import("@/pages/DamagePage"));

const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));


export const router = createBrowserRouter([

  // ── Public ──────────────────────────────────────────────────────────────
  { path: "/",             element: <HomePage /> },
  { path: "/property/:id",  element: <Suspense fallback={null}><PropertyDetailPage /></Suspense> },
  { path: "/login",        element: <Login /> },
  { path: "/admin",        element: <Navigate to="/dashboard" replace /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  { path: "/forgot-password", element: <Suspense fallback={null}><ForgotPasswordPage /></Suspense> },
  { path: "/reset-password",  element: <Suspense fallback={null}><ResetPasswordPage /></Suspense> },

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
            <Suspense fallback={null}><SuperAdminPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/super-admin/hostels",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN"]} permission="MANAGE_HOSTELS">
            <Suspense fallback={null}><HostelAdminPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      { path: "/hostels", element: <Navigate to="/super-admin/hostels" replace /> },
      // {
      //   path: "/super-admin/business-model",
      //   element: (
      //     <ProtectedRoute allow={["SUPER_ADMIN"]}>
      //       <BusinessModelPage />
      //     </ProtectedRoute>
      //   ),
      // },
      { path: "/super-admin/admins", element: <Navigate to="/super-admin/hostels" replace /> },
      {
        path: "/super-admin/tickets",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN"]}>
            <Suspense fallback={null}><SuperAdminTicketsPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "/damages",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_DAMAGES">
            <Suspense fallback={null}><DamagePage /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "/permissions",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <Suspense fallback={null}><PermissionManagementPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "/maintenance",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]}>
            <PermissionRoute require={["MANAGE_MAINTENANCE", "VIEW_MAINTENANCE"]} staffOnly>
              <Suspense fallback={null}><MaintenancePage /></Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]} permission="VIEW_DASHBOARD">
            <Suspense fallback={null}><Dashboard /></Suspense>
          </ProtectedRoute>
        ),
      },

      // ── ADMIN only ─────────────────────────────────────────────────────
      {
        path: "/branch",
        element: (
          <ProtectedRoute allow={["ADMIN"]} permission="MANAGE_BRANCHES">
            <Suspense fallback={null}><BranchPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/expenses",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <PermissionRoute require={["MANAGE_EXPENSES", "MANAGE_PAYMENTS", "VIEW_PAYMENTS"]}>
              <Suspense fallback={null}><ExpensePage /></Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: "/visitor",
        element: (
          <PermissionRoute require="MANAGE_VISITORS" staffOnly>
            <Suspense fallback={null}><VisitorPage /></Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "/staff-register",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <PermissionRoute require={["MANAGE_WARDENS", "MANAGE_TENANTS"]}>
              <Suspense fallback={null}><UserRegisterPage /></Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },

      {
        path: "/subscription",
        element: (
          <ProtectedRoute allow={["ADMIN"]}>
            <Suspense fallback={null}><SubscriptionPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // // ── ADMIN + WARDEN ─────────────────────────────────────────────────
      // {
      //   path: "/flat",
      //   element: (
      //     <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_FLAT">
      //       <FlatPage />
      //     </ProtectedRoute>
      //   ),
      // },
      {
        path: "/rooms",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_ROOMS">
            <Suspense fallback={null}><RoomsPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/tenants",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_TENANTS">
            <Suspense fallback={null}><TenantsPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // ── NEW: TENANT — self-service Notice Period ────────────────────────
      {
        path: "/notice-period",
        element: (
          <ProtectedRoute allow={["TENANT"]}>
            <Suspense fallback={null}><TenantNoticePeriodPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "/eb-readings",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_EB_READINGS">
            <Suspense fallback={null}><EBReadingsPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/rent",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_RENTS">
            <Suspense fallback={null}><RentPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/announcements",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]} permission="MANAGE_ANNOUNCEMENTS">
            <Suspense fallback={null}><AnnouncementPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "/rules-regulations",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]}>
            <PermissionRoute require="MANAGE_RULES_REGULATIONS" staffOnly>
              <Suspense fallback={null}><RuleRegulationPage /></Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },

      {
        path: "/checkout",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]} permission="MANAGE_TENANTS">
            <Suspense fallback={null}><CheckoutPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "/profile",
        element: (
          <ProtectedRoute allow={["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"]}>
            <Suspense fallback={null}><ProfilePage /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "/payments",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]}>
            <PermissionRoute require={["MANAGE_PAYMENTS", "VIEW_PAYMENTS"]}>
              <Suspense fallback={null}><PaymentsPage /></Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: "/complaints",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]} permission="MANAGE_COMPLAINTS">
            <Suspense fallback={null}><ComplaintsPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/food-timetable",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]} permission="MANAGE_FOOD_TIMETABLE">
            <Suspense fallback={null}><FoodTimetablePage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/sunday-meal",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]} permission="VIEW_SUNDAY_MEAL">
            <Suspense fallback={null}><SundayMealPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/tickets",
        element: (
          <ProtectedRoute allow={["ADMIN"]}>
            <Suspense fallback={null}><TicketsPage /></Suspense>
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