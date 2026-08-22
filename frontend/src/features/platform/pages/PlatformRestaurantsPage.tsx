import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Search,
  Store,
  MapPin,
  UserCheck,
} from "lucide-react";

interface TenantRestaurant {
  id: string;
  name: string;
  code: string;
  tier: "Starter" | "Growth" | "Enterprise";
  status: "Active" | "Trial" | "Suspended";
  branches: number;
  activeStaff: number;
  monthlyGmv: string;
  location: string;
  joinedDate: string;
  ownerEmail: string;
}

const MOCK_RESTAURANTS: TenantRestaurant[] = [
  {
    id: "rest-001",
    name: "The Olive Garden Bistro",
    code: "OLIVE_BISTRO",
    tier: "Enterprise",
    status: "Active",
    branches: 4,
    activeStaff: 38,
    monthlyGmv: "₹1,240,000",
    location: "Mumbai, Maharashtra",
    joinedDate: "Jan 15, 2026",
    ownerEmail: "owner@olivegardenbistro.in",
  },
  {
    id: "rest-002",
    name: "Saffron Spice Kitchen & Grill",
    code: "SAFFRON_GRILL",
    tier: "Growth",
    status: "Active",
    branches: 2,
    activeStaff: 18,
    monthlyGmv: "₹640,000",
    location: "Bengaluru, Karnataka",
    joinedDate: "Feb 02, 2026",
    ownerEmail: "admin@saffronspice.com",
  },
  {
    id: "rest-003",
    name: "Urban Crust Pizzeria",
    code: "URBAN_CRUST",
    tier: "Starter",
    status: "Trial",
    branches: 1,
    activeStaff: 8,
    monthlyGmv: "₹185,000",
    location: "Hyderabad, Telangana",
    joinedDate: "Aug 10, 2026",
    ownerEmail: "pizzachef@urbancrust.io",
  },
  {
    id: "rest-004",
    name: "Royal Rajputana Fine Dining",
    code: "ROYAL_RAJPUTANA",
    tier: "Enterprise",
    status: "Active",
    branches: 3,
    activeStaff: 42,
    monthlyGmv: "₹1,850,000",
    location: "Jaipur, Rajasthan",
    joinedDate: "Nov 20, 2025",
    ownerEmail: "management@royalrajputana.co",
  },
];

export const PlatformRestaurantsPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");

  const filtered = MOCK_RESTAURANTS.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "ALL" || r.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-500" />
            All Restaurants & Multi-Tenant Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            SaaS Owner responsibility: Global oversight of provisioned restaurant tenants, subscription tiers, and branch networks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
            {MOCK_RESTAURANTS.length} Registered Tenants
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Active Tenants</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {MOCK_RESTAURANTS.filter((r) => r.status === "Active").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Branches</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {MOCK_RESTAURANTS.reduce((sum, r) => sum + r.branches, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Staff Users</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {MOCK_RESTAURANTS.reduce((sum, r) => sum + r.activeStaff, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Platform Processed GMV</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">₹3,915,000</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by restaurant name, code, or owner email..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "Enterprise", "Growth", "Starter"].map((tier) => (
            <Button
              key={tier}
              variant={tierFilter === tier ? "default" : "outline"}
              size="sm"
              onClick={() => setTierFilter(tier)}
              className="text-xs h-8"
            >
              {tier}
            </Button>
          ))}
        </div>
      </div>

      {/* Restaurants Table */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Restaurant Organization</th>
                <th className="py-3 px-4 font-semibold">Plan Tier</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Branches</th>
                <th className="py-3 px-4 font-semibold">Active Staff</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold text-right">Support Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((rest) => (
                <tr key={rest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Store className="h-4 w-4 text-emerald-500" />
                      {rest.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {rest.code} · {rest.ownerEmail}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        rest.tier === "Enterprise"
                          ? "text-purple-600 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-500/10"
                          : rest.tier === "Growth"
                          ? "text-blue-600 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-500/10"
                          : "text-slate-600 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40"
                      }`}
                    >
                      {rest.tier}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {rest.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {rest.branches} {rest.branches === 1 ? "branch" : "branches"}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {rest.activeStaff} users
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {rest.location}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link to="/platform/impersonation">
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 gap-1 px-2">
                        <UserCheck className="h-3.5 w-3.5" />
                        Diagnostics
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
