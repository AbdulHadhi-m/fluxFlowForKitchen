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
import { PosTerminalPage } from "@/features/orders/pages/PosTerminalPage";
import { OrderHistoryPage } from "@/features/orders/pages/OrderHistoryPage";
import { KitchenDisplayPage } from "@/features/kitchen/pages/KitchenDisplayPage";
import { BillingDashboardPage } from "@/features/billing/pages/BillingDashboardPage";
import { BillingHistoryPage } from "@/features/billing/pages/BillingHistoryPage";
import { InventoryListPage } from "@/features/inventory/pages/InventoryListPage";
import { StockMovementsPage } from "@/features/inventory/pages/StockMovementsPage";
import { SupplierListPage } from "@/features/procurement/pages/SupplierListPage";
import { PurchaseOrderListPage } from "@/features/procurement/pages/PurchaseOrderListPage";
import { ReportsDashboardPage } from "@/features/reports/pages/ReportsDashboardPage";
import { NotificationCenterPage } from "@/features/notifications/pages/NotificationCenterPage";
import { AuditLogsPage } from "@/features/audit/pages/AuditLogsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { CustomerDirectoryPage } from "@/features/customers/pages/CustomerDirectoryPage";
import { ReservationsPage } from "@/features/customers/pages/ReservationsPage";
import { LoyaltyDashboardPage } from "@/features/loyalty/pages/LoyaltyDashboardPage";
import { GiftCardsPage } from "@/features/loyalty/pages/GiftCardsPage";
import { MarketingDashboardPage } from "@/features/marketing/pages/MarketingDashboardPage";
import { PromotionsPage } from "@/features/marketing/pages/PromotionsPage";
import { PromotionEditorPage } from "@/features/marketing/pages/PromotionEditorPage";
import { CouponsPage } from "@/features/marketing/pages/CouponsPage";
import { SegmentsPage } from "@/features/marketing/pages/SegmentsPage";
import { CampaignsPage } from "@/features/marketing/pages/CampaignsPage";
import { PublicStorefrontPage } from "@/features/ordering/pages/PublicStorefrontPage";
import { QRTableOrderingPage } from "@/features/ordering/pages/QRTableOrderingPage";
import { CartPage } from "@/features/ordering/pages/CartPage";
import { CheckoutPage } from "@/features/ordering/pages/CheckoutPage";
import { OrderTrackingPage } from "@/features/ordering/pages/OrderTrackingPage";
import { CustomerPortalPage } from "@/features/ordering/pages/CustomerPortalPage";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { PermissionRoute } from "@/features/authorization/guards/PermissionRoute";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Customer Ordering & Storefront Routes */}
      <Route path="/r/:restaurantSlug" element={<PublicStorefrontPage />} />
      <Route path="/r/:restaurantSlug/table/:qrToken" element={<QRTableOrderingPage />} />
      <Route path="/r/:restaurantSlug/cart" element={<CartPage />} />
      <Route path="/r/:restaurantSlug/checkout" element={<CheckoutPage />} />
      <Route path="/r/:restaurantSlug/order/:trackingToken/track" element={<OrderTrackingPage />} />
      <Route path="/customer/portal" element={<CustomerPortalPage />} />

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
        path="/orders/pos"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="orders.create">
              <PosTerminalPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/history"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="orders.view">
              <OrderHistoryPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kds"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="kitchen.view">
              <KitchenDisplayPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="billing.view">
              <BillingDashboardPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/history"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="billing.view">
              <BillingHistoryPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="inventory.view">
              <InventoryListPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/movements"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="inventory.view">
              <StockMovementsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/procurement/suppliers"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="procurement.view">
              <SupplierListPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/procurement/orders"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="procurement.view">
              <PurchaseOrderListPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="reports.view">
              <ReportsDashboardPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationCenterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="audit.view">
              <AuditLogsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="settings.view">
              <SettingsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="customers.view">
              <CustomerDirectoryPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="reservations.view">
              <ReservationsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="loyalty.view">
              <LoyaltyDashboardPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gift-cards"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="gift_cards.view">
              <GiftCardsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="marketing.view">
              <MarketingDashboardPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/promotions"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="marketing.view">
              <PromotionsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/promotions/new"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="marketing.create">
              <PromotionEditorPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/promotions/:id/edit"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="marketing.manage">
              <PromotionEditorPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/coupons"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="marketing.view">
              <CouponsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/segments"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="marketing.view">
              <SegmentsPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/campaigns"
        element={
          <ProtectedRoute>
            <PermissionRoute requiredPermission="marketing.view">
              <CampaignsPage />
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
