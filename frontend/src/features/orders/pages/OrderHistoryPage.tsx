import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "../hooks/useOrders";
import { Order } from "../types/order.types";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { OrderReceiptModal } from "../components/OrderReceiptModal";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

export const OrderHistoryPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const {
    orders,
    meta,
    isLoading,
    cancelOrder,
    completeOrder,
    isCancelling,
    isCompleting,
  } = useOrders({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
  });

  const handleCancel = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this order ticket?")) {
      await cancelOrder(id);
    }
  };

  const handleComplete = async (id: string) => {
    await completeOrder(id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link to="/orders/pos">
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
                Order History & Ticket Ledger
              </h1>
              <p className="text-xs text-slate-400">
                Track active dining floor tickets, historical receipts, and fulfillment status.
              </p>
            </div>
          </div>

          <Link to="/orders/pos">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-lg shadow-blue-600/20"
            >
              Open POS Terminal
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search order # or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 bg-slate-950/60 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 h-8"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Orders</option>
              <option value="PLACED">Placed / Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 text-xs font-mono">
            Loading Orders Ledger...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-300">No orders found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No customer orders match your search or filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Order Number</th>
                  <th className="py-3 px-4 font-semibold">Table / Seating</th>
                  <th className="py-3 px-4 font-semibold">Server</th>
                  <th className="py-3 px-4 font-semibold">Items</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {order.order_number}
                    </td>

                    <td className="py-3 px-4">
                      {order.table_name ? (
                        <span className="font-semibold text-blue-300">
                          Table {order.table_name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Takeaway</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400">{order.created_by_name}</td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-100">
                      ${parseFloat(order.total).toFixed(2)}
                    </td>

                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                      >
                        Receipt
                      </Button>

                      {order.status === "PLACED" && (
                        <>
                          <Can permission="orders.complete">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isCompleting}
                              onClick={() => handleComplete(order.id)}
                              className="h-7 px-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Complete
                            </Button>
                          </Can>

                          <Can permission="orders.cancel">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isCancelling}
                              onClick={() => handleCancel(order.id)}
                              className="h-7 px-2 text-rose-400 hover:bg-rose-500/10 text-xs"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Void
                            </Button>
                          </Can>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {orders.length} of {meta.count} orders
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

      <OrderReceiptModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};
