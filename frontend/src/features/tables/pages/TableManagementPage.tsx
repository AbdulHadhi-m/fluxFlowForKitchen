import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTables } from "../hooks/useTables";
import { RestaurantTable } from "../types/table.types";
import { TableGrid } from "../components/TableGrid";
import { TableModal } from "../components/TableModal";
import { TableStatusModal } from "../components/TableStatusModal";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  ArrowLeft,
  Filter,
  Layers,
} from "lucide-react";

export const TableManagementPage: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const page = 1;

  // Modals state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [statusTable, setStatusTable] = useState<RestaurantTable | null>(null);

  const { tables, isLoading } = useTables({
    section: selectedSection || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
  });

  // Extract distinct sections from currently loaded tables
  const sections = Array.from(
    new Set(tables.map((t) => t.section || "Main Dining").filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-slate-800 hover:bg-slate-900 text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Floor Plan & Dining Tables
                <Badge
                  variant="outline"
                  className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/10 py-0"
                >
                  Floor Live
                </Badge>
              </h1>
              <p className="text-xs text-slate-400">
                Manage physical table seating capacities, section layouts, and live service occupancy.
              </p>
            </div>
          </div>

          <Can permission="tables.create">
            <Button
              onClick={() => {
                setEditingTable(null);
                setIsTableModalOpen(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <Plus className="h-4 w-4" /> Add Dining Table
            </Button>
          </Can>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSection("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              selectedSection === ""
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> All Sections ({tables.length})
          </button>

          {sections.map((sec) => {
            const isSelected = selectedSection === sec;
            const count = tables.filter((t) => (t.section || "Main Dining") === sec).length;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isSelected
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                }`}
              >
                {sec} ({count})
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search table number or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-slate-950/60 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 h-8"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>
        </div>

        {/* Table Floor Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 text-xs font-mono">
            Loading Dining Tables...
          </div>
        ) : (
          <TableGrid
            tables={tables}
            onEdit={(table) => {
              setEditingTable(table);
              setIsTableModalOpen(true);
            }}
            onStatusClick={(table) => setStatusTable(table)}
          />
        )}
      </div>

      {/* Modals */}
      <TableModal
        table={editingTable}
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
      />

      <TableStatusModal
        table={statusTable}
        isOpen={!!statusTable}
        onClose={() => setStatusTable(null)}
      />
    </div>
  );
};
