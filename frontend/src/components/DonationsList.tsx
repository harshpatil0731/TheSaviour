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

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              Donation Batches Inventory
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {donations.length} Active Batches
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse all food and medical donations registered in the system with calculated safe arrival windows.
          </p>
        </div>

        {/* Action Button & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register Donation</span>
            </button>
          )}

          {/* Search */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search item, donor, area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Urgency Pill Select */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'STABLE'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setUrgencyFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  urgencyFilter === lvl
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((batch) => {
            const remaining = batch.remaining_quantity !== undefined ? batch.remaining_quantity : batch.quantity;
            const remainingPct = Math.round((remaining / batch.quantity) * 100);

            return (
              <div
                key={batch.id}
                className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {batch.category.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      batch.urgency_level === 'CRITICAL' ? 'bg-rose-950/80 text-rose-400 border-rose-800' :
                      batch.urgency_level === 'HIGH' ? 'bg-amber-950/80 text-amber-400 border-amber-800' :
                      batch.urgency_level === 'MODERATE' ? 'bg-blue-950/80 text-blue-400 border-blue-800' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {batch.urgency_level}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1">
                    {batch.item_name}
                  </h3>
                  
                  {/* Total and Remaining Quantities */}
                  <div className="mt-2.5 p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold text-emerald-400 font-mono">
                          {remaining}
                        </span>
                        <span className="text-xs text-slate-400 uppercase font-medium">
                          / {batch.quantity} {batch.unit}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {remainingPct}% Unallocated
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          remainingPct === 0 ? 'bg-slate-600' :
                          remainingPct > 50 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${remainingPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Status:</span>
                      <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${
                        batch.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        batch.status === 'PARTIALLY_ASSIGNED' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                        batch.status === 'FULLY_ASSIGNED' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {batch.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs border-t border-slate-800/80 pt-3">
                    <div className="text-slate-300 font-medium">
                      {batch.donor_name}
                      <span className="text-slate-400 font-normal ml-1">({batch.donor_type})</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{batch.location.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Safe window remaining: <strong className="text-slate-200">{batch.safe_window_minutes} mins</strong></span>
                    </div>
                  </div>

                  {batch.notes && (
                    <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mt-2.5 italic line-clamp-2">
                      "{batch.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                      <Split className="w-3.5 h-3.5" />
                      Split into {batch.suggested_parcels} parcels
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Ready: {batch.ready_at.slice(11, 16)} UTC
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setAllocatingDonation(batch)}
                      disabled={remaining === 0}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Allocate</span>
                    </button>

                    <button
                      onClick={() => setCompatDonation(batch)}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Compatibility</span>
                    </button>
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
