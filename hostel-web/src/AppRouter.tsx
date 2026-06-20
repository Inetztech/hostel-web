// src/AppRouter.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

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
import UserRegisterPage from "@/pages/UserRegisterPage";
import ComplaintsPage  from "@/pages/ComplaintPage";
import FlatPage        from "@/pages/FlatPage";
import FoodTimetablePage from "@/pages/FoodTimetablePage";
import AnnouncementPage from "@/pages/AnnouncementPage";

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

      // ── ADMIN / WARDEN / TENANT — Dashboard ───────────────────────────
      // SUPER_ADMIN who manually types /dashboard gets redirected home.
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN", "TENANT"]}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },

      // ── ADMIN only ─────────────────────────────────────────────────────
      {
        path: "/branch",
        element: (
          <ProtectedRoute allow={["ADMIN"]}>
            <BranchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/user-register",
        element: (
          <ProtectedRoute allow={["ADMIN"]}>
            <UserRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/reports",
        element: (
          <ProtectedRoute allow={["ADMIN"]}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },

      // ── ADMIN + WARDEN ─────────────────────────────────────────────────
      {
        path: "/flat",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <FlatPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/rooms",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <RoomsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/tenants",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <TenantsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/eb-readings",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <EBReadingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/rent",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <RentPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/announcements",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <AnnouncementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/checkout",
        element: (
          <ProtectedRoute allow={["ADMIN", "WARDEN"]}>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },

      // ── ADMIN + WARDEN + TENANT ────────────────────────────────────────
      {
        path: "/complaints",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]}>
            <ComplaintsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/food-timetable",
        element: (
          <ProtectedRoute allow={["ADMIN", "TENANT", "WARDEN"]}>
            <FoodTimetablePage />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // ── 404 ─────────────────────────────────────────────────────────────────
  { path: "*", element: <NotFound /> },
]);