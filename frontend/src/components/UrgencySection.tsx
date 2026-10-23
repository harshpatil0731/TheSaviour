import React from 'react';
import { 
  Clock, 
  MapPin, 
  Split, 
  CheckCircle2, 
  Flame, 
  Droplets, 
  Snowflake, 
  ChevronRight
} from 'lucide-react';
import { Donation, UrgencyLevel } from '../types';
import { getAidImage } from '../utils/foodImages';

interface UrgencySectionProps {
  donations: Donation[];
  onViewAll?: () => void;
  onAllocate?: (donation: Donation) => void;
}

export const UrgencySection: React.FC<UrgencySectionProps> = ({ donations, onViewAll, onAllocate }) => {
  const getUrgencyBadge = (level: UrgencyLevel, minutes: number) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EA4B48] text-white text-[11px] font-bold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>CRITICAL · {minutes}m left</span>
          </div>
        );
      case 'HIGH':
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF8A00] text-white text-[11px] font-bold shadow-sm">
            <Clock className="w-3 h-3" />
            <span>URGENT · {minutes}m left</span>
          </div>
        );
      case 'MODERATE':
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2B7FDE] text-white text-[11px] font-semibold">
            <Clock className="w-3 h-3" />
            <span>MODERATE · {minutes}m left</span>
          </div>
        );
      case 'STABLE':
      default:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00B207] text-white text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>STABLE</span>
          </div>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'cooked_meal':
      case 'COOKED_MEALS':
        return { label: 'Fresh Cooked', bg: 'bg-[#EAF8E7] text-[#2C742F] border-[#BDE5BA]' };
      case 'raw_ration_kit':
      case 'RAW_RATIONS':
        return { label: 'Raw Ration Kit', bg: 'bg-[#FFF3E5] text-[#D97706] border-[#FDE3B7]' };
      case 'infant_formula':
      case 'INFANT_FORMULA':
        return { label: 'Infant Formula', bg: 'bg-[#EBF4FE] text-[#2B7FDE] border-[#C6E0FC]' };
      case 'refrigerated_medicine':
      case 'REFRIGERATED_MEDICINE':
        return { label: 'Cold-Chain Care', bg: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]' };
      case 'bakery':
      case 'BAKERY':
        return { label: 'Bakery Produce', bg: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' };
      default:
        return { label: category.replace('_', ' '), bg: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]' };
    }
  };

  return (
    <section className="bg-white border border-[#E6E6E6] rounded-2xl p-6 mb-8 shadow-sm">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-[#E6E6E6]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA4B48] animate-pulse" />
            <h2 className="text-lg font-bold text-[#1A1A1A] tracking-tight">
              Priority Perishable Batches & Spoilage Watch
            </h2>
            <span className="text-[11px] bg-[#FDE8E8] text-[#EA4B48] border border-[#F8B4B4] px-2 py-0.5 rounded-full font-semibold">
              Deadline Protected
            </span>
          </div>
          <p className="text-xs text-[#666666] mt-1 font-normal">
            Real-time safe window tracking. Automated partition ensures 100% zero food wastage across Pune shelters.
          </p>
        </div>
        
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs text-[#00B207] hover:text-[#008A05] font-semibold transition-colors"
          >
            <span>Browse All Inventory</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid of Shopery Product Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {donations.map((batch) => {
          const cat = getCategoryBadge(batch.category);
          const imgSrc = getAidImage(batch.category || batch.item_name);

          return (
            <div
              key={batch.id}
              className="group rounded-xl border border-[#E6E6E6] hover:border-[#00B207] hover:shadow-lg transition-all duration-200 bg-white flex flex-col justify-between overflow-hidden"
            >
              {/* Product Card Top: Image + Badges */}
              <div className="relative h-44 w-full bg-[#F5F5F5] overflow-hidden">
                <img
                  src={imgSrc}
                  alt={batch.item_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Floating Urgency Badge */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  {getUrgencyBadge(batch.urgency_level, batch.safe_window_minutes)}
                </div>

                {/* Floating Category Pill */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md shadow-sm ${cat.bg}`}>
                    {cat.label}
                  </span>
                </div>

                {/* Donor overlay pill */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-white text-[11px]">
                  <span className="truncate font-medium">{batch.donor_name}</span>
                  <span className="text-[10px] text-gray-300 shrink-0 capitalize">{batch.donor_type}</span>
                </div>
              </div>

              {/* Product Card Content */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] line-clamp-1 group-hover:text-[#00B207] transition-colors">
                    {batch.item_name}
                  </h3>

                  {/* Quantity & Unit Indicator */}
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-black text-[#00B207]">
                      {batch.quantity}
                    </span>
                    <span className="text-xs text-[#666666] font-semibold uppercase">
                      {batch.unit} Available
                    </span>
                  </div>

                  {/* Location Info */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#666666]">
                    <MapPin className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                    <span className="truncate">{batch.location.name}</span>
                  </div>

                  {/* Requirements / Compatibility Checklist */}
                  {batch.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {batch.requirements.map((req, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-[#F7F7F8] text-[#4D4D4D] border border-[#E6E6E6] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium"
                        >
                          {req.includes('water') && <Droplets className="w-2.5 h-2.5 text-[#2B7FDE]" />}
                          {req.includes('refrigeration') && <Snowflake className="w-2.5 h-2.5 text-[#7E22CE]" />}
                          {req.includes('dispatch') && <Flame className="w-2.5 h-2.5 text-[#EA4B48]" />}
                          <span>{req.replace('_', ' ')}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Partitioning & Action */}
                <div className="mt-4 pt-3 border-t border-[#F2F2F2] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[#2C742F] font-semibold text-[11px] bg-[#EAF8E7] px-2 py-0.5 rounded">
                    <Split className="w-3 h-3 text-[#00B207]" />
                    <span>Split: {batch.suggested_parcels} parcel{batch.suggested_parcels > 1 ? 's' : ''}</span>
                  </div>

                  {onAllocate ? (
                    <button
                      onClick={() => onAllocate(batch)}
                      className="bg-[#00B207] hover:bg-[#008A05] text-white px-3 py-1 rounded-md text-xs font-semibold transition-colors"
                    >
                      Allocate
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-[#999999]">
                      #{batch.id.slice(-6)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
