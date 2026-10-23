import React from 'react';
import { 
  Clock, 
  MapPin, 
  Split, 
  CheckCircle2, 
  Flame, 
  Droplets, 
  Snowflake, 
  ExternalLink 
} from 'lucide-react';
import { Donation, UrgencyLevel } from '../types';

interface UrgencySectionProps {
  donations: Donation[];
  onViewAll?: () => void;
}

export const UrgencySection: React.FC<UrgencySectionProps> = ({ donations, onViewAll }) => {
  const getUrgencyBadge = (level: UrgencyLevel, minutes: number) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>CRITICAL ({minutes}m left)</span>
          </div>
        );
      case 'HIGH':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>HIGH ({minutes}m left)</span>
          </div>
        );
      case 'MODERATE':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>MODERATE ({minutes}m left)</span>
          </div>
        );
      case 'STABLE':
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>STABLE</span>
          </div>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'cooked_meal':
        return { label: 'Cooked Meal', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50' };
      case 'raw_ration_kit':
        return { label: 'Raw Ration Kit', color: 'bg-amber-950/60 text-amber-300 border-amber-800/50' };
      case 'infant_formula':
        return { label: 'Infant Formula', color: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50' };
      case 'refrigerated_medicine':
        return { label: 'Cold-Chain Medicine', color: 'bg-purple-950/60 text-purple-300 border-purple-800/50' };
      default:
        return { label: category, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Priority Perishable Batches & Spoilage Watch
            </h2>
            <span className="text-xs bg-rose-950 text-rose-400 border border-rose-800/60 px-2 py-0.5 rounded-full font-mono font-medium">
              Deadline Invariant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time safe window tracking. Batches are automatically partitioned into rider capacity parcels.
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            <span>View all inventory</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {donations.map((batch) => {
          const cat = getCategoryLabel(batch.category);
          return (
            <div
              key={batch.id}
              className={`p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                batch.urgency_level === 'CRITICAL'
                  ? 'bg-gradient-to-br from-rose-950/30 to-slate-900/90 border-rose-500/30 hover:border-rose-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header with Urgency and Category */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${cat.color}`}>
                    {cat.label}
                  </span>
                  {getUrgencyBadge(batch.urgency_level, batch.safe_window_minutes)}
                </div>

                {/* Item Name & Quantity */}
                <h3 className="text-sm font-bold text-slate-100 line-clamp-1">
                  {batch.item_name}
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    {batch.quantity}
                  </span>
                  <span className="text-xs text-slate-400 uppercase font-medium">
                    {batch.unit}
                  </span>
                </div>

                {/* Donor & Location */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>{batch.donor_name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({batch.donor_type})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{batch.location.name}</span>
                  </div>
                </div>

                {/* Requirements / Dependency Rules */}
                {batch.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {batch.requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700/80 px-1.5 py-0.5 rounded flex items-center gap-1"
                      >
                        {req.includes('water') && <Droplets className="w-2.5 h-2.5 text-cyan-400" />}
                        {req.includes('refrigeration') && <Snowflake className="w-2.5 h-2.5 text-purple-400" />}
                        {req.includes('dispatch') && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                        <span>{req.replace('_', ' ')}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Allocation Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                  <Split className="w-3.5 h-3.5" />
                  <span>Split: {batch.suggested_parcels} parcel{batch.suggested_parcels > 1 ? 's' : ''}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  ID: {batch.id.slice(-7)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
