import React, { useState } from 'react';
import { 
  X, 
  Package, 
  MapPin, 
  Clock, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Split 
} from 'lucide-react';
import { Donation, DonationCategory, Location } from '../types';
import { api } from '../services/api';

interface DonationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDonation: Donation) => void;
}

const PUNE_LOCATIONS: { name: string; address: string; lat: number; lng: number }[] = [
  {
    name: 'Koregaon Park North',
    address: 'Lane 5, Koregaon Park, Pune 411001',
    lat: 18.5362,
    lng: 73.8940,
  },
  {
    name: 'Viman Nagar Hub',
    address: 'Symbiosis Road, Viman Nagar, Pune 411014',
    lat: 18.5679,
    lng: 73.9143,
  },
  {
    name: 'Shivajinagar Station Road',
    address: 'FP No. 12, Shivajinagar, Pune 411005',
    lat: 18.5308,
    lng: 73.8475,
  },
  {
    name: 'Hinjewadi Tech Corridor',
    address: 'Phase 2, Hinjewadi Infotech Park, Pune 411057',
    lat: 18.5913,
    lng: 73.7179,
  },
  {
    name: 'Kothrud Depot',
    address: 'Paud Road, Kothrud, Pune 411038',
    lat: 18.5074,
    lng: 73.8077,
  },
  {
    name: 'Pune Camp Cantonment',
    address: 'East Street, Pune Camp, Pune 411001',
    lat: 18.5133,
    lng: 73.8789,
  },
];

export const DonationCreateModal: React.FC<DonationCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<DonationCategory>('cooked_meal');
  const [quantity, setQuantity] = useState<number>(80);
  const [unit, setUnit] = useState('meals');
  const [donorName, setDonorName] = useState('');
  const [donorType, setDonorType] = useState('Restaurant');
  
  // Location state
  const [selectedLocationIdx, setSelectedLocationIdx] = useState<number>(0);
  const [customLocName, setCustomLocName] = useState('');
  const [customLocAddress, setCustomLocAddress] = useState('');
  const [customLat, setCustomLat] = useState('18.5204');
  const [customLng, setCustomLng] = useState('73.8567');

  // Expiry in minutes relative to now
  const [expiryMinutes, setExpiryMinutes] = useState<number>(75);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Derive calculated metrics for live preview
  const suggestedParcels = Math.max(1, Math.ceil(quantity / 40));
  let derivedUrgency = 'STABLE';
  let urgencyColor = 'bg-slate-800 text-slate-300 border-slate-700';
  if (expiryMinutes < 60) {
    derivedUrgency = 'CRITICAL';
    urgencyColor = 'bg-rose-950/80 text-rose-400 border-rose-800';
  } else if (expiryMinutes < 120) {
    derivedUrgency = 'HIGH';
    urgencyColor = 'bg-amber-950/80 text-amber-400 border-amber-800';
  } else if (expiryMinutes < 240) {
    derivedUrgency = 'MODERATE';
    urgencyColor = 'bg-blue-950/80 text-blue-400 border-blue-800';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!donorName.trim()) {
      setError('Donor name is required.');
      return;
    }
    if (quantity <= 0) {
      setError('Donation quantity must be greater than zero.');
      return;
    }
    if (expiryMinutes <= 0) {
      setError('Shelf life window must be at least 1 minute in the future.');
      return;
    }

    let location: Location;
    if (selectedLocationIdx >= 0 && selectedLocationIdx < PUNE_LOCATIONS.length) {
      const locPreset = PUNE_LOCATIONS[selectedLocationIdx];
      location = {
        name: locPreset.name,
        address: locPreset.address,
        latitude: locPreset.lat,
        longitude: locPreset.lng,
      };
    } else {
      const lat = parseFloat(customLat);
      const lng = parseFloat(customLng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setError('Please provide valid latitude (-90 to 90) and longitude (-180 to 180).');
        return;
      }
      if (!customLocName.trim() || !customLocAddress.trim()) {
        setError('Location name and address cannot be empty.');
        return;
      }
      location = {
        name: customLocName.trim(),
        address: customLocAddress.trim(),
        latitude: lat,
        longitude: lng,
      };
    }

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    setLoading(true);
    try {
      const created = await api.createDonation({
        item_name: itemName.trim(),
        category,
        quantity: Number(quantity),
        unit: unit.trim(),
        donor_name: donorName.trim(),
        donor_type: donorType.trim(),
        location,
        expires_at: expiresAt,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create donation batch:', err);
      setError(err?.message || 'Failed to register donation on server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Register New Aid / Donation Batch</h3>
              <p className="text-xs text-slate-400">
                Phase 2 Intake • Validates quantity, dependencies, and arrival feasibility window
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
          <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Item Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Item Description <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Fresh Steamed Rice & Dal Trays"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Aid Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DonationCategory)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="cooked_meal">Cooked Meal</option>
                <option value="raw_ration_kit">Raw Ration Kit</option>
                <option value="infant_formula">Infant Formula</option>
                <option value="refrigerated_medicine">Refrigerated Medicine</option>
                <option value="bakery_produce">Bakery / Produce</option>
              </select>
            </div>
          </div>

          {/* Quantity, Unit & Donor */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Quantity <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Donor Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grand Pune Palace"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Donor Type</label>
              <select
                value={donorType}
                onChange={(e) => setDonorType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="Banquet Hall">Banquet Hall</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Hostel Mess">Hostel Mess</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Corporate Cafeteria">Corporate Cafeteria</option>
                <option value="NGO Partner">NGO Partner</option>
                <option value="Individual">Individual Donor</option>
              </select>
            </div>
          </div>

          {/* Expiry Window Quick Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Safe Window / Shelf Life (Minutes from now)
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {expiryMinutes} mins remaining
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '45m (Critical)', mins: 45 },
                { label: '75m (High Spoilage)', mins: 75 },
                { label: '150m (Moderate)', mins: 150 },
                { label: '360m (Stable/Long)', mins: 360 },
              ].map((p) => (
                <button
                  type="button"
                  key={p.mins}
                  onClick={() => setExpiryMinutes(p.mins)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    expiryMinutes === p.mins
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pickup Location */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Pickup Corridor & Geographic Location
            </label>
            <select
              value={selectedLocationIdx}
              onChange={(e) => setSelectedLocationIdx(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {PUNE_LOCATIONS.map((loc, idx) => (
                <option key={idx} value={idx}>
                  {loc.name} — {loc.address}
                </option>
              ))}
              <option value={999}>Custom Geo-Coordinates...</option>
            </select>

            {selectedLocationIdx === 999 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Location Name"
                  value={customLocName}
                  onChange={(e) => setCustomLocName(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
                <input
                  type="text"
                  placeholder="Full Address"
                  value={customLocAddress}
                  onChange={(e) => setCustomLocAddress(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
                <input
                  type="text"
                  placeholder="Latitude (e.g. 18.5204)"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                />
                <input
                  type="text"
                  placeholder="Longitude (e.g. 73.8567)"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Handling Notes & Constraints</label>
            <input
              type="text"
              placeholder="e.g. Handled in food-grade thermal containers; untouched buffet trays."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Real-time Invariant & Calculated Values Preview */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Assigned Urgency:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${urgencyColor}`}>
                {derivedUrgency}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Split className="w-3.5 h-3.5 text-emerald-400" />
              <span>Suggested Parcels: <strong className="font-mono text-white">{suggestedParcels}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unallocated Remaining: {quantity} {unit}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                  <span>Validating & Registering...</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Register Donation Batch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
