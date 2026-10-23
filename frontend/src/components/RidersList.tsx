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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AVAILABLE
          </span>
        );
      case 'EN_ROUTE_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Clock className="w-3 h-3" />
            EN ROUTE PICKUP
          </span>
        );
      case 'EN_ROUTE_DROP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Clock className="w-3 h-3" />
            EN ROUTE DROP
          </span>
        );
      case 'OFFERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-semibold">
            OFFERED
          </span>
        );
      case 'SUSPECT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            HEARTBEAT SILENT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bike className="w-5 h-5 text-emerald-400" />
              Volunteer Two-Wheeler Fleet
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {riders.length} Couriers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of active couriers with adaptive lease telemetry and carrying capacity management.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {['ALL', 'AVAILABLE', 'EN_ROUTE_PICKUP', 'EN_ROUTE_DROP', 'SUSPECT'].map((st) => (
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

      {/* Riders Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No riders found"
          description="No volunteer couriers currently match this status filter."
          actionText="Show all riders"
          onAction={() => setFilter('ALL')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rider) => (
            <div
              key={rider.id}
              className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 font-bold border border-slate-700">
                      {rider.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {rider.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {rider.id}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(rider.status)}
                </div>

                {/* Vehicle & Capacity */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="text-slate-200 font-medium truncate max-w-[160px]">
                      {rider.vehicle_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Max Capacity:</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {rider.capacity_units} units / meals
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Load:</span>
                    <span className="text-slate-300 font-mono">
                      {rider.current_load} units
                    </span>
                  </div>
                </div>

                {/* Reliability Score */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      Reliability Score:
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {Math.round(rider.reliability_score * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full"
                      style={{ width: `${rider.reliability_score * 100}%` }}
                    />
                  </div>
                </div>

                {/* Location and Contact */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-400 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{rider.location.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{rider.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action & Bottom Heartbeat Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1 text-emerald-400/90">
                    <Activity className="w-3 h-3 animate-pulse" />
                    Heartbeat: {rider.last_heartbeat_at.slice(11, 19)} UTC
                  </span>
                  <span>{rider.completed_deliveries} done</span>
                </div>

                <button
                  onClick={() => setEditingRider(rider)}
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
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
