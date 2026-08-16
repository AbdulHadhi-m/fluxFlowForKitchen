import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { DashboardPage } from "@/features/auth/pages/DashboardPage";
import { RestaurantSetupPage } from "@/features/restaurants/pages/RestaurantSetupPage";
import { StaffManagementPage } from "@/features/staff/pages/StaffManagementPage";
import { MenuManagementPage } from "@/features/menu/pages/MenuManagementPage";
import { TableManagementPage } from "@/features/tables/pages/TableManagementPage";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { PermissionRoute } from "@/features/authorization/guards/PermissionRoute";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/restaurant/setup"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="settings.view">
              <RestaurantSetupPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="staff.view">
              <StaffManagementPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="menu.view">
              <MenuManagementPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tables"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="tables.view">
              <TableManagementPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
