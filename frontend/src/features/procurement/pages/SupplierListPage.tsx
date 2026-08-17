import React, { useState } from "react";
import { useSuppliers } from "../hooks/useProcurement";
import { CreateSupplierModal } from "../components/CreateSupplierModal";
import { SupplierScorecardModal } from "../components/SupplierScorecardModal";
import { CreatePOModal } from "../components/CreatePOModal";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Award,
  ShoppingCart,
  Clock,
  DollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";

export const SupplierListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: suppliers = [], isLoading } = useSuppliers({
    search: searchQuery || undefined,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedScorecardSupplierId, setSelectedScorecardSupplierId] = useState<string | null>(null);
  const [selectedPoSupplier, setSelectedPoSupplier] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Vendors & Food Suppliers</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supplier master catalog, multi-contact directory, payment terms, and performance scorecards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/procurement/purchase-orders"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700/60 transition-colors"
          >
            <ShoppingCart className="h-4 w-4 text-indigo-400" />
            Purchase Orders
          </Link>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search suppliers, code, contact..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full p-16 text-center text-slate-500 text-sm">
            Loading supplier directory...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            No suppliers found. Click "Add Supplier" to register food distributors.
          </div>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-4 hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base">{s.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-indigo-400 font-bold">{s.supplier_code}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                        {s.supplier_type?.replace(/_/g, " ") || "Wholesaler"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      s.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                  {s.contact_person && (
                    <p className="flex items-center gap-2">
                      <span className="text-slate-500">Contact:</span>
                      <strong className="text-slate-300">{s.contact_person}</strong>
                    </p>
                  )}
                  {s.phone && (
                    <p className="flex items-center gap-2 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {s.phone}
                    </p>
                  )}
                  {s.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{s.email}</span>
                    </p>
                  )}
                  {s.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lead: <strong className="text-white">{s.lead_time_days || 2}d</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>Terms: <strong className="text-white">{s.payment_terms || "NET 30"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setSelectedScorecardSupplierId(s.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                >
                  <Award className="w-3.5 h-3.5" />
                  Scorecard
                </button>

                <button
                  onClick={() => setSelectedPoSupplier(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  New PO
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {isCreateOpen && <CreateSupplierModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
      {selectedScorecardSupplierId && (
        <SupplierScorecardModal
          supplierId={selectedScorecardSupplierId}
          isOpen={Boolean(selectedScorecardSupplierId)}
          onClose={() => setSelectedScorecardSupplierId(null)}
        />
      )}
      {selectedPoSupplier && (
        <CreatePOModal
          isOpen={Boolean(selectedPoSupplier)}
          onClose={() => setSelectedPoSupplier(null)}
          prefillItem={{
            supplier_id: selectedPoSupplier.id,
            inventory_item_id: "",
            quantity: "10.000",
            unit_cost: "0.00",
          }}
        />
      )}
    </div>
  );
};
