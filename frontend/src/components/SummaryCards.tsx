import React from 'react';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  Bike 
} from 'lucide-react';
import { DashboardSummary } from '../types';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      id: 'available-donations',
      title: 'Surplus Food & Aid',
      value: summary.available_donations_count,
      subValue: `${summary.total_meals_available} meals in circulation`,
      icon: <Package className="w-5 h-5 text-[#00B207]" />,
      iconBg: 'bg-[#EAF8E7]',
      badge: 'Ready to Split',
      badgeClass: 'bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]',
    },
    {
      id: 'active-deliveries',
      title: 'Active Dispatches',
      value: summary.active_deliveries_count,
      subValue: 'Live rider in-transit & holds',
      icon: <Truck className="w-5 h-5 text-[#2B7FDE]" />,
      iconBg: 'bg-[#EBF4FE]',
      badge: 'En Route',
      badgeClass: 'bg-[#EBF4FE] text-[#2B7FDE] border border-[#C6E0FC]',
    },
    {
      id: 'urgent-batches',
      title: 'Critical Expiry Batches',
      value: summary.urgent_batches_count,
      subValue: 'Slack < 90 min to spoilage',
      icon: <AlertTriangle className="w-5 h-5 text-[#EA4B48]" />,
      iconBg: 'bg-[#FDE8E8]',
      badge: 'Fast-Track',
      badgeClass: 'bg-[#FDE8E8] text-[#EA4B48] border border-[#F8B4B4] soft-pulse',
    },
    {
      id: 'available-riders',
      title: 'Volunteer Riders',
      value: `${summary.available_riders_count} / ${summary.total_riders_count}`,
      subValue: 'Fleet ready for dispatch',
      icon: <Bike className="w-5 h-5 text-[#FF8A00]" />,
      iconBg: 'bg-[#FFF3E5]',
      badge: 'On Call',
      badgeClass: 'bg-[#FFF3E5] text-[#D97706] border border-[#FDE3B7]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card) => (
        <div
          key={card.id}
          className="relative p-5 rounded-2xl bg-white border border-[#E6E6E6] shadow-sm hover:shadow-md hover:border-[#00B207]/40 transition-all duration-200"
        >
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${card.iconBg} flex items-center justify-center`}>
              {card.icon}
            </div>
            <span className={`text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full ${card.badgeClass}`}>
              {card.badge}
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#808080]">
              {card.title}
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">
                {card.value}
              </span>
            </div>
            <p className="text-xs text-[#666666] mt-1.5 flex items-center gap-1.5 font-medium">
              <span>{card.subValue}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
