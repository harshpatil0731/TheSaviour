import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Droplets, 
  Flame, 
  Snowflake, 
  Users, 
  Settings, 
  PowerOff, 
  Power 
} from 'lucide-react';
import { Shelter } from '../types';
import { EmptyState } from './EmptyState';
import { ShelterEditModal } from './ShelterEditModal';
import { api } from '../services/api';

interface SheltersListProps {
  shelters: Shelter[];
  onShelterUpdated?: (updated: Shelter) => void;
}

export const SheltersList: React.FC<SheltersListProps> = ({ 
  shelters,
  onShelterUpdated,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [editingShelter, setEditingShelter] = useState<Shelter | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = shelters.filter((s) => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  });

  const handleToggleStatus = async (shelter: Shelter) => {
    setTogglingId(shelter.id);
    try {
      let updated: Shelter;
      if (shelter.status === 'CLOSED') {
        updated = await api.openShelter(shelter.id);
      } else {
        updated = await api.closeShelter(shelter.id);
      }
      if (onShelterUpdated) {
        onShelterUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to toggle shelter status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E6E6] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EAF8E7] rounded-xl text-[#00B207]">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#1A1A1A] tracking-tight">
              Community Shelters & Relief Hubs
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]">
              {shelters.length} Facilities
            </span>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Registered night shelters, disaster camps, and care homes declaring verified capabilities and unmet need.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-[#F5F5F5] p-1 rounded-xl border border-[#E6E6E6] text-xs">
          {['ALL', 'OPEN', 'AT_CAPACITY', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                filter === st
                  ? 'bg-[#00B207] text-white shadow-sm font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white'
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shelters.map((shelter) => {
            const occupancyPct = Math.round((shelter.current_occupancy / shelter.capacity) * 100);
            return (
              <div
                key={shelter.id}
                className="p-5 bg-white border border-[#E6E6E6] hover:border-[#00B207] rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-[#1A1A1A]">
                        {shelter.name}
                      </h3>
                      <span className="text-[11px] text-[#808080] font-mono">
                        {shelter.id}
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      shelter.status === 'OPEN'
                        ? 'bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]'
                        : shelter.status === 'AT_CAPACITY'
                        ? 'bg-[#FFF3E5] text-[#D97706] border border-[#FDE3B7]'
                        : 'bg-[#FDE8E8] text-[#EA4B48] border border-[#F8B4B4]'
                    }`}>
                      {shelter.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Occupancy Progress */}
                  <div className="bg-[#F8FAF8] p-3.5 rounded-xl border border-[#E6E6E6] mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#666666] flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#808080]" />
                        Occupancy Capacity:
                      </span>
                      <span className="font-mono text-[#1A1A1A]">
                        <strong>{shelter.current_occupancy}</strong> / {shelter.capacity} spots ({occupancyPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E6E6E6] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          occupancyPct > 90 ? 'bg-[#EA4B48]' : occupancyPct > 70 ? 'bg-[#FF8A00]' : 'bg-[#00B207]'
                        }`}
                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-[#E6E6E6]">
                      <span className="text-[#666666]">Current Needed Meals:</span>
                      <span className="font-mono font-black text-[#00B207] text-sm">
                        {shelter.needed_meals} meals
                      </span>
                    </div>
                  </div>

                  {/* Capability Badges */}
                  <div className="mt-4">
                    <span className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider block mb-2">
                      Verified Capabilities & Dependencies
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Clean Water */}
                      <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${
                        shelter.capabilities.has_water 
                          ? 'bg-[#EBF4FE] border-[#C6E0FC] text-[#2B7FDE]'
                          : 'bg-[#F9FAF9] border-[#E6E6E6] text-[#999999] opacity-70'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                          <Droplets className="w-3.5 h-3.5 text-[#2B7FDE]" />
                          <span>Water</span>
                        </div>
                        <span className="text-[10px] mt-0.5 font-medium">
                          {shelter.capabilities.has_water ? 'Available' : 'Unavailable'}
                        </span>
                      </div>

                      {/* Cooking Fuel */}
                      <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${
                        shelter.capabilities.has_fuel 
                          ? 'bg-[#FFF3E5] border-[#FDE3B7] text-[#D97706]'
                          : 'bg-[#F9FAF9] border-[#E6E6E6] text-[#999999] opacity-70'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                          <Flame className="w-3.5 h-3.5 text-[#FF8A00]" />
                          <span>Fuel</span>
                        </div>
                        <span className="text-[10px] mt-0.5 font-medium">
                          {shelter.capabilities.has_fuel ? 'Available' : 'Unavailable'}
                        </span>
                      </div>

                      {/* Cold Storage */}
                      <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${
                        shelter.capabilities.has_refrigeration 
                          ? 'bg-[#F3E8FF] border-[#E9D5FF] text-[#7E22CE]'
                          : 'bg-[#F9FAF9] border-[#E6E6E6] text-[#999999] opacity-70'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                          <Snowflake className="w-3.5 h-3.5 text-[#7E22CE]" />
                          <span>Cold Chain</span>
                        </div>
                        <span className="text-[10px] mt-0.5 font-medium">
                          {shelter.capabilities.has_refrigeration ? 'Active' : 'No Fridge'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location & Contact */}
                  <div className="mt-4 space-y-1.5 text-xs text-[#666666] pt-3 border-t border-[#F2F2F2]">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                      <span>{shelter.location.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                      <span>Contact: <strong className="text-[#1A1A1A]">{shelter.contact_person}</strong> ({shelter.phone})</span>
                    </div>
                  </div>
                </div>

                {/* Footer & Actions */}
                <div className="mt-4 pt-3 border-t border-[#F2F2F2] space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#666666]">
                    <span className="text-[11px] font-mono">
                      Reserved Holds: <strong className="text-[#1A1A1A]">{shelter.active_holds} units</strong>
                    </span>
                    <span className="text-[11px] text-[#2C742F] font-semibold bg-[#EAF8E7] px-2 py-0.5 rounded">
                      Anti-Overfill Active
                    </span>
                  </div>

                  {/* Phase 2 Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setEditingShelter(shelter)}
                      className="py-2 px-3 bg-[#F2F7F2] hover:bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#00B207]" />
                      <span>Edit Demand & Caps</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(shelter)}
                      disabled={togglingId === shelter.id}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                        shelter.status === 'CLOSED'
                          ? 'bg-[#EAF8E7] border-[#BDE5BA] text-[#2C742F] hover:bg-[#d5f3d1]'
                          : 'bg-[#FDE8E8] border-[#F8B4B4] text-[#EA4B48] hover:bg-[#fbdada]'
                      }`}
                    >
                      {shelter.status === 'CLOSED' ? (
                        <>
                          <Power className="w-3.5 h-3.5" />
                          <span>Reopen Shelter</span>
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-3.5 h-3.5" />
                          <span>Close Shelter</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shelter Edit Modal */}
      <ShelterEditModal
        shelter={editingShelter}
        isOpen={!!editingShelter}
        onClose={() => setEditingShelter(null)}
        onSuccess={(updated) => {
          if (onShelterUpdated) onShelterUpdated(updated);
        }}
      />
    </div>
  );
};
