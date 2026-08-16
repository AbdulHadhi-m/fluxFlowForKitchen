import React, { useState } from "react";
import { useGiftCards } from "../hooks/useGiftCards";
import { GiftCardsTable } from "../components/GiftCardsTable";
import { IssueGiftCardModal } from "../components/IssueGiftCardModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { CreditCard, PlusCircle } from "lucide-react";

export const GiftCardsPage: React.FC = () => {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  const {
    giftCards,
    isLoadingGiftCards,
    issueGiftCard,
    isIssuingGiftCard,
  } = useGiftCards();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Gift Cards Management"
        description="Issue prepaid gift cards, track active stored value balances, and review transaction history."
        icon={CreditCard}
        actions={
          <Button
            size="sm"
            onClick={() => setIsIssueModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Issue Gift Card
          </Button>
        }
      />

      {isLoadingGiftCards ? (
        <LoadingState message="Loading gift cards inventory..." />
      ) : (
        <GiftCardsTable giftCards={giftCards} />
      )}

      {/* Issue Modal */}
      <IssueGiftCardModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSubmit={issueGiftCard}
        isLoading={isIssuingGiftCard}
      />
    </div>
  );
};
