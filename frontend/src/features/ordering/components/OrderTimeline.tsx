import React from 'react';
import { CheckCircle2, Clock, ChefHat, CheckCircle, XCircle } from 'lucide-react';

interface OrderTimelineProps {
  stage: 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ stage }) => {
  if (stage === 'CANCELLED') {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center my-6">
        <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-rose-400">Order Cancelled</h3>
        <p className="text-xs text-rose-300 mt-1">This order has been voided or cancelled.</p>
      </div>
    );
  }

  const steps = [
    { key: 'PLACED', label: 'Order Placed', icon: Clock, desc: 'Sent to restaurant' },
    { key: 'PREPARING', label: 'Preparing', icon: ChefHat, desc: 'Cooking in kitchen' },
    { key: 'READY', label: 'Ready', icon: CheckCircle2, desc: 'Ready for table / pickup' },
    { key: 'COMPLETED', label: 'Completed', icon: CheckCircle, desc: 'Served & finalized' },
  ];

  const stageOrder = ['PLACED', 'PREPARING', 'READY', 'COMPLETED'];
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="py-6 px-4 bg-slate-950/60 border border-slate-800 rounded-3xl my-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
        {steps.map((step, idx) => {
          const isPassed = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center text-center relative z-10">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-110'
                    : isPassed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-600 border border-slate-800'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span
                className={`text-xs font-bold ${
                  isCurrent ? 'text-amber-400' : isPassed ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">{step.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
