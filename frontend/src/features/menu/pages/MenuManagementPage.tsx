import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMenu } from "../hooks/useMenu";
import { MenuCategory, MenuItem } from "../types/menu.types";
import { CategorySidebar } from "../components/CategorySidebar";
import { CategoryModal } from "../components/CategoryModal";
import { MenuItemTable } from "../components/MenuItemTable";
import { MenuItemModal } from "../components/MenuItemModal";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

export const MenuManagementPage: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const {
    categories,
    menuItems,
    meta,
    isLoadingItems,
  } = useMenu({
    category_id: selectedCategoryId || undefined,
    is_available: availabilityFilter ? availabilityFilter === "true" : undefined,
    search: search || undefined,
    page,
  });

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
                Menu & Catalog Management
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 py-0"
                >
                  Live Catalog
                </Badge>
              </h1>
              <p className="text-xs text-slate-400">
                Organize categories, configure menu pricing, and toggle instant item availability.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Can permission="menu.create">
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                size="sm"
                disabled={categories.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-lg shadow-blue-600/20"
              >
                <Plus className="h-4 w-4" /> Add Menu Item
              </Button>
            </Can>
          </div>
        </div>

        {/* Layout Grid: Categories Sidebar + Main Content */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar */}
          <CategorySidebar
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id) => {
              setSelectedCategoryId(id);
              setPage(1);
            }}
            onAddCategory={() => {
              setEditingCategory(null);
              setIsCategoryModalOpen(true);
            }}
            onEditCategory={(cat) => {
              setEditingCategory(cat);
              setIsCategoryModalOpen(true);
            }}
          />

          {/* Main Items Area */}
          <div className="flex-1 w-full space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search menu items..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 bg-slate-950/60 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 h-8"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                </div>

                <select
                  value={availabilityFilter}
                  onChange={(e) => {
                    setAvailabilityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Availability</option>
                  <option value="true">Available for Order</option>
                  <option value="false">86'd / Sold Out</option>
                </select>
              </div>
            </div>

            {/* Items Table */}
            {isLoadingItems ? (
              <div className="py-20 text-center text-slate-500 text-xs font-mono">
                Loading Menu Catalog...
              </div>
            ) : (
              <MenuItemTable
                items={menuItems}
                onEdit={(item) => {
                  setEditingItem(item);
                  setIsItemModalOpen(true);
                }}
              />
            )}

            {/* Pagination Controls */}
            {meta && meta.total_pages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>
                  Showing {menuItems.length} of {meta.count} items
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="h-7 w-7 p-0 border-slate-800 text-slate-300"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-mono text-slate-300 px-2">
                    Page {page} of {meta.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= meta.total_pages}
                    onClick={() => setPage(page + 1)}
                    className="h-7 w-7 p-0 border-slate-800 text-slate-300"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CategoryModal
        category={editingCategory}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <MenuItemModal
        item={editingItem}
        categories={categories}
        defaultCategoryId={selectedCategoryId || undefined}
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
      />
    </div>
  );
};
