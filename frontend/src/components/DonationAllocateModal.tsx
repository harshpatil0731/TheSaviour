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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Allocate Donation Quantity</h3>
              <p className="text-xs text-slate-400">
                Decrement unallocated pool and assign parcel to destination
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

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Batch Item:</span>
              <span className="font-bold text-white">{donation.item_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Batch Size:</span>
              <span className="font-mono text-slate-300">{donation.quantity} {donation.unit}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-900">
              <span className="text-slate-400">Currently Unallocated:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {remaining} {donation.unit}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Quantity to Allocate <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={remaining}
                required
                value={allocateQty}
                onChange={(e) => setAllocateQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setAllocateQty(remaining)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 whitespace-nowrap"
              >
                Max ({remaining})
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Target Destination Shelter (Optional)
            </label>
            <select
              value={selectedShelterId}
              onChange={(e) => setSelectedShelterId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">Unassigned Pool / General Allocation</option>
              {shelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.needed_meals} needed meals • {s.status})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              After allocation, <strong>{Math.max(0, remaining - allocateQty)} {donation.unit}</strong> will remain available.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || remaining === 0}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-950 flex items-center gap-2 disabled:opacity-50"
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
