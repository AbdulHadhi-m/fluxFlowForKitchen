import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import { useActiveRole } from "@/features/authorization/hooks/useActiveRole";
import {
  Search,
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
  ShieldCheck,
  Settings,
  X,
} from "lucide-react";

interface NavCommand {
  id: string;
  label: string;
  category: string;
  path: string;
  permission?: string;
  icon: React.ElementType;
}

const COMMANDS: NavCommand[] = [
  { id: "dashboard", label: "Dashboard", category: "General", path: "/dashboard", icon: LayoutDashboard },
  { id: "pos", label: "POS Terminal", category: "Operations", path: "/orders/pos", permission: "orders.create", icon: ShoppingBag },
  { id: "orders", label: "Order History", category: "Operations", path: "/orders/history", permission: "orders.view", icon: Utensils },
  { id: "kitchen", label: "Kitchen Display (KDS)", category: "Operations", path: "/kitchen", permission: "kitchen.view", icon: ChefHat },
  { id: "tables", label: "Table Floor Management", category: "Operations", path: "/tables", permission: "tables.view", icon: Layers },
  { id: "reservations", label: "Table Reservations & Bookings", category: "Operations", path: "/reservations", permission: "reservations.view", icon: Calendar },
  { id: "customers", label: "Customer Directory & CRM", category: "Operations", path: "/customers", permission: "customers.view", icon: Users },
  { id: "loyalty", label: "Loyalty, Memberships & Rewards", category: "Operations", path: "/loyalty", permission: "loyalty.view", icon: Award },
  { id: "gift-cards", label: "Gift Cards Management", category: "Operations", path: "/gift-cards", permission: "gift_cards.view", icon: CreditCard },
  { id: "menu", label: "Menu Catalog & Items", category: "Catalog", path: "/menu", permission: "menu.view", icon: Utensils },
  { id: "inventory", label: "Inventory Stock Roster", category: "Inventory", path: "/inventory", permission: "inventory.view", icon: Boxes },
  { id: "movements", label: "Stock Movements & Wastage", category: "Inventory", path: "/inventory/movements", permission: "inventory.view", icon: Boxes },
  { id: "suppliers", label: "Vendors & Suppliers", category: "Procurement", path: "/procurement/suppliers", permission: "procurement.view", icon: Truck },
  { id: "po", label: "Purchase Orders", category: "Procurement", path: "/procurement/purchase-orders", permission: "procurement.view", icon: Truck },
  { id: "billing", label: "Billing & Cashier Dashboard", category: "Finance", path: "/billing", permission: "billing.view", icon: Receipt },
  { id: "billing-history", label: "Invoices & Settlement History", category: "Finance", path: "/billing/history", permission: "billing.view", icon: Receipt },
  { id: "reports", label: "Business Reports & Analytics", category: "Finance", path: "/reports", permission: "reports.view", icon: BarChart3 },
  { id: "staff", label: "Staff & Employee Directory", category: "Administration", path: "/staff", permission: "staff.view", icon: Users },
  { id: "access-control", label: "Enterprise Access Control (Dynamic RBAC)", category: "Administration", path: "/security/access-control", permission: "security.view", icon: ShieldCheck },
  { id: "notifications", label: "Notification Center", category: "Administration", path: "/notifications", icon: Bell },
  { id: "audit", label: "Security Audit Logs", category: "Administration", path: "/audit-logs", permission: "audit.view", icon: Shield },
  { id: "settings", label: "System & Restaurant Settings", category: "Administration", path: "/settings", permission: "settings.view", icon: Settings },
];

export const CommandMenu: React.FC = () => {
  const { isCommandMenuOpen, setCommandMenuOpen } = useUIStore();
  const { permissions } = useActiveRole();
  const hasPermission = (perm: string) => permissions.includes(perm);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandMenuOpen(!isCommandMenuOpen);
      }
      if (e.key === "Escape" && isCommandMenuOpen) {
        setCommandMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandMenuOpen, setCommandMenuOpen]);

  if (!isCommandMenuOpen) return null;

  const accessibleCommands = COMMANDS.filter((cmd) => {
    if (cmd.permission && !hasPermission(cmd.permission)) {
      return false;
    }
    if (!query) return true;
    return (
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
    );
  });

  const handleSelect = (path: string) => {
    setCommandMenuOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[70vh]">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page..."
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <button onClick={() => setCommandMenuOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto space-y-1">
          {accessibleCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching pages or actions found.
            </div>
          ) : (
            accessibleCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.path)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-600/10 hover:text-emerald-600 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 transition-colors text-xs text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-500/30">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold">{cmd.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono group-hover:text-emerald-400">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500">
          <span>Navigate with mouse or click</span>
          <span className="font-mono bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">ESC to close</span>
        </div>
      </div>
    </div>
  );
};
