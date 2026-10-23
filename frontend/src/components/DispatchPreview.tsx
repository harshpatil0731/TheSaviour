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
  onToast?: (toast: any) => void;
  isAllocating?: boolean;
}

export const DispatchPreview: React.FC<DispatchPreviewProps> = ({
  allocations = [],
  onTriggerAutoAllocate,
  onAllocationUpdated,
  onToast,
  isAllocating = false,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'pickup' | 'in-transit' | 'deliver' | 'release') => {
    setProcessingId(id);
    setActionError(null);
    try {
      if (action === 'pickup') {
        await api.pickupParcel(id);
        if (onToast) onToast({ id: Date.now().toString(), type: 'success', title: 'Parcel Picked Up', message: 'Courier confirmed physical pickup from donor.' });
      } else if (action === 'in-transit') {
        await api.inTransitParcel(id);
        if (onToast) onToast({ id: Date.now().toString(), type: 'info', title: 'Courier In-Transit', message: 'Courier departed towards destination shelter.' });
      } else if (action === 'deliver') {
        await api.deliverParcel(id);
        if (onToast) onToast({ id: Date.now().toString(), type: 'success', title: 'Parcel Delivered', message: 'Successfully delivered to shelter! Capacity and courier load updated.' });
      } else if (action === 'release') {
        await api.releaseParcel(id);
        if (onToast) onToast({ id: Date.now().toString(), type: 'warning', title: 'Parcel Released', message: 'Parcel voluntarily released back to unallocated inventory.' });
      }
      if (onAllocationUpdated) onAllocationUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
      if (onToast) onToast({ id: Date.now().toString(), type: 'error', title: 'Dispatch Action Failed', message: err.message || 'Action failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ALLOCATED':
        return 'bg-[#EAF8E7] text-[#2C742F] border-[#BDE5BA]';
      case 'CLAIMED':
        return 'bg-[#EBF4FE] text-[#2B7FDE] border-[#C6E0FC]';
      case 'PICKED_UP':
        return 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]';
      case 'IN_TRANSIT':
        return 'bg-[#FFF3E5] text-[#D97706] border-[#FDE3B7]';
      case 'REROUTED':
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] font-bold soft-pulse';
      case 'DELIVERED':
        return 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC] font-bold';
      case 'UNSALVAGEABLE':
        return 'bg-[#FDE8E8] text-[#EA4B48] border-[#F8B4B4] font-bold';
      default:
        return 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-[#EAF8E7] via-white to-[#F8FAF8] border border-[#BDE5BA] rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-[#00B207] text-white rounded-xl shadow-sm shadow-[#00B207]/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#1A1A1A]">
                    Intelligent Dispatch & Parcel Splitting Console
                  </h2>
                  <span className="text-[10px] bg-[#00B207] text-white px-2 py-0.5 rounded-full font-semibold">
                    Live Engine
                  </span>
                </div>
                <p className="text-xs text-[#666666] mt-1 max-w-2xl leading-relaxed">
                  Bulk food batches are automatically partitioned into courier parcels with active lifecycle tracking, courier handovers, and Salvage Ladder rerouting.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {onTriggerAutoAllocate && (
              <button
                onClick={onTriggerAutoAllocate}
                disabled={isAllocating}
                className="px-5 py-2.5 bg-[#00B207] hover:bg-[#008A05] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#00B207]/25 flex items-center gap-2"
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

            <div className="p-3 bg-white border border-[#E6E6E6] rounded-xl text-right shadow-sm">
              <span className="text-[10px] text-[#808080] font-mono block">Feasibility Invariant</span>
              <span className="text-xs font-mono font-bold text-[#2C742F]">
                now + travel + handling ≤ expiry - buffer
              </span>
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-[#FDE8E8] border border-[#F8B4B4] rounded-xl text-xs text-[#EA4B48] flex items-center justify-between font-medium">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-[#EA4B48] hover:text-[#991B1B] font-bold text-sm">×</button>
        </div>
      )}

      {/* Live Dispatched Parcels Section */}
      <div className="bg-white border border-[#E6E6E6] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E6E6]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EAF8E7] rounded-xl text-[#00B207]">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A]">
              Active Courier Allocations & Dispatched Parcels
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]">
              {allocations.length} Active Parcels
            </span>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#666666] space-y-2">
            <Package className="w-10 h-10 text-[#CCCCCC] mx-auto" />
            <div className="font-bold text-[#1A1A1A] text-sm">No parcels currently dispatched</div>
            <p className="max-w-md mx-auto text-[#808080]">
              Click <strong>"Auto-Allocate Aid"</strong> above to run the intelligent allocation engine, match available donation batches, and split parcels across available riders.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {allocations.map((alloc) => {
              const isTerminal = alloc.status === 'DELIVERED' || alloc.status === 'UNSALVAGEABLE';
              const isBusy = processingId === alloc.id;

              return (
                <div
                  key={alloc.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between bg-white shadow-sm hover:shadow-md ${
                    alloc.status === 'REROUTED'
                      ? 'border-[#FF8A00] bg-[#FFFBF5]'
                      : alloc.status === 'UNSALVAGEABLE'
                      ? 'border-[#EA4B48] bg-[#FFF5F5]'
                      : alloc.status === 'DELIVERED'
                      ? 'border-[#00B207] bg-[#F9FCF9]'
                      : 'border-[#E6E6E6] hover:border-[#00B207]'
                  }`}
                >
                  <div>
                    {/* Top Status & ID Bar */}
                    <div className="flex items-center justify-between text-xs mb-2.5 pb-2 border-b border-[#F2F2F2]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#2C742F] font-bold bg-[#EAF8E7] px-2 py-0.5 rounded border border-[#BDE5BA]">
                          {alloc.id.split('-').slice(-2).join('-')}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(alloc.status)}`}>
                          {alloc.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-mono font-black text-[#00B207] text-sm">
                        {alloc.quantity} {alloc.unit}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#1A1A1A] mb-2.5 line-clamp-1">
                      {alloc.donation_item_name}
                    </h4>

                    {/* From / To / Courier Info */}
                    <div className="space-y-1.5 text-xs text-[#4D4D4D]">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                        <span className="truncate"><strong>From:</strong> {alloc.donor_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Building2 className={`w-3.5 h-3.5 shrink-0 ${alloc.original_shelter_name ? 'text-[#FF8A00]' : 'text-[#00B207]'}`} />
                        <div className="truncate">
                          <strong>To:</strong> {alloc.shelter_name}
                          {alloc.original_shelter_name && (
                            <span className="block text-[10px] text-[#D97706] font-medium mt-0.5">
                              (Rerouted from {alloc.original_shelter_name})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[#2B7FDE]">
                        <Bike className="w-3.5 h-3.5 shrink-0" />
                        <div className="truncate">
                          <strong className="text-[#1A1A1A]">Courier:</strong> {alloc.rider_name}
                          {alloc.original_rider_name && (
                            <span className="block text-[10px] text-[#2B7FDE] font-medium mt-0.5">
                              (Handover from {alloc.original_rider_name})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recovery Note Callout */}
                    {alloc.recovery_reason && (
                      <div className={`mt-3 p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                        alloc.status === 'UNSALVAGEABLE'
                          ? 'bg-[#FDE8E8] text-[#EA4B48] border-[#F8B4B4]'
                          : 'bg-[#FFF3E5] text-[#D97706] border-[#FDE3B7]'
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
                  <div className="mt-3.5 pt-3 border-t border-[#F2F2F2] space-y-2">
                    {!isTerminal && (
                      <div className="flex flex-wrap gap-1.5">
                        {(alloc.status === 'ALLOCATED' || alloc.status === 'CLAIMED') && (
                          <button
                            onClick={() => handleAction(alloc.id, 'pickup')}
                            disabled={isBusy}
                            className="px-2.5 py-1.5 bg-[#EBF4FE] hover:bg-[#d9ecfe] text-[#2B7FDE] border border-[#C6E0FC] rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                            <span>Pickup</span>
                          </button>
                        )}

                        {(alloc.status === 'PICKED_UP' || alloc.status === 'REROUTED') && (
                          <button
                            onClick={() => handleAction(alloc.id, 'in-transit')}
                            disabled={isBusy}
                            className="px-2.5 py-1.5 bg-[#FFF3E5] hover:bg-[#fee7cc] text-[#D97706] border border-[#FDE3B7] rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            <span>Depart</span>
                          </button>
                        )}

                        {(alloc.status === 'PICKED_UP' || alloc.status === 'IN_TRANSIT' || alloc.status === 'REROUTED') && (
                          <button
                            onClick={() => handleAction(alloc.id, 'deliver')}
                            disabled={isBusy}
                            className="px-2.5 py-1.5 bg-[#00B207] hover:bg-[#008A05] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50 transition-colors"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>Deliver</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleAction(alloc.id, 'release')}
                          disabled={isBusy}
                          title="Voluntarily release parcel back to unallocated batch"
                          className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#FDE8E8] text-[#808080] hover:text-[#EA4B48] border border-[#E6E6E6] rounded-lg text-[11px] font-medium ml-auto disabled:opacity-50 transition-colors"
                        >
                          Release
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#808080] pt-1">
                      <span>Ref: {alloc.id.slice(0, 14)}...</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: Dynamic Parcel Splitting */}
        <div className="p-5 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-[#EAF8E7] text-[#00B207] flex items-center justify-center font-bold text-sm mb-3 border border-[#BDE5BA]">
            01
          </div>
          <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
            <GitFork className="w-4 h-4 text-[#00B207]" />
            Batch → Parcel Splitting
          </h3>
          <p className="text-xs text-[#666666] mt-2 leading-relaxed">
            When a donor posts 180 meals, one rider cannot transport it all (courier bike cap: 40 meals).
            The allocator creates independent parcels with unique lifecycles, ETAs, and assigned volunteers.
          </p>
          <div className="mt-4 p-2.5 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] font-mono text-xs text-[#2C742F] font-semibold">
            180 meals → [40 + 40 + 40 + 40 + 20]
          </div>
        </div>

        {/* Step 2: Adaptive Slack Leases */}
        <div className="p-5 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-[#EBF4FE] text-[#2B7FDE] flex items-center justify-center font-bold text-sm mb-3 border border-[#C6E0FC]">
            02
          </div>
          <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2B7FDE]" />
            Slack-Based Adaptive Leases
          </h3>
          <p className="text-xs text-[#666666] mt-2 leading-relaxed">
            Eliminates ghost reservations. Claims grant a lease duration proportional to remaining slack.
            Progress-aware heartbeats renew leases only if the courier is actively moving toward the pickup point.
          </p>
          <div className="mt-4 p-2.5 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] font-mono text-xs text-[#2B7FDE] font-semibold">
            lease = clamp(α × slack, 3m, 15m)
          </div>
        </div>

        {/* Step 3: Salvage Ladder Recovery */}
        <div className="p-5 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-[#FFF3E5] text-[#D97706] flex items-center justify-center font-bold text-sm mb-3 border border-[#FDE3B7]">
            03
          </div>
          <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FF8A00]" />
            Salvage Ladder Recovery
          </h3>
          <p className="text-xs text-[#666666] mt-2 leading-relaxed">
            If a shelter closes mid-transit, the engine retargets to the next best feasible shelter.
            If human shelters are full or infeasible, it routes to animal welfare / composting partners.
          </p>
          <div className="mt-4 p-2.5 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] font-mono text-xs text-[#D97706] font-semibold">
            Retarget → Split → Fallback → Unsalvageable
          </div>
        </div>
      </div>

      {/* Operational Guarantee Banner */}
      <div className="p-4 bg-[#EDF2EE] border border-[#D5E4D5] rounded-xl flex items-center justify-between text-xs text-[#2C742F]">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#00B207]" />
          <span>Deterministic allocation engine active: zero-waste parcel partitioning and dependency safety invariants.</span>
        </div>
        <span className="font-semibold text-[11px] bg-white px-2.5 py-1 rounded-full border border-[#BDE5BA] text-[#00B207]">
          Verified Feasibility
        </span>
      </div>
    </div>
  );
};
