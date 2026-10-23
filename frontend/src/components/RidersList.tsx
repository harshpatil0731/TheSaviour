import React, { useState } from 'react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Award, 
  Activity, 
  Clock, 
  SlidersHorizontal 
} from 'lucide-react';
import { Rider } from '../types';
import { EmptyState } from './EmptyState';
import { RiderEditModal } from './RiderEditModal';

interface RidersListProps {
  riders: Rider[];
  onRiderUpdated?: (updated: Rider) => void;
}

export const RidersList: React.FC<RidersListProps> = ({ 
  riders,
  onRiderUpdated,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [editingRider, setEditingRider] = useState<Rider | null>(null);

  const filtered = riders.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B207] animate-pulse" />
            AVAILABLE
          </span>
        );
      case 'EN_ROUTE_PICKUP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBF4FE] text-[#2B7FDE] border border-[#C6E0FC] text-[11px] font-bold">
            <Clock className="w-3 h-3" />
            PICKUP ROUTE
          </span>
        );
      case 'EN_ROUTE_DROP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF3E5] text-[#D97706] border border-[#FDE3B7] text-[11px] font-bold">
            <Clock className="w-3 h-3" />
            DROP ROUTE
          </span>
        );
      case 'OFFERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] text-[11px] font-bold">
            OFFERED
          </span>
        );
      case 'SUSPECT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDE8E8] text-[#EA4B48] border border-[#F8B4B4] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4B48] animate-ping" />
            HEARTBEAT SILENT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#4B5563] text-[11px] font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E6E6] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EAF8E7] rounded-xl text-[#00B207]">
              <Bike className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#1A1A1A] tracking-tight">
              Volunteer Two-Wheeler Couriers
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]">
              {riders.length} Active Couriers
            </span>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Real-time tracking of active couriers with adaptive lease telemetry and carrying capacity management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-[#F5F5F5] p-1 rounded-xl border border-[#E6E6E6] text-xs">
          {['ALL', 'AVAILABLE', 'EN_ROUTE_PICKUP', 'EN_ROUTE_DROP', 'SUSPECT'].map((st) => (
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

      {/* Riders Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No riders found"
          description="No volunteer couriers currently match this status filter."
          actionText="Show all riders"
          onAction={() => setFilter('ALL')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((rider) => (
            <div
              key={rider.id}
              className="p-5 bg-white border border-[#E6E6E6] hover:border-[#00B207] rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF8E7] text-[#00B207] flex items-center justify-center font-bold text-base border border-[#BDE5BA]">
                      {rider.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1A1A]">
                        {rider.name}
                      </h3>
                      <span className="text-[11px] text-[#808080] font-mono">
                        {rider.id}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(rider.status)}
                </div>

                {/* Vehicle & Capacity */}
                <div className="bg-[#F8FAF8] p-3 rounded-xl border border-[#E6E6E6] space-y-2 mt-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#666666]">Vehicle:</span>
                    <span className="text-[#1A1A1A] font-semibold truncate max-w-[160px]">
                      {rider.vehicle_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#666666]">Max Capacity:</span>
                    <span className="text-[#00B207] font-bold font-mono">
                      {rider.capacity_units} units / meals
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#666666]">Current Load:</span>
                    <span className="text-[#1A1A1A] font-mono font-medium">
                      {rider.current_load} units
                    </span>
                  </div>
                </div>

                {/* Reliability Score */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#666666] flex items-center gap-1 font-medium">
                      <Award className="w-3.5 h-3.5 text-[#FF8A00]" />
                      Reliability Score:
                    </span>
                    <span className="font-mono font-bold text-[#FF8A00]">
                      {Math.round(rider.reliability_score * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#E6E6E6] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#FF8A00] to-[#00B207] h-1.5 rounded-full"
                      style={{ width: `${rider.reliability_score * 100}%` }}
                    />
                  </div>
                </div>

                {/* Location and Contact */}
                <div className="mt-4 space-y-1.5 text-xs text-[#666666] pt-3 border-t border-[#F2F2F2]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                    <span className="truncate">{rider.location.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                    <span className="font-medium text-[#1A1A1A]">{rider.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action & Bottom Heartbeat Footer */}
              <div className="mt-4 pt-3 border-t border-[#F2F2F2] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-[#808080] font-mono">
                  <span className="flex items-center gap-1 text-[#2C742F]">
                    <Activity className="w-3 h-3 text-[#00B207] animate-pulse" />
                    Heartbeat: {rider.last_heartbeat_at.slice(11, 19)} UTC
                  </span>
                  <span className="font-semibold text-[#1A1A1A]">{rider.completed_deliveries} deliveries</span>
                </div>

                <button
                  onClick={() => setEditingRider(rider)}
                  className="w-full py-2 px-3 bg-[#F2F7F2] hover:bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#00B207]" />
                  <span>Update Availability & Capacity</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rider Edit Modal */}
      <RiderEditModal
        rider={editingRider}
        isOpen={!!editingRider}
        onClose={() => setEditingRider(null)}
        onSuccess={(updated) => {
          if (onRiderUpdated) onRiderUpdated(updated);
        }}
      />
    </div>
  );
};
