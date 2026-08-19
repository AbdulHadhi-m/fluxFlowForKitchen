import React, { useState } from "react";
import { useLoyalty } from "../hooks/useLoyalty";
import { LoyaltyAccountsTable } from "../components/LoyaltyAccountsTable";
import { MembershipTiersTable } from "../components/MembershipTiersTable";
import { RewardsCatalogGrid } from "../components/RewardsCatalogGrid";
import { AdjustPointsModal } from "../components/AdjustPointsModal";
import { LoyaltyAccount } from "../types/loyalty.types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Award, Gift, Users, Search } from "lucide-react";

export const LoyaltyDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "TIERS" | "REWARDS">("MEMBERS");
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<LoyaltyAccount | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const {
    accounts,
    isLoadingAccounts,
    tiers,
    isLoadingTiers,
    rewards,
    isLoadingRewards,
    adjustPoints,
    isAdjustingPoints,
  } = useLoyalty(search);

  const handleOpenAdjust = (account: LoyaltyAccount) => {
    setSelectedAccount(account);
    setIsAdjustModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Loyalty, Memberships & Rewards"
        description="Manage customer points balances, membership tier progression, and redeemable reward perks."
        icon={Award}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <Button
          variant={activeTab === "MEMBERS" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("MEMBERS")}
          className={`h-8 px-3 text-xs rounded-lg font-medium gap-1.5 transition-all ${
            activeTab === "MEMBERS"
              ? "bg-emerald-600 text-white font-bold shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Members ({accounts.length})
        </Button>

        <Button
          variant={activeTab === "TIERS" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("TIERS")}
          className={`h-8 px-3 text-xs rounded-lg font-medium gap-1.5 transition-all ${
            activeTab === "TIERS"
              ? "bg-emerald-600 text-white font-bold shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60"
          }`}
        >
          <Award className="h-3.5 w-3.5" /> Membership Tiers ({tiers.length})
        </Button>

        <Button
          variant={activeTab === "REWARDS" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("REWARDS")}
          className={`h-8 px-3 text-xs rounded-lg font-medium gap-1.5 transition-all ${
            activeTab === "REWARDS"
              ? "bg-emerald-600 text-white font-bold shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60"
          }`}
        >
          <Gift className="h-3.5 w-3.5" /> Rewards Catalog ({rewards.length})
        </Button>
      </div>

      {activeTab === "MEMBERS" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member by name or phone..."
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 pl-9 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {isLoadingAccounts ? (
            <LoadingState message="Loading member loyalty accounts..." />
          ) : (
            <LoyaltyAccountsTable
              accounts={accounts}
              onAdjustPoints={handleOpenAdjust}
            />
          )}
        </div>
      )}

      {activeTab === "TIERS" && (
        isLoadingTiers ? (
          <LoadingState message="Loading membership tiers..." />
        ) : (
          <MembershipTiersTable tiers={tiers} />
        )
      )}

      {activeTab === "REWARDS" && (
        isLoadingRewards ? (
          <LoadingState message="Loading rewards catalog..." />
        ) : (
          <RewardsCatalogGrid rewards={rewards} />
        )
      )}

      {/* Adjust Points Modal */}
      <AdjustPointsModal
        isOpen={isAdjustModalOpen}
        account={selectedAccount}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedAccount(null);
        }}
        onSubmit={(accountId, pointsDelta, reason) =>
          adjustPoints({ accountId, pointsDelta, reason })
        }
        isLoading={isAdjustingPoints}
      />
    </div>
  );
};
