import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  MapPin, 
  Clock, 
  Split
} from 'lucide-react';
import { Donation } from '../types';
import { EmptyState } from './EmptyState';

interface DonationsListProps {
  donations: Donation[];
}

export const DonationsList: React.FC<DonationsListProps> = ({ donations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Donation Batches Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse all food and medical donations registered in the system with calculated safe arrival windows.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
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
          {filtered.map((batch) => (
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
                
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {batch.quantity}
                  </span>
                  <span className="text-xs text-slate-400 uppercase font-medium">
                    {batch.unit}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-auto font-mono">
                    Status: <span className="text-slate-300 font-semibold">{batch.status}</span>
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs border-t border-slate-800/80 pt-3">
                  <div className="text-slate-300 font-medium">
                    {batch.donor_name}
                    <span className="text-slate-400 font-normal ml-1">({batch.donor_type})</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{batch.location.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Safe window remaining: <strong className="text-slate-200">{batch.safe_window_minutes} mins</strong></span>
                  </div>
                </div>

                {batch.notes && (
                  <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mt-3 italic">
                    "{batch.notes}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                  <Split className="w-3.5 h-3.5" />
                  Split into {batch.suggested_parcels} parcels
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Ready: {batch.ready_at.slice(11, 16)} UTC
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
