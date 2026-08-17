import React, { useState } from "react";
import { useProcurement } from "../hooks/useProcurement";
import { useInventory } from "@/features/inventory/hooks/useInventory";
import { POStatusBadge } from "../components/POStatusBadge";
import { CreatePOModal } from "../components/CreatePOModal";
import { ReceiveGoodsModal } from "../components/ReceiveGoodsModal";
import { PurchaseOrder } from "../types/procurement.types";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Plus,
  Search,
  Send,
  CheckCircle2,
  Truck,
  Ban,
  Building2,
} from "lucide-react";
import { Link } from "react-router-dom";

export const PurchaseOrderListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedReceivePO, setSelectedReceivePO] = useState<PurchaseOrder | null>(null);

  const {
    purchaseOrders,
    isLoadingPOs,
    suppliers,
    createPO,
    isCreatingPO,
    submitPO,
    approvePO,
    cancelPO,
    receiveGoods,
    isReceivingGoods,
  } = useProcurement(searchQuery, statusFilter);

  const { data: inventoryItems = [] } = useInventory();

  // Metrics
  const totalPOs = purchaseOrders.length;
  const pendingCount = purchaseOrders.filter((p) => p.status === "SUBMITTED").length;
  const approvedCount = purchaseOrders.filter((p) => p.status === "APPROVED" || p.status === "PARTIALLY_RECEIVED").length;
  const receivedCount = purchaseOrders.filter((p) => p.status === "RECEIVED").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Purchase Orders & Procurement</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Issue purchase orders to suppliers, manage managerial approvals, and receive stock into inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/procurement/suppliers">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5 text-indigo-400" /> Suppliers Roster
            </Button>
          </Link>

          <Can permission="procurement.create">
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Plus className="h-3.5 w-3.5" /> Create Purchase Order
            </Button>
          </Can>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total POs</p>
              <p className="text-xl font-black text-white mt-0.5">{totalPOs}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Pending Approval</p>
              <p className="text-xl font-black text-blue-400 mt-0.5">{pendingCount}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Approved / In Transit</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">{approvedCount}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Truck className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Fully Received</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{receivedCount}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO #, supplier, notes..."
            className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-200 h-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Purchase Orders Table */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Ordered Items</th>
                <th className="p-3.5">Total ($)</th>
                <th className="p-3.5">Order / Delivery Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoadingPOs ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No purchase orders found. Create a new purchase order above.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white text-sm">
                      {po.po_number}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">{po.supplier_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{po.supplier_code}</div>
                    </td>
                    <td className="p-3.5">
                      <POStatusBadge status={po.status} />
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {po.items.map((i) => (
                        <div key={i.id} className="text-[11px]">
                          {i.item_name_snapshot}: <b className="text-white">{i.quantity_received}/{i.quantity_ordered} {i.unit}</b>
                        </div>
                      ))}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      ${po.total_amount}
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-400 font-mono">
                      <div>Issued: {po.order_date || "—"}</div>
                      <div>Expected: {po.expected_delivery_date || "—"}</div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {po.status === "DRAFT" && (
                          <Can permission="procurement.manage">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => submitPO(po.id)}
                              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-7 text-[11px] px-2 gap-1"
                            >
                              <Send className="h-3 w-3" /> Submit
                            </Button>
                          </Can>
                        )}

                        {po.status === "SUBMITTED" && (
                          <Can permission="procurement.approve">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approvePO(po.id)}
                              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-[11px] px-2 gap-1 font-bold"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Approve
                            </Button>
                          </Can>
                        )}

                        {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
                          <Can permission="procurement.receive">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReceivePO(po)}
                              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 text-[11px] px-2 gap-1 font-bold"
                            >
                              <Truck className="h-3 w-3" /> Receive Goods
                            </Button>
                          </Can>
                        )}

                        {(po.status === "DRAFT" || po.status === "SUBMITTED" || po.status === "APPROVED") && (
                          <Can permission="procurement.manage">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelPO({ id: po.id, reason: "Cancelled by manager" })}
                              className="text-slate-500 hover:text-rose-400 h-7 text-[11px] px-1.5"
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <CreatePOModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        suppliers={suppliers}
        inventoryItems={inventoryItems}
        onSubmit={async (values) => {
          await createPO(values);
          setIsCreateOpen(false);
        }}
        isLoading={isCreatingPO}
      />

      <ReceiveGoodsModal
        isOpen={!!selectedReceivePO}
        onClose={() => setSelectedReceivePO(null)}
        purchaseOrder={selectedReceivePO}
        onSubmit={async (poId, values) => {
          await receiveGoods({ id: poId, payload: values });
          setSelectedReceivePO(null);
        }}
        isLoading={isReceivingGoods}
      />
    </div>
  );
};
