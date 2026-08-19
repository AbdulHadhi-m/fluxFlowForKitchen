import React, { useState } from "react";
import { useBilling } from "../hooks/useBilling";
import { Bill } from "../types/billing.types";
import { CreateBillModal } from "../components/CreateBillModal";
import { PaymentModal } from "../components/PaymentModal";
import { ReceiptModal } from "../components/ReceiptModal";
import { BillStatusBadge } from "../components/BillStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  CreditCard,
  Plus,
  ArrowLeft,
  FileText,
  Clock,
  Ban,
  DollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";

export const BillingDashboardPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderIdForBill, setSelectedOrderIdForBill] = useState<string | undefined>();
  const [activePaymentBill, setActivePaymentBill] = useState<Bill | null>(null);
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

  const {
    bills,
    isLoadingBills,
    eligibleOrders,
    isLoadingEligibleOrders,
    createBill,
    isCreatingBill,
    processPayment,
    isProcessingPayment,
    voidBill,
  } = useBilling();

  const handleOpenCreateForOrder = (orderId: string) => {
    setSelectedOrderIdForBill(orderId);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (values: any) => {
    await createBill(values);
    setIsCreateModalOpen(false);
  };

  const handlePaymentSubmit = async (billId: string, values: any) => {
    const result = await processPayment({ billId, payload: values });
    setActivePaymentBill(null);
    if (result?.data?.bill) {
      setActiveReceiptBill(result.data.bill);
    }
  };

  const unpaidBills = bills.filter((b) => b.status === "FINALIZED" || b.status === "PARTIALLY_PAID");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6 flex flex-col justify-between transition-colors duration-200">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-6 w-6 text-emerald-400" />
                POS Billing & Cashier Register
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate invoices, apply discounts, and process customer split payments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/billing/history">
              <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs gap-1.5">
                <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Invoices & History
              </Button>
            </Link>
            <Button
              onClick={() => {
                setSelectedOrderIdForBill(undefined);
                setIsCreateModalOpen(true);
              }}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4" /> Create Bill
            </Button>
          </div>
        </div>

        {/* Two-Column Cashier Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Left Column: Orders Awaiting Bill Generation */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> Unbilled Active Orders ({eligibleOrders.length})
              </h2>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
              {isLoadingEligibleOrders ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading eligible orders...</div>
              ) : eligibleOrders.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-100/70 dark:bg-slate-900/30 text-slate-500 text-xs">
                  All active orders are billed.
                </div>
              ) : (
                eligibleOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{ord.order_number}</span>
                        <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-0">
                          {ord.table_name ? `Table ${ord.table_name}` : "Takeaway"}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {ord.items.length} {ord.items.length === 1 ? "Item" : "Items"} &bull; Total:{" "}
                        <b className="text-emerald-400">${ord.total}</b>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenCreateForOrder(ord.id)}
                      className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold gap-1"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Bill
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Active Bills & Payment Desk */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Pending Bills & Settlement ({unpaidBills.length})
              </h2>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
              {isLoadingBills ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading billing register...</div>
              ) : unpaidBills.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-100/70 dark:bg-slate-900/30 text-slate-500 text-xs">
                  No unpaid bills in register.
                </div>
              ) : (
                unpaidBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 dark:text-white text-base">{bill.bill_number}</span>
                          <BillStatusBadge status={bill.status} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Order: <b className="text-slate-700 dark:text-slate-200">{bill.order_number}</b> &bull;{" "}
                          {bill.table_name ? `Table ${bill.table_name}` : "Takeaway"}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Balance Due</div>
                        <div className="text-lg font-black text-amber-400">${bill.balance_due}</div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                      <div>Subtotal: ${bill.subtotal}</div>
                      <div>Tax: +${bill.tax_amount}</div>
                      <div>Total: <b className="text-slate-900 dark:text-white">${bill.grand_total}</b></div>
                      <div>Paid: <b className="text-emerald-400">${bill.total_paid}</b></div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => voidBill({ billId: bill.id })}
                        className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs gap-1"
                      >
                        <Ban className="h-3.5 w-3.5" /> Void
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveReceiptBill(bill)}
                        className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs gap-1"
                      >
                        <Receipt className="h-3.5 w-3.5" /> Receipt
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setActivePaymentBill(bill)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Pay Balance (${bill.balance_due})
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <CreateBillModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          orders={eligibleOrders}
          selectedOrderId={selectedOrderIdForBill}
          onSubmit={handleCreateSubmit}
          isLoading={isCreatingBill}
        />

        <PaymentModal
          isOpen={!!activePaymentBill}
          onClose={() => setActivePaymentBill(null)}
          bill={activePaymentBill}
          onSubmit={handlePaymentSubmit}
          isLoading={isProcessingPayment}
        />

        <ReceiptModal
          isOpen={!!activeReceiptBill}
          onClose={() => setActiveReceiptBill(null)}
          bill={activeReceiptBill}
        />
      </div>
    </div>
  );
};
