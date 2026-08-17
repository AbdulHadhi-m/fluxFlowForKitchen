import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { useCampaigns, useSegments, usePromotions } from "../hooks/useMarketing";
import { CampaignList } from "../components/CampaignList";
import { CreateCampaignModal } from "../components/CreateCampaignModal";

export const CampaignsPage: React.FC = () => {
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: segments } = useSegments();
  const { data: promotions } = usePromotions();

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/marketing"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Send className="h-5 w-5 text-cyan-400" />
            <span>Marketing Campaigns</span>
          </h1>
          <p className="text-xs text-slate-400">Launch personalized in-app, SMS, and email marketing broadcasts</p>
        </div>
      </div>

      <CampaignList
        campaigns={campaigns || []}
        isLoading={isLoading}
        onCreateCampaign={() => setIsModalOpen(true)}
      />

      <CreateCampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        segments={segments || []}
        promotions={promotions || []}
      />
    </div>
  );
};
