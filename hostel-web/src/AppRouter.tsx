// src/AppRouter.tsx
import { createBrowserRouter } from "react-router-dom";

// Layout & Protected Route
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import RoomsPage from "@/pages/RoomsPage";
import TenantsPage from "@/pages/TenantsPage";
import EBReadingsPage from "@/pages/EBReadingsPage";
import RentPage from "@/pages/RentPage";
import CheckoutPage from "@/pages/CheckoutPage";
import ReportsPage from "@/pages/ReportsPage";
import NotFound from "@/pages/NotFound";
import Unauthorized from "@/pages/Unauthorized";
import BranchPage from "@/pages/BranchPage";
import UserRegisterPage from "@/pages/UserRegisterPage";

export const router = createBrowserRouter([
  // Public routes
  { path: "/", element: <Login /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  
  {
    element: (
      <ProtectedRoute allow={["ADMIN", "VIEWER"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <Dashboard /> },

      {
        path: "/tenants",
        element: (
          <ProtectedRoute allow={["ADMIN","VIEWER"]}>
            <TenantsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/eb-readings",
        element: (
          <ProtectedRoute allow={["ADMIN", "VIEWER"]}>
            <EBReadingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/rent",
        element: (
          <ProtectedRoute allow={["ADMIN", "VIEWER"]}>
            <RentPage />
          </ProtectedRoute>
        ),
      },

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
        path: "/rooms",
        element: (
          <ProtectedRoute allow={["ADMIN", "VIEWER"]}>
            <RoomsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/checkout",
        element: (
          <ProtectedRoute allow={["ADMIN", "VIEWER"]}>
            <CheckoutPage />
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
    ],
  },

  // 404 fallback
  { path: "*", element: <NotFound /> },
]);