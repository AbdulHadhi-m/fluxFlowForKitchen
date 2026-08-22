import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  category: "AI & Automation" | "Inventory & Logistics" | "POS & Ordering" | "Security & Diagnostics";
  status: boolean;
  rolloutPercentage: number;
  lastUpdated: string;
}

const INITIAL_FLAGS: FeatureFlag[] = [
  {
    id: "ff-001",
    name: "AI Recipe Food Cost Forecasting",
    key: "ai_food_costing_v2",
    description: "Automates real-time ingredient variance alerts and margin simulation with LLM forecasting.",
    category: "AI & Automation",
    status: true,
    rolloutPercentage: 100,
    lastUpdated: "Aug 18, 2026",
  },
  {
    id: "ff-002",
    name: "Multi-Location Inter-Branch Stock Transfers",
    key: "multi_branch_transfer_hub",
    description: "Enables warehouse dispatching, transit tracking, and transfer approval workflows across sister branches.",
    category: "Inventory & Logistics",
    status: true,
    rolloutPercentage: 100,
    lastUpdated: "Aug 15, 2026",
  },
  {
    id: "ff-003",
    name: "Contactless QR Table Self-Ordering",
    key: "qr_table_self_ordering_live",
    description: "Allows customers to scan table QR codes to browse digital menus and submit direct KDS orders.",
    category: "POS & Ordering",
    status: true,
    rolloutPercentage: 50,
    lastUpdated: "Aug 20, 2026",
  },
  {
    id: "ff-004",
    name: "Automated KDS Station Split Routing",
    key: "kds_split_station_routing",
    description: "Automatically routes appetizer, grill, and beverage items to isolated kitchen station screens.",
    category: "POS & Ordering",
    status: true,
    rolloutPercentage: 100,
    lastUpdated: "Aug 12, 2026",
  },
  {
    id: "ff-005",
    name: "Elevated Break-Glass Write Impersonation",
    key: "support_break_glass_writes",
    description: "Enables time-bounded, audited write impersonation for SaaS Owner technicians during emergency recovery.",
    category: "Security & Diagnostics",
    status: false,
    rolloutPercentage: 0,
    lastUpdated: "Aug 22, 2026",
  },
];

export const PlatformFeatureFlagsPage: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>(INITIAL_FLAGS);

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: !f.status } : f))
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flag className="h-5 w-5 text-teal-500" />
            Platform Feature Flags & Progressive Rollouts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            SaaS Owner responsibility: Enable beta modules, toggle system features, and manage progressive tenant rollouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30 text-xs">
            {flags.filter((f) => f.status).length} Active Flags
          </Badge>
        </div>
      </div>

      {/* Flags List */}
      <div className="space-y-3">
        {flags.map((flag) => (
          <Card
            key={flag.id}
            className={`bg-white dark:bg-slate-900/60 border transition-all ${
              flag.status
                ? "border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500/40"
                : "border-slate-200 dark:border-slate-800 opacity-70"
            }`}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{flag.name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                    {flag.key}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-teal-600 border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-500/10"
                  >
                    {flag.category}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {flag.description}
                </p>
                <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-1">
                  <span>Rollout: {flag.rolloutPercentage}% of tenants</span>
                  <span>·</span>
                  <span>Updated: {flag.lastUpdated}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => toggleFlag(flag.id)}
                  variant={flag.status ? "default" : "outline"}
                  size="sm"
                  className={`text-xs h-8 gap-1.5 ${
                    flag.status ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
                  }`}
                >
                  {flag.status ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Enabled
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" /> Disabled
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
