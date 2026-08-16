import React, { useState } from "react";
import { useProcurement } from "../hooks/useProcurement";
import { CreateSupplierModal } from "../components/CreateSupplierModal";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import { Link } from "react-router-dom";

export const SupplierListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const {
    suppliers,
    isLoadingSuppliers,
    createSupplier,
    isCreatingSupplier,
  } = useProcurement(searchQuery);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Vendors & Food Suppliers</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maintain raw material vendors, supplier contacts, and issue procurement purchase orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/procurement/orders">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-indigo-400" /> Purchase Orders
            </Button>
          </Link>

          <Can permission="procurement.manage">
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Plus className="h-3.5 w-3.5" /> Add Supplier
            </Button>
          </Can>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search suppliers, code, contact..."
          className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-200 h-9"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingSuppliers ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            Loading supplier directory...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            No suppliers found. Click "Add Supplier" to register food distributors.
          </div>
        ) : (
          suppliers.map((s) => (
            <Card key={s.id} className="bg-slate-900/60 border-slate-800 overflow-hidden hover:border-slate-700 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-white text-sm">{s.name}</h2>
                    <span className="font-mono text-[10px] text-indigo-400 font-bold">{s.supplier_code}</span>
                  </div>
                  <Badge className={s.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]" : "bg-slate-800 text-slate-400 text-[10px]"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  {s.contact_person && (
                    <div className="text-slate-300 font-medium">{s.contact_person}</div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Phone className="h-3 w-3 text-slate-500" /> {s.phone}
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-1.5 text-[11px] truncate">
                      <Mail className="h-3 w-3 text-slate-500" /> {s.email}
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-1.5 text-[11px] truncate text-slate-500">
                      <MapPin className="h-3 w-3 text-slate-500" /> {s.address}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateSupplierModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (values) => {
          await createSupplier(values);
          setIsCreateOpen(false);
        }}
        isLoading={isCreatingSupplier}
      />
    </div>
  );
};
