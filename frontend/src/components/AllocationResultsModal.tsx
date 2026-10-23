import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Split, 
  Bike, 
  Building2, 
  Package, 
  ArrowRight 
} from 'lucide-react';
import { AutoAllocationResponse } from '../types';

interface AllocationResultsModalProps {
  result: AutoAllocationResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDispatch?: () => void;
}

export const AllocationResultsModal: React.FC<AllocationResultsModalProps> = ({
  result,
  isOpen,
  onClose,
  onViewDispatch,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Intelligent Allocation Results</h3>
              <p className="text-xs text-slate-400">
                Phase 3 Engine • Batch splitting, urgency prioritization, and safety enforcement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Allocated Units</div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
              {result.total_quantity_allocated}
            </div>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Parcels Dispatched</div>
            <div className="text-xl font-extrabold text-cyan-400 font-mono mt-1">
              {result.total_allocations_created}
            </div>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Batches Processed</div>
            <div className="text-xl font-extrabold text-slate-200 font-mono mt-1">
              {result.total_donations_processed}
            </div>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Batches with Remainder</div>
            <div className="text-xl font-extrabold text-amber-400 font-mono mt-1">
              {result.unallocated_donations_remaining}
            </div>
          </div>
        </div>

        {/* Scrollable Result Sections */}
        <div className="mt-5 space-y-5 max-h-[55vh] overflow-y-auto pr-1">
          
          {/* Created Allocations */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Created Allocations & Courier Dispatches ({result.allocations.length})</span>
            </h4>

            {result.allocations.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs text-slate-400 text-center">
                No new allocations were created in this cycle.
              </div>
            ) : (
              <div className="space-y-3">
                {result.allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="p-4 bg-slate-950/80 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                          {alloc.id.split('-').slice(-2).join('-')}
                        </span>
                        <span className="text-xs font-bold text-white">{alloc.donation_item_name}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {alloc.donation_category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-400 font-mono">
                        {alloc.quantity} {alloc.unit}
                      </span>
                    </div>

                    {/* Routing Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                      {/* Origin & Destination */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span><strong>From:</strong> {alloc.donor_name} ({alloc.donor_location})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span><strong>To:</strong> {alloc.shelter_name} ({alloc.shelter_location})</span>
                        </div>
                      </div>

                      {/* Courier & Vehicle */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-cyan-300">
                          <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span><strong>Courier:</strong> {alloc.rider_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <span className="truncate">{alloc.rider_vehicle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-900 text-[11px] text-slate-400 italic">
                      "{alloc.reason}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skipped / Unallocated Batches */}
          {result.skipped_donations.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Unallocated or Partially Allocated Batches ({result.skipped_donations.length})</span>
              </h4>

              <div className="space-y-2.5">
                {result.skipped_donations.map((skip, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-slate-950/60 rounded-xl border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        {skip.item_name}{' '}
                        <span className="text-slate-400 font-normal">({skip.category.replace('_', ' ')})</span>
                      </div>
                      <div className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
                        Reason: {skip.reason}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        {skip.unallocated_quantity} {skip.unit}
                      </span>
                      <div className="text-[10px] text-slate-500">Unallocated</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            All allocations verified against safety invariants and capacity soft holds.
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            {onViewDispatch && (
              <button
                onClick={() => {
                  onClose();
                  onViewDispatch();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span>View in Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
