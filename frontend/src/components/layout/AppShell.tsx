import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useActiveRole } from "@/features/authorization/hooks/useActiveRole";
import { RoleSwitcher } from "@/features/authorization/components/RoleSwitcher";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { CommandMenu } from "./CommandMenu";
import { useUIStore } from "@/stores/uiStore";
import {
  LayoutDashboard,
  Utensils,
  Layers,
  ShoppingBag,
  ChefHat,
  Receipt,
  Boxes,
  Truck,
  BarChart3,
  Users,
  Bell,
  Calendar,
  Award,
  CreditCard,
  Shield,
  Settings,
  Menu,
  X,
  Search,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ArrowRightLeft,
  Trash2,
  DollarSign,
  ShoppingCart,
  History,
  Building2,
  RotateCcw,
  FileCheck,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  permission?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    group: "MAIN",
    items: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { id: "pos", label: "POS Terminal", path: "/orders/pos", icon: ShoppingBag, permission: "orders.create" },
      { id: "orders", label: "Orders", path: "/orders/history", icon: Utensils, permission: "orders.view" },
      { id: "kitchen", label: "Kitchen (KDS)", path: "/kitchen", icon: ChefHat, permission: "kitchen.view" },
      { id: "delivery", label: "Delivery & Dispatch", path: "/delivery", icon: Truck, permission: "delivery.view" },
      { id: "tables", label: "Table Floor", path: "/tables", icon: Layers, permission: "tables.view" },
      { id: "reservations", label: "Reservations", path: "/reservations", icon: Calendar, permission: "reservations.view" },
      { id: "customers", label: "Customers & CRM", path: "/customers", icon: Users, permission: "customers.view" },
      { id: "loyalty", label: "Loyalty & Rewards", path: "/loyalty", icon: Award, permission: "loyalty.view" },
      { id: "marketing", label: "Marketing & Promos", path: "/marketing", icon: Sparkles, permission: "marketing.view" },
      { id: "gift-cards", label: "Gift Cards", path: "/gift-cards", icon: CreditCard, permission: "gift_cards.view" },
    ],
  },
  {
    group: "CATALOG",
    items: [
      { id: "menu", label: "Menu Catalog", path: "/menu", icon: Utensils, permission: "menu.view" },
    ],
  },
  {
    group: "INVENTORY & FOOD COST",
    items: [
      { id: "inventory", label: "Stock Items", path: "/inventory", icon: Boxes, permission: "inventory.view" },
      { id: "recipes", label: "Recipe BOM", path: "/inventory/recipes", icon: ChefHat, permission: "inventory.view" },
      { id: "stock-counts", label: "Stock Audits", path: "/inventory/stock-counts", icon: ClipboardList, permission: "inventory.view" },
      { id: "transfers", label: "Transfers", path: "/inventory/transfers", icon: ArrowRightLeft, permission: "inventory.view" },
      { id: "waste", label: "Wastage Log", path: "/inventory/waste", icon: Trash2, permission: "inventory.view" },
      { id: "food-cost", label: "Food Costing", path: "/inventory/food-cost", icon: DollarSign, permission: "inventory.view" },
      { id: "reorder", label: "Par Reorder", path: "/inventory/reorder", icon: ShoppingCart, permission: "inventory.view" },
      { id: "movements", label: "Movements Ledger", path: "/inventory/movements", icon: History, permission: "inventory.view" },
    ],
  },
  {
    group: "PROCUREMENT & PURCHASING",
    items: [
      { id: "procurement-hub", label: "Procurement Hub", path: "/procurement", icon: ShoppingCart, permission: "procurement.view" },
      { id: "suppliers", label: "Supplier Master", path: "/procurement/suppliers", icon: Building2, permission: "procurement.view" },
      { id: "requisitions", label: "Requisitions", path: "/procurement/requisitions", icon: ClipboardList, permission: "procurement.view" },
      { id: "po", label: "Purchase Orders", path: "/procurement/purchase-orders", icon: Truck, permission: "procurement.view" },
      { id: "returns", label: "Returns & Credits", path: "/procurement/returns", icon: RotateCcw, permission: "procurement.view" },
      { id: "invoices", label: "3-Way Matching", path: "/procurement/invoices", icon: FileCheck, permission: "procurement.view" },
      { id: "budgets", label: "Purchase Budgets", path: "/procurement/budgets", icon: DollarSign, permission: "procurement.view" },
      { id: "planning", label: "Auto Reorder", path: "/procurement/planning", icon: Sparkles, permission: "procurement.view" },
    ],
  },
  {
    group: "FINANCE",
    items: [
      { id: "billing", label: "Billing & Cashier", path: "/billing", icon: Receipt, permission: "billing.view" },
      { id: "billing-history", label: "Invoice History", path: "/billing/history", icon: Receipt, permission: "billing.view" },
      { id: "reports", label: "Analytics & Reports", path: "/reports", icon: BarChart3, permission: "reports.view" },
    ],
  },
  {
    group: "ADMINISTRATION",
    items: [
      { id: "staff", label: "Staff Roster", path: "/staff", icon: Users, permission: "staff.view" },
      { id: "notifications", label: "Notification Center", path: "/notifications", icon: Bell },
      { id: "audit", label: "Security Audit", path: "/audit-logs", icon: Shield, permission: "audit.view" },
      { id: "settings", label: "Settings", path: "/settings", icon: Settings, permission: "settings.view" },
    ],
  },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, isLoggingOut } = useAuth();
  const { permissions } = useActiveRole();
  const hasPermission = (perm: string) => permissions.includes(perm);
  const location = useLocation();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileNavOpen,
    setMobileNavOpen,
    setCommandMenuOpen,
  } = useUIStore();

  const isNavActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const filteredNavGroups = NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Mobile drawer toggle */}
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open mobile menu"
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-850 focus:outline-none"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-black tracking-tight text-white block leading-none">Fluxiflow</span>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Kitchen Suite</span>
            </div>
          </Link>
        </div>

        {/* Global Search Trigger (Ctrl+K) */}
        <button
          onClick={() => setCommandMenuOpen(true)}
          className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800/80 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors w-64 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span>Search or jump to...</span>
          </div>
          <kbd className="font-mono text-[10px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-slate-500">
            Ctrl+K
          </kbd>
        </button>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          {/* Notifications */}
          <NotificationBell />

          {/* Active Role Switcher */}
          <RoleSwitcher />

          {/* User Sign Out */}
          <button
            onClick={() => logout()}
            disabled={isLoggingOut}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors focus:outline-none"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-sm transition-all duration-300 ${
            isSidebarCollapsed ? "w-16" : "w-60"
          }`}
        >
          {/* Sidebar Nav Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {filteredNavGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                {!isSidebarCollapsed && (
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2.5 py-1">
                    {group.group}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.path);

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      title={item.label}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Collapse Sidebar Button */}
          <div className="p-2 border-t border-slate-800/80 flex justify-end">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-900 transition-colors"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
            />

            {/* Drawer */}
            <div className="relative w-72 bg-slate-950 border-r border-slate-800 p-4 space-y-6 flex flex-col z-50 h-full overflow-y-auto animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-sm text-white">Fluxiflow</span>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {filteredNavGroups.map((group) => (
                  <div key={group.group} className="space-y-1">
                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2 py-1">
                      {group.group}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isNavActive(item.path);

                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "text-slate-400 hover:text-white hover:bg-slate-900"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandMenu />
    </div>
  );
};
