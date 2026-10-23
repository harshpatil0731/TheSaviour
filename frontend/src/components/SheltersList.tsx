import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Droplets, 
  Flame, 
  Snowflake, 
  Users 
} from 'lucide-react';
import { Shelter } from '../types';
import { EmptyState } from './EmptyState';

interface SheltersListProps {
  shelters: Shelter[];
}

export const SheltersList: React.FC<SheltersListProps> = ({ shelters }) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = shelters.filter((s) => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Shelters & Emergency Relief Camps
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registered night shelters, flood relief centers, and care homes declaring verified capabilities and unmet need.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {['ALL', 'OPEN', 'AT_CAPACITY', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Shelters Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No shelters found"
          description="No shelters currently match this status filter."
          actionText="Show all shelters"
          onAction={() => setFilter('ALL')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shelters.map((shelter) => {
            const occupancyPct = Math.round((shelter.current_occupancy / shelter.capacity) * 100);
            return (
              <div
                key={shelter.id}
                className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {shelter.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {shelter.id}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      shelter.status === 'OPEN'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}>
                      {shelter.status}
                    </span>
                  </div>

                  {/* Occupancy Progress */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Occupancy:
                      </span>
                      <span className="font-mono text-slate-200">
                        <strong>{shelter.current_occupancy}</strong> / {shelter.capacity} spots ({occupancyPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          occupancyPct > 90 ? 'bg-rose-500' : occupancyPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-800/60">
                      <span className="text-slate-400">Current Needed Meals:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {shelter.needed_meals} meals
                      </span>
                    </div>
                  </div>

                  {/* Capability Badges */}
                  <div className="mt-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Verified Capabilities & Dependencies
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Clean Water */}
                      <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${
                        shelter.capabilities.has_water 
                          ? 'bg-cyan-950/30 border-cyan-800/50 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-medium">
                          <Droplets className="w-3 h-3 text-cyan-400" />
                          <span>Water</span>
                        </div>
                        <span className="text-[9px] mt-0.5 font-mono">
                          {shelter.capabilities.has_water ? 'Verified' : 'Unavailable'}
                        </span>
                      </div>

                      {/* Cooking Fuel */}
                      <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${
                        shelter.capabilities.has_fuel 
                          ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-medium">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Fuel</span>
                        </div>
                        <span className="text-[9px] mt-0.5 font-mono">
                          {shelter.capabilities.has_fuel ? 'Verified' : 'Unavailable'}
                        </span>
                      </div>

                      {/* Cold Storage */}
                      <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${
                        shelter.capabilities.has_refrigeration 
                          ? 'bg-purple-950/30 border-purple-800/50 text-purple-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-medium">
                          <Snowflake className="w-3 h-3 text-purple-400" />
                          <span>Cold Chain</span>
                        </div>
                        <span className="text-[9px] mt-0.5 font-mono">
                          {shelter.capabilities.has_refrigeration ? 'Active' : 'No Fridge'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location & Contact */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-400 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{shelter.location.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Contact: {shelter.contact_person} ({shelter.phone})</span>
                    </div>
                  </div>
                </div>

                {/* Footer Hold Status */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] font-mono">
                    Soft Holds: <strong className="text-white">{shelter.active_holds} units reserved</strong>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Protection: Anti-Overfill
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
