import React, { useState } from 'react';
import { 
  Radio, 
  GitFork, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Play, 
  Loader2, 
  Package, 
  Building2, 
  Bike, 
  Layers,
  AlertTriangle,
  Send
} from 'lucide-react';
import { Allocation } from '../types';
import { api } from '../services/api';

interface DispatchPreviewProps {
  allocations?: Allocation[];
  onTriggerAutoAllocate?: () => void;
  onAllocationUpdated?: () => void;
  isAllocating?: boolean;
}

export const DispatchPreview: React.FC<DispatchPreviewProps> = ({
  allocations = [],
  onTriggerAutoAllocate,
  onAllocationUpdated,
  isAllocating = false,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'pickup' | 'in-transit' | 'deliver' | 'release') => {
    setProcessingId(id);
    setActionError(null);
    try {
      if (action === 'pickup') await api.pickupParcel(id);
      else if (action === 'in-transit') await api.inTransitParcel(id);
      else if (action === 'deliver') await api.deliverParcel(id);
      else if (action === 'release') await api.releaseParcel(id);
      if (onAllocationUpdated) onAllocationUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ALLOCATED':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
      case 'CLAIMED':
        return 'bg-teal-950/80 text-teal-300 border-teal-800/80';
      case 'PICKED_UP':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';
      case 'IN_TRANSIT':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/80';
      case 'REROUTED':
        return 'bg-amber-950 text-amber-300 border-amber-600 font-bold animate-pulse';
      case 'DELIVERED':
        return 'bg-green-950 text-green-300 border-green-800 font-bold';
      case 'UNSALVAGEABLE':
        return 'bg-rose-950 text-rose-300 border-rose-800 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-lg font-bold text-white">
                Intelligent Dispatch & Parcel Splitting Console
              </h2>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                Phase 5 Active Recovery
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
              TheSaviour treats time, courier limits, and shelter dependencies as first-class constraints. 
              Bulk donations are split into parcels with active lifecycle tracking, courier handovers, and Salvage Ladder rerouting.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {onTriggerAutoAllocate && (
              <button
                onClick={onTriggerAutoAllocate}
                disabled={isAllocating}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center gap-2"
              >
                {isAllocating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Allocating Fleet...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Auto-Allocate Aid</span>
                  </>
                )}
              </button>
            )}

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-right">
              <span className="text-[10px] text-slate-400 font-mono block">Safety Invariant Check</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                now + travel + handling ≤ expiry - buffer
              </span>
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white font-bold">×</button>
        </div>
      )}

      {/* Live Dispatched Parcels Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Active Courier Allocations & Dispatched Parcels
            </h3>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {allocations.length} Tracked
            </span>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-semibold text-slate-300">No parcels currently dispatched</div>
            <p className="max-w-md mx-auto text-slate-500">
              Click <strong>"Auto-Allocate Aid"</strong> above to run the intelligent allocation engine, match available donation batches, and split parcels across available riders.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
            {allocations.map((alloc) => {
              const isTerminal = alloc.status === 'DELIVERED' || alloc.status === 'UNSALVAGEABLE';
              const isBusy = processingId === alloc.id;

              return (
                <div
                  key={alloc.id}
                  className={`p-4 bg-slate-950/80 rounded-2xl border transition-all flex flex-col justify-between ${
                    alloc.status === 'REROUTED'
                      ? 'border-amber-500/50 shadow-lg shadow-amber-950/30'
                      : alloc.status === 'UNSALVAGEABLE'
                      ? 'border-rose-500/40 bg-rose-950/10'
                      : alloc.status === 'DELIVERED'
                      ? 'border-green-500/30 opacity-90'
                      : 'border-emerald-500/20 hover:border-emerald-500/40'
                  }`}
                >
                  <div>
                    {/* Top Status & ID Bar */}
                    <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          {alloc.id.split('-').slice(-2).join('-')}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusBadge(alloc.status)}`}>
                          {alloc.status}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-300 text-xs">
                        {alloc.quantity} {alloc.unit}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-2">
                      {alloc.donation_item_name}
                    </h4>

                    {/* From / To / Courier Info */}
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate"><strong>From:</strong> {alloc.donor_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Building2 className={`w-3.5 h-3.5 shrink-0 ${alloc.original_shelter_name ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <div className="truncate">
                          <strong>To:</strong> {alloc.shelter_name}
                          {alloc.original_shelter_name && (
                            <span className="block text-[10px] text-amber-300 font-mono mt-0.5">
                              (Rerouted from {alloc.original_shelter_name})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-cyan-300">
                        <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <div className="truncate">
                          <strong>Courier:</strong> {alloc.rider_name}
                          {alloc.original_rider_name && (
                            <span className="block text-[10px] text-cyan-400 font-mono mt-0.5">
                              (Handover from {alloc.original_rider_name})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recovery Note Callout */}
                    {alloc.recovery_reason && (
                      <div className={`mt-2.5 p-2 rounded-lg border text-[11px] leading-relaxed font-mono ${
                        alloc.status === 'UNSALVAGEABLE'
                          ? 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                          : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                      }`}>
                        <div className="flex items-center gap-1 font-bold text-[10px] uppercase mb-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Audit Recovery Event</span>
                        </div>
                        {alloc.recovery_reason}
                      </div>
                    )}
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-900 space-y-2">
                    {!isTerminal && (
                      <div className="flex flex-wrap gap-1.5">
                        {(alloc.status === 'ALLOCATED' || alloc.status === 'CLAIMED') && (
                          <button
                            onClick={() => handleAction(alloc.id, 'pickup')}
                            disabled={isBusy}
                            className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/60 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                            <span>Pickup</span>
                          </button>
                        )}

                        {(alloc.status === 'PICKED_UP' || alloc.status === 'REROUTED') && (
                          <button
                            onClick={() => handleAction(alloc.id, 'in-transit')}
                            disabled={isBusy}
                            className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700/60 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            <span>Depart</span>
                          </button>
                        )}

                        {(alloc.status === 'PICKED_UP' || alloc.status === 'IN_TRANSIT' || alloc.status === 'REROUTED') && (
                          <button
                            onClick={() => handleAction(alloc.id, 'deliver')}
                            disabled={isBusy}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>Deliver</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleAction(alloc.id, 'release')}
                          disabled={isBusy}
                          title="Voluntarily release parcel back to unallocated batch"
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-lg text-[11px] font-medium ml-auto disabled:opacity-50"
                        >
                          Release
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                      <span>Ref: {alloc.id.slice(0, 15)}...</span>
                      <span>{alloc.created_at.slice(11, 19)} UTC</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 Step Concept Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1: Dynamic Parcel Splitting */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center font-bold text-xs mb-3 border border-emerald-800/60">
            01
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitFork className="w-4 h-4 text-emerald-400" />
            Batch → Parcel Splitting
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            When a donor posts 180 meals, one rider cannot transport it all (max capacity 40 meals).
            The allocator creates independent parcels with unique lifecycles, ETAs, and assigned volunteers.
          </p>
          <div className="mt-4 p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300">
            180 meals → [40 + 40 + 40 + 40 + 20]
          </div>
        </div>

        {/* Step 2: Adaptive Slack Leases */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 text-cyan-400 flex items-center justify-center font-bold text-xs mb-3 border border-cyan-800/60">
            02
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Slack-Based Adaptive Leases
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Eliminates ghost reservations. Claims grant a lease duration proportional to remaining slack.
            Progress-aware heartbeats renew leases only if the courier is actively moving toward the pickup point.
          </p>
          <div className="mt-4 p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-cyan-300">
            lease = clamp(α × slack, 3m, 15m)
          </div>
        </div>

        {/* Step 3: Salvage Ladder Recovery */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center font-bold text-xs mb-3 border border-amber-800/60">
            03
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Salvage Ladder Recovery
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            If a shelter closes mid-transit, the engine retargets to the next best feasible shelter.
            If human shelters are full or infeasible, it routes to animal welfare / composting partners.
          </p>
          <div className="mt-4 p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-amber-300">
            Retarget → Split → Fallback → Unsalvageable
          </div>
        </div>
      </div>

      {/* Operational Guarantee Banner */}
      <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Deterministic allocation engine active: zero-waste parcel partitioning and dependency safety invariants.</span>
        </div>
        <span className="font-mono text-[10px] text-emerald-400 uppercase font-semibold">Phase 3 Complete</span>
      </div>
    </div>
  );
};
