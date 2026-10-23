import React, { useState } from 'react';
import { 
  X, 
  Bike, 
  AlertCircle, 
  Loader2, 
  Clock 
} from 'lucide-react';
import { Rider, RiderStatus } from '../types';
import { api } from '../services/api';

interface RiderEditModalProps {
  rider: Rider | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Rider) => void;
}

export const RiderEditModal: React.FC<RiderEditModalProps> = ({
  rider,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !rider) return null;

  const [status, setStatus] = useState<RiderStatus>(rider.status);
  const [capacityUnits, setCapacityUnits] = useState<number>(rider.capacity_units);
  const [currentLoad, setCurrentLoad] = useState<number>(rider.current_load);
  const [isActive, setIsActive] = useState<boolean>(rider.is_active);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (capacityUnits <= 0) {
      setError('Carrying capacity must be greater than zero.');
      return;
    }
    if (currentLoad < 0) {
      setError('Current load cannot be negative.');
      return;
    }
    if (currentLoad > capacityUnits) {
      setError(`Current load (${currentLoad}) cannot exceed carrying capacity (${capacityUnits}).`);
      return;
    }

    setLoading(true);
    try {
      const updated = await api.updateRider(rider.id, {
        status,
        capacity_units: Number(capacityUnits),
        current_load: Number(currentLoad),
        is_active: isActive,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update rider.');
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
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{rider.name}</h3>
              <p className="text-xs text-slate-400 font-mono">
                {rider.id} • {rider.vehicle_type}
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
          {/* Operational Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Volunteer Availability & Dispatch Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RiderStatus)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="AVAILABLE">AVAILABLE (Ready for assignment)</option>
              <option value="OFFERED">OFFERED (Offer pending response)</option>
              <option value="EN_ROUTE_PICKUP">EN_ROUTE_PICKUP (Heading to donor)</option>
              <option value="EN_ROUTE_DROP">EN_ROUTE_DROP (Delivering to shelter)</option>
              <option value="SUSPECT">SUSPECT (Telemetry silent / warning)</option>
              <option value="OFFLINE">OFFLINE (Unavailable)</option>
            </select>
          </div>

          {/* Carrying Capacity & Current Load */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Max Capacity (Units) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={capacityUnits}
                onChange={(e) => setCapacityUnits(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Current Cargo Load <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                max={capacityUnits}
                required
                value={currentLoad}
                onChange={(e) => setCurrentLoad(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Active Volunteer Toggle */}
          <div className="pt-2">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:bg-slate-900/80 transition-colors">
              <div>
                <div className="text-xs font-semibold text-white">Active in Dispatch Pool</div>
                <div className="text-[10px] text-slate-400">Rider can receive automated parcel offers</div>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </label>
          </div>

          {/* Action Buttons */}
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
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-950 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Rider Updates</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
