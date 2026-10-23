import React, { useState } from 'react';
import { 
  X, 
  Split, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Building2 
} from 'lucide-react';
import { Donation, Shelter } from '../types';
import { api } from '../services/api';

interface DonationAllocateModalProps {
  donation: Donation | null;
  shelters: Shelter[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Donation) => void;
}

export const DonationAllocateModal: React.FC<DonationAllocateModalProps> = ({
  donation,
  shelters,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [allocateQty, setAllocateQty] = useState<number>(40);
  const [selectedShelterId, setSelectedShelterId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !donation) return null;

  const remaining = donation.remaining_quantity !== undefined ? donation.remaining_quantity : donation.quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (allocateQty <= 0) {
      setError('Allocated quantity must be greater than zero.');
      return;
    }
    if (allocateQty > remaining) {
      setError(`Cannot allocate ${allocateQty} units. Only ${remaining} unallocated units remain in this batch.`);
      return;
    }

    setLoading(true);
    try {
      const updated = await api.allocateDonation(donation.id, {
        quantity: allocateQty,
        shelter_id: selectedShelterId || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to allocate donation units.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6E6E6] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F2F2F2]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#EAF8E7] text-[#00B207] border border-[#BDE5BA]">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Allocate Donation Quantity</h3>
              <p className="text-xs text-[#666666]">
                Decrement unallocated pool and assign parcel to destination
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

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-[#FDE8E8] border border-[#F8B4B4] rounded-xl flex items-start gap-2 text-[#EA4B48] text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="bg-[#F8FAF8] p-4 rounded-2xl border border-[#E6E6E6] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#666666]">Batch Item:</span>
              <span className="font-bold text-[#1A1A1A]">{donation.item_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#666666]">Total Batch Size:</span>
              <span className="font-mono text-[#1A1A1A]">{donation.quantity} {donation.unit}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#E6E6E6]">
              <span className="text-[#666666]">Currently Unallocated:</span>
              <span className="font-mono font-black text-[#00B207] text-sm">
                {remaining} {donation.unit}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1A1A1A]">
              Quantity to Allocate <span className="text-[#EA4B48]">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={remaining}
                required
                value={allocateQty}
                onChange={(e) => setAllocateQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAF8] border border-[#E6E6E6] rounded-xl text-xs text-[#1A1A1A] font-mono focus:outline-none focus:border-[#00B207] transition-colors"
              />
              <button
                type="button"
                onClick={() => setAllocateQty(remaining)}
                className="px-3 py-2.5 bg-[#F2F7F2] hover:bg-[#EAF8E7] text-[#2C742F] text-xs font-semibold rounded-xl border border-[#BDE5BA] whitespace-nowrap"
              >
                Max ({remaining})
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#00B207]" />
              Target Destination Shelter (Optional)
            </label>
            <select
              value={selectedShelterId}
              onChange={(e) => setSelectedShelterId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAF8] border border-[#E6E6E6] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00B207] transition-colors"
            >
              <option value="">Unassigned Pool / General Allocation</option>
              {shelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.needed_meals} needed meals • {s.status})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-[#EAF8E7] rounded-xl border border-[#BDE5BA] text-[11px] text-[#2C742F] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00B207] shrink-0" />
            <span>
              After allocation, <strong>{Math.max(0, remaining - allocateQty)} {donation.unit}</strong> will remain available.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F2F2F2]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#E6E6E6] text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || remaining === 0}
              className="px-5 py-2.5 rounded-xl bg-[#00B207] hover:bg-[#008A05] text-white text-xs font-bold transition-all shadow-md shadow-[#00B207]/25 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Allocating...</span>
                </>
              ) : (
                <>
                  <Split className="w-4 h-4" />
                  <span>Confirm Allocation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
