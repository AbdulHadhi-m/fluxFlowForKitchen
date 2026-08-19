import React, { useState } from "react";
import { useBilling } from "../hooks/useBilling";
import { Bill } from "../types/billing.types";
import { BillStatusBadge } from "../components/BillStatusBadge";
import { ReceiptModal } from "../components/ReceiptModal";
import { PaymentModal } from "../components/PaymentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  ArrowLeft,
  Search,
  Receipt,
  CreditCard,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";

export const BillingHistoryPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);
  const [activePaymentBill, setActivePaymentBill] = useState<Bill | null>(null);

  const {
    bills,
    isLoadingBills,
    processPayment,
    isProcessingPayment,
  } = useBilling(statusFilter, searchQuery);

  const handlePaymentSubmit = async (billId: string, values: any) => {
    const result = await processPayment({ billId, payload: values });
    setActivePaymentBill(null);
    if (result?.data?.bill) {
      setActiveReceiptBill(result.data.bill);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6 flex flex-col justify-between transition-colors duration-200">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link to="/billing">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-400" />
                Invoices & Billing History
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Financial records, settled tenders, and printable tax receipts.
              </p>
            </div>
          </div>

          <Link to="/billing">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5">
              <Receipt className="h-4 w-4" /> Active Cashier Register
            </Button>
          </Link>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill or order #..."
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 pl-9 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-slate-500 mr-1" />
            {[
              { label: "All Statuses", value: "" },
              { label: "Paid", value: "PAID" },
              { label: "Unpaid", value: "FINALIZED" },
              { label: "Partially Paid", value: "PARTIALLY_PAID" },
              { label: "Void", value: "VOID" },
            ].map((tab) => {
              const isSelected = statusFilter === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Bill Number</th>
                  <th className="p-3.5">Order & Table</th>
                  <th className="p-3.5">Grand Total</th>
                  <th className="p-3.5">Paid</th>
                  <th className="p-3.5">Balance</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                {isLoadingBills ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Loading invoice records...
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-200/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{bill.bill_number}</td>
                      <td className="p-3.5 font-sans">
                        <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">{bill.order_number}</span>
                        <span className="text-slate-500 text-[11px] block">
                          {bill.table_name ? `Table ${bill.table_name}` : "Takeaway"}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">₹{bill.grand_total}</td>
                      <td className="p-3.5 text-emerald-400 font-bold">₹{bill.total_paid}</td>
                      <td className="p-3.5">
                        <span className={`font-bold ${parseFloat(bill.balance_due) > 0 ? "text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                          ${bill.balance_due}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans">
                        <BillStatusBadge status={bill.status} />
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(bill.created_at).toLocaleDateString()}{" "}
                        {new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveReceiptBill(bill)}
                            className="h-8 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs gap-1"
                          >
                            <Receipt className="h-3.5 w-3.5" /> Receipt
                          </Button>
                          {parseFloat(bill.balance_due) > 0 && bill.status !== "VOID" && (
                            <Button
                              size="sm"
                              onClick={() => setActivePaymentBill(bill)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1"
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        <ReceiptModal
          isOpen={!!activeReceiptBill}
          onClose={() => setActiveReceiptBill(null)}
          bill={activeReceiptBill}
        />

        <PaymentModal
          isOpen={!!activePaymentBill}
          onClose={() => setActivePaymentBill(null)}
          bill={activePaymentBill}
          onSubmit={handlePaymentSubmit}
          isLoading={isProcessingPayment}
        />
      </div>
    </div>
  );
};
