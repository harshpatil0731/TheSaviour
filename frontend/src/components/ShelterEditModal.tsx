import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Droplets, 
  Flame, 
  Snowflake, 
  AlertCircle, 
  Loader2, 
  Users 
} from 'lucide-react';
import { Shelter, ShelterStatus, ShelterCapabilities } from '../types';
import { api } from '../services/api';

interface ShelterEditModalProps {
  shelter: Shelter | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Shelter) => void;
}

export const ShelterEditModal: React.FC<ShelterEditModalProps> = ({
  shelter,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !shelter) return null;

  const [neededMeals, setNeededMeals] = useState<number>(shelter.needed_meals);
  const [capacity, setCapacity] = useState<number>(shelter.capacity);
  const [occupancy, setOccupancy] = useState<number>(shelter.current_occupancy);
  const [status, setStatus] = useState<ShelterStatus>(shelter.status);
  const [capabilities, setCapabilities] = useState<ShelterCapabilities>({
    has_water: shelter.capabilities.has_water,
    has_fuel: shelter.capabilities.has_fuel,
    has_refrigeration: shelter.capabilities.has_refrigeration,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (neededMeals < 0) {
      setError('Needed meals demand cannot be negative.');
      return;
    }
    if (capacity <= 0) {
      setError('Capacity must be greater than zero.');
      return;
    }
    if (occupancy < 0) {
      setError('Current occupancy cannot be negative.');
      return;
    }
    if (occupancy > capacity) {
      setError(`Current occupancy (${occupancy}) cannot exceed total capacity (${capacity}).`);
      return;
    }

    setLoading(true);
    try {
      const updated = await api.updateShelter(shelter.id, {
        needed_meals: Number(neededMeals),
        capacity: Number(capacity),
        current_occupancy: Number(occupancy),
        status,
        capabilities,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update shelter.');
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{shelter.name}</h3>
              <p className="text-xs text-slate-400 font-mono">
                {shelter.id} • Update Demand & Operational Capabilities
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
          {/* Status & Meal Demand */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Operational Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShelterStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="OPEN">OPEN</option>
                <option value="AT_CAPACITY">AT_CAPACITY</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Needed Meals Demand <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={neededMeals}
                onChange={(e) => setNeededMeals(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Physical Capacity & Current Occupancy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Total Bed Capacity
              </label>
              <input
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Current Occupancy <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                max={capacity}
                required
                value={occupancy}
                onChange={(e) => setOccupancy(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Operational Capability Toggles */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-300">
              Verified Utility Dependencies & Capabilities
            </label>
            <div className="grid grid-cols-1 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              
              {/* Clean Water */}
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${capabilities.has_water ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Clean Drinking Water</div>
                    <div className="text-[10px] text-slate-400">Required for Infant Formula & Rations</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={capabilities.has_water}
                  onChange={(e) => setCapabilities({ ...capabilities, has_water: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </label>

              {/* Cooking Fuel */}
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${capabilities.has_fuel ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Cooking Fuel (Gas / Stove)</div>
                    <div className="text-[10px] text-slate-400">Required for Raw Food & Ration Kits</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={capabilities.has_fuel}
                  onChange={(e) => setCapabilities({ ...capabilities, has_fuel: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </label>

              {/* Cold Storage */}
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${capabilities.has_refrigeration ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Snowflake className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Cold Chain Storage (2-8°C)</div>
                    <div className="text-[10px] text-slate-400">Required for Refrigerated Vaccines & Insulin</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={capabilities.has_refrigeration}
                  onChange={(e) => setCapabilities({ ...capabilities, has_refrigeration: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </label>

            </div>
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
