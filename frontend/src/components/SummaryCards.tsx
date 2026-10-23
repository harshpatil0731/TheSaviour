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
      title: 'Available Donations',
      value: summary.available_donations_count,
      subValue: `${summary.total_meals_available} meals in circulation`,
      icon: <Package className="w-6 h-6 text-emerald-400" />,
      color: 'from-emerald-500/10 to-emerald-950/20 border-emerald-500/30 text-emerald-400',
      badge: 'Ready for pickup',
      badgeColor: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    },
    {
      id: 'active-deliveries',
      title: 'Active Deliveries',
      value: summary.active_deliveries_count,
      subValue: 'Live rider in-transit & holds',
      icon: <Truck className="w-6 h-6 text-cyan-400" />,
      color: 'from-cyan-500/10 to-cyan-950/20 border-cyan-500/30 text-cyan-400',
      badge: 'En route',
      badgeColor: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60',
    },
    {
      id: 'urgent-batches',
      title: 'Urgent Batches',
      value: summary.urgent_batches_count,
      subValue: 'Slack < 90 min to spoilage',
      icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
      color: 'from-rose-500/10 to-rose-950/20 border-rose-500/30 text-rose-400',
      badge: 'Priority dispatch',
      badgeColor: 'bg-rose-950/60 text-rose-400 border-rose-800/60 animate-pulse',
    },
    {
      id: 'available-riders',
      title: 'Available Riders',
      value: `${summary.available_riders_count} / ${summary.total_riders_count}`,
      subValue: 'Active volunteer fleet ready',
      icon: <Bike className="w-6 h-6 text-amber-400" />,
      color: 'from-amber-500/10 to-amber-950/20 border-amber-500/30 text-amber-400',
      badge: 'Two-wheelers',
      badgeColor: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`relative p-5 rounded-2xl bg-gradient-to-b ${card.color} border backdrop-blur-sm transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-950/50`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              {card.icon}
            </div>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
              {card.badge}
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {card.title}
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {card.value}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{card.subValue}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
