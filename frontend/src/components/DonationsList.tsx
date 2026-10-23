import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  MapPin, 
  Clock, 
  Split, 
  Plus, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';
import { Donation, Shelter } from '../types';
import { EmptyState } from './EmptyState';
import { DonationAllocateModal } from './DonationAllocateModal';
import { CompatibilityModal } from './CompatibilityModal';
import { getAidImage } from '../utils/foodImages';

interface DonationsListProps {
  donations: Donation[];
  shelters?: Shelter[];
  onOpenCreateModal?: () => void;
  onDonationUpdated?: (updated: Donation) => void;
}

export const DonationsList: React.FC<DonationsListProps> = ({
  donations,
  shelters = [],
  onOpenCreateModal,
  onDonationUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

  // Modal states
  const [allocatingDonation, setAllocatingDonation] = useState<Donation | null>(null);
  const [compatDonation, setCompatDonation] = useState<Donation | null>(null);

  const filtered = donations.filter((d) => {
    const matchesSearch = 
      d.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.location.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = urgencyFilter === 'ALL' || d.urgency_level === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

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
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E6E6] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EAF8E7] rounded-xl text-[#00B207]">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#1A1A1A] tracking-tight">
              Donation Batches & Food Catalog
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]">
              {donations.length} Live Batches
            </span>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Browse all surplus food, grocery packages, and medical supplies registered for zero-waste dispatch.
          </p>
        </div>

        {/* Action Button & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-[#00B207] hover:bg-[#008A05] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#00B207]/25 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register Donation</span>
            </button>
          )}

          {/* Search */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-[#999999] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search item, donor, area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F7F7F8] border border-[#E6E6E6] rounded-xl text-xs text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:border-[#00B207] transition-colors"
            />
          </div>

          {/* Urgency Pill Select */}
          <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-xl border border-[#E6E6E6] text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'STABLE'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setUrgencyFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-colors ${
                  urgencyFilter === lvl
                    ? 'bg-[#00B207] text-white shadow-sm font-semibold'
                    : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Donations */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No donations match your filter"
          description="Try selecting 'ALL' urgency or clearing your search term."
          actionText="Reset filters"
          onAction={() => {
            setSearchTerm('');
            setUrgencyFilter('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((batch) => {
            const remaining = batch.remaining_quantity !== undefined ? batch.remaining_quantity : batch.quantity;
            const remainingPct = Math.round((remaining / batch.quantity) * 100);
            const cat = getCategoryBadge(batch.category);
            const imgSrc = getAidImage(batch.category || batch.item_name);

            return (
              <div
                key={batch.id}
                className="group rounded-2xl border border-[#E6E6E6] bg-white hover:border-[#00B207] hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div>
                  {/* Image container */}
                  <div className="relative h-44 w-full bg-[#F5F5F5] overflow-hidden">
                    <img
                      src={imgSrc}
                      alt={batch.item_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Category Tag */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-sm ${cat.bg}`}>
                        {cat.label}
                      </span>
                    </div>

                    {/* Urgency Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                        batch.urgency_level === 'CRITICAL' ? 'bg-[#EA4B48] text-white' :
                        batch.urgency_level === 'HIGH' ? 'bg-[#FF8A00] text-white' :
                        batch.urgency_level === 'MODERATE' ? 'bg-[#2B7FDE] text-white' :
                        'bg-[#00B207] text-white'
                      }`}>
                        {batch.urgency_level}
                      </span>
                    </div>

                    {/* Donor banner */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-white text-[11px]">
                      <span className="truncate font-medium">{batch.donor_name}</span>
                      <span className="text-[10px] text-gray-300 shrink-0 capitalize">{batch.donor_type}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#00B207] transition-colors line-clamp-1">
                      {batch.item_name}
                    </h3>
                    
                    {/* Total and Remaining Quantities */}
                    <div className="mt-3 p-3 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-[#00B207]">
                            {remaining}
                          </span>
                          <span className="text-xs text-[#666666] font-semibold uppercase">
                            / {batch.quantity} {batch.unit}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#808080]">
                          {remainingPct}% Available
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-[#E6E6E6] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            remainingPct === 0 ? 'bg-gray-400' :
                            remainingPct > 50 ? 'bg-[#00B207]' : 'bg-[#FF8A00]'
                          }`}
                          style={{ width: `${remainingPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 text-[#666666]">
                        <span>Allocation State:</span>
                        <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          batch.status === 'AVAILABLE' ? 'bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]' :
                          batch.status === 'PARTIALLY_ASSIGNED' ? 'bg-[#EBF4FE] text-[#2B7FDE] border border-[#C6E0FC]' :
                          batch.status === 'FULLY_ASSIGNED' ? 'bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]' :
                          'bg-[#F3F4F6] text-[#4B5563]'
                        }`}>
                          {batch.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1.5 text-xs border-t border-[#F2F2F2] pt-3">
                      <div className="flex items-start gap-1.5 text-[#666666]">
                        <MapPin className="w-3.5 h-3.5 text-[#808080] mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{batch.location.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#666666]">
                        <Clock className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                        <span>Safe window: <strong className="text-[#1A1A1A]">{batch.safe_window_minutes} mins</strong></span>
                      </div>
                    </div>

                    {batch.notes && (
                      <p className="text-[11px] text-[#666666] bg-[#F7F7F8] p-2.5 rounded-lg border border-[#E6E6E6] mt-2.5 italic line-clamp-2">
                        "{batch.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-[#F2F2F2] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-[#2C742F] font-semibold text-[11px] bg-[#EAF8E7] px-2 py-0.5 rounded">
                        <Split className="w-3 h-3 text-[#00B207]" />
                        Split into {batch.suggested_parcels} parcels
                      </span>
                      <span className="text-[10px] font-mono text-[#808080]">
                        Ready: {batch.ready_at.slice(11, 16)} UTC
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setAllocatingDonation(batch)}
                        disabled={remaining === 0}
                        className="py-2 px-2 bg-[#00B207] hover:bg-[#008A05] disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Allocate</span>
                      </button>

                      <button
                        onClick={() => setCompatDonation(batch)}
                        className="py-2 px-2 bg-[#F2F7F2] hover:bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00B207]" />
                        <span>Check Safety</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DonationAllocateModal
        donation={allocatingDonation}
        shelters={shelters}
        isOpen={!!allocatingDonation}
        onClose={() => setAllocatingDonation(null)}
        onSuccess={(updated) => {
          if (onDonationUpdated) onDonationUpdated(updated);
        }}
      />

      <CompatibilityModal
        donation={compatDonation}
        isOpen={!!compatDonation}
        onClose={() => setCompatDonation(null)}
      />
    </div>
  );
};
