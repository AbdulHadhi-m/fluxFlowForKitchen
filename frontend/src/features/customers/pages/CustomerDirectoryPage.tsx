import React, { useState } from "react";
import { useCustomers } from "../hooks/useCustomers";
import { CustomerListTable } from "../components/CustomerListTable";
import { CreateCustomerModal } from "../components/CreateCustomerModal";
import { CRMStatsCards } from "../components/CRMStatsCards";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Users, UserPlus, Search } from "lucide-react";

export const CustomerDirectoryPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    customers,
    isLoadingCustomers,
    analytics,
    createCustomer,
    isCreatingCustomer,
  } = useCustomers(search);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Customer Directory & CRM"
        description="Manage guest profiles, dining history, preferences, and customer loyalty foundation."
        icon={Users}
        actions={
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Customer
          </Button>
        }
      />

      {/* CRM Analytics Overview */}
      <CRMStatsCards analytics={analytics} />

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 pl-9 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Customers List */}
      {isLoadingCustomers ? (
        <LoadingState message="Loading customer directory..." />
      ) : (
        <CustomerListTable customers={customers} />
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createCustomer}
        isLoading={isCreatingCustomer}
      />
    </div>
  );
};
