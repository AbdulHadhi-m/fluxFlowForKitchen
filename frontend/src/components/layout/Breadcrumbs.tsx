import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  restaurant: "Restaurant",
  setup: "Setup",
  staff: "Staff",
  menu: "Menu Catalog",
  tables: "Table Floor",
  orders: "Orders",
  pos: "POS Terminal",
  history: "Order History",
  kitchen: "Kitchen Display",
  billing: "Billing",
  inventory: "Inventory",
  movements: "Stock Movements",
  procurement: "Procurement",
  suppliers: "Suppliers",
  "purchase-orders": "Purchase Orders",
  reports: "Analytics & Reports",
  notifications: "Notification Center",
  "audit-logs": "Security & Audit",
  settings: "Settings",
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === "dashboard")) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Home className="h-3.5 w-3.5 text-indigo-400" />
        <span className="text-white font-bold">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
      <Link to="/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
        <Home className="h-3.5 w-3.5 text-slate-500 hover:text-indigo-400" />
      </Link>

      {pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const targetPath = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const label = ROUTE_LABELS[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <React.Fragment key={targetPath}>
            <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
            {isLast ? (
              <span className="text-white font-bold truncate max-w-[150px] sm:max-w-none">{label}</span>
            ) : (
              <Link to={targetPath} className="hover:text-white transition-colors truncate max-w-[100px] sm:max-w-none">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
