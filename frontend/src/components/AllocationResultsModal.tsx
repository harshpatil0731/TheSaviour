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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6E6E6] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#F2F2F2]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#EAF8E7] text-[#00B207] border border-[#BDE5BA]">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Intelligent Allocation Results</h3>
              <p className="text-xs text-[#666666]">
                Automated batch splitting, urgency prioritization, and safety enforcement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#999999] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F2F2F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-[#F8FAF8] p-3.5 rounded-2xl border border-[#E6E6E6]">
            <div className="text-[10px] text-[#808080] uppercase tracking-wider font-semibold">Allocated Units</div>
            <div className="text-xl font-black text-[#00B207] font-mono mt-1">
              {result.total_quantity_allocated}
            </div>
          </div>
          <div className="bg-[#F8FAF8] p-3.5 rounded-2xl border border-[#E6E6E6]">
            <div className="text-[10px] text-[#808080] uppercase tracking-wider font-semibold">Parcels Dispatched</div>
            <div className="text-xl font-black text-[#2B7FDE] font-mono mt-1">
              {result.total_allocations_created}
            </div>
          </div>
          <div className="bg-[#F8FAF8] p-3.5 rounded-2xl border border-[#E6E6E6]">
            <div className="text-[10px] text-[#808080] uppercase tracking-wider font-semibold">Batches Processed</div>
            <div className="text-xl font-black text-[#1A1A1A] font-mono mt-1">
              {result.total_donations_processed}
            </div>
          </div>
          <div className="bg-[#F8FAF8] p-3.5 rounded-2xl border border-[#E6E6E6]">
            <div className="text-[10px] text-[#808080] uppercase tracking-wider font-semibold">Batches with Remainder</div>
            <div className="text-xl font-black text-[#FF8A00] font-mono mt-1">
              {result.unallocated_donations_remaining}
            </div>
          </div>
        </div>

        {/* Scrollable Result Sections */}
        <div className="mt-5 space-y-5 max-h-[55vh] overflow-y-auto pr-1">
          
          {/* Created Allocations */}
          <div>
            <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <CheckCircle2 className="w-4 h-4 text-[#00B207]" />
              <span>Created Allocations & Courier Dispatches ({result.allocations.length})</span>
            </h4>

            {result.allocations.length === 0 ? (
              <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-[#E6E6E6] text-xs text-[#808080] text-center">
                No new allocations were created in this cycle.
              </div>
            ) : (
              <div className="space-y-3">
                {result.allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="p-4 bg-white rounded-2xl border border-[#BDE5BA] hover:border-[#00B207] hover:shadow-md transition-all shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#F2F2F2]">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-[#EAF8E7] text-[#2C742F] font-mono text-[10px] font-bold border border-[#BDE5BA]">
                          {alloc.id.split('-').slice(-2).join('-')}
                        </span>
                        <span className="text-xs font-bold text-[#1A1A1A]">{alloc.donation_item_name}</span>
                        <span className="text-[10px] font-mono text-[#666666] uppercase px-1.5 py-0.5 rounded bg-[#F5F5F5] border border-[#E6E6E6]">
                          {alloc.donation_category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs font-black text-[#00B207] font-mono">
                        {alloc.quantity} {alloc.unit}
                      </span>
                    </div>

                    {/* Routing Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                      {/* Origin & Destination */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[#4D4D4D]">
                          <Package className="w-3.5 h-3.5 text-[#808080] shrink-0" />
                          <span><strong>From:</strong> {alloc.donor_name} ({alloc.donor_location})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#4D4D4D]">
                          <Building2 className="w-3.5 h-3.5 text-[#00B207] shrink-0" />
                          <span><strong>To:</strong> {alloc.shelter_name} ({alloc.shelter_location})</span>
                        </div>
                      </div>

                      {/* Courier & Vehicle */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[#2B7FDE]">
                          <Bike className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[#1A1A1A]"><strong>Courier:</strong> {alloc.rider_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#808080] text-[11px]">
                          <span className="truncate">{alloc.rider_vehicle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#F2F2F2] text-[11px] text-[#666666] italic">
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
              <h4 className="text-xs font-bold text-[#D97706] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <AlertCircle className="w-4 h-4 text-[#FF8A00]" />
                <span>Unallocated or Partially Allocated Batches ({result.skipped_donations.length})</span>
              </h4>

              <div className="space-y-2.5">
                {result.skipped_donations.map((skip, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-[#FFFBF5] rounded-xl border border-[#FDE3B7] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-[#1A1A1A]">
                        {skip.item_name}{' '}
                        <span className="text-[#808080] font-normal">({skip.category.replace('_', ' ')})</span>
                      </div>
                      <div className="text-[11px] text-[#D97706] mt-0.5 leading-relaxed">
                        Reason: {skip.reason}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-[#FF8A00] text-xs">
                        {skip.unallocated_quantity} {skip.unit}
                      </span>
                      <div className="text-[10px] text-[#808080]">Unallocated</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-[#F2F2F2] flex items-center justify-between gap-3 text-xs">
          <span className="text-[#808080] text-[11px] hidden sm:inline">
            All allocations verified against safety invariants and capacity soft holds.
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            {onViewDispatch && (
              <button
                onClick={() => {
                  onClose();
                  onViewDispatch();
                }}
                className="px-4 py-2 bg-[#00B207] hover:bg-[#008A05] text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>View in Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F2F2F2] hover:bg-[#E6E6E6] text-[#1A1A1A] font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
