import React, { useEffect, useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';
import { Donation, CompatibilityResult } from '../types';
import { api } from '../services/api';

interface CompatibilityModalProps {
  donation: Donation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CompatibilityModal: React.FC<CompatibilityModalProps> = ({
  donation,
  isOpen,
  onClose,
}) => {
  const [results, setResults] = useState<CompatibilityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !donation) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    api.getCompatibleShelters(donation.id)
      .then((data) => {
        if (mounted) setResults(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Failed to check compatibility.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, donation]);

  if (!isOpen || !donation) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6E6E6] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F2F2F2]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#EAF8E7] text-[#00B207] border border-[#BDE5BA]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Aid Compatibility Safety Matrix</h3>
              <p className="text-xs text-[#666666]">
                Deterministic rule evaluation for <strong className="text-[#1A1A1A] font-semibold">{donation.item_name}</strong>
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

        {/* Aid Batch Badge Summary */}
        <div className="mt-4 p-4 bg-[#F8FAF8] rounded-2xl border border-[#E6E6E6] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#666666]">Category:</span>{' '}
            <span className="font-semibold uppercase text-[#1A1A1A]">
              {donation.category.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-[#666666]">Batch Quantity:</span>{' '}
            <span className="font-mono font-bold text-[#00B207]">
              {donation.remaining_quantity ?? donation.quantity} {donation.unit} remaining
            </span>
          </div>
          <div>
            <span className="text-[#666666]">Required Flags:</span>{' '}
            <span className="font-medium text-[#1A1A1A]">
              {donation.requirements.length > 0 ? donation.requirements.join(', ') : 'None (Directly Usable)'}
            </span>
          </div>
        </div>

        {/* Content / Loading / Results */}
        <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#666666] text-xs gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#00B207]" />
              <span>Evaluating shelter utility dependencies and capacity bounds...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#FDE8E8] border border-[#F8B4B4] rounded-2xl text-[#EA4B48] text-xs font-medium">
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#808080]">
              No shelters registered for evaluation.
            </div>
          ) : (
            results.map((res) => (
              <div
                key={res.shelter_id}
                className={`p-4 rounded-2xl border transition-all ${
                  res.is_compatible
                    ? 'bg-white border-[#BDE5BA] hover:border-[#00B207] shadow-sm'
                    : 'bg-[#FFF8F8] border-[#F8B4B4] shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {res.is_compatible ? (
                        <CheckCircle2 className="w-5 h-5 text-[#00B207]" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#EA4B48]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#1A1A1A]">{res.shelter_name}</h4>
                        <span className="text-[10px] font-mono text-[#808080]">{res.shelter_id}</span>
                      </div>
                      
                      {/* Explanatory Reasons */}
                      <div className="mt-1 space-y-1">
                        {res.reasons.map((r, i) => (
                          <p key={i} className={`text-xs ${res.is_compatible ? 'text-[#4D4D4D]' : 'text-[#EA4B48]'}`}>
                            {r}
                          </p>
                        ))}
                      </div>

                      {/* Warnings if any */}
                      {res.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {res.warnings.map((w, i) => (
                            <p key={i} className="text-[11px] text-[#D97706] flex items-center gap-1.5 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{w}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      res.is_compatible
                        ? 'bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]'
                        : 'bg-[#FDE8E8] text-[#EA4B48] border border-[#F8B4B4]'
                    }`}>
                      {res.is_compatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}
                    </span>
                    <div className="text-[11px] text-[#666666] mt-1 font-mono">
                      Max Acceptable: <strong>{res.max_acceptable_quantity}</strong>
                    </div>
                  </div>
                </div>

                {/* Missing Capabilities Chips */}
                {res.missing_capabilities.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#F2F2F2] flex items-center gap-2 text-xs">
                    <span className="text-[#808080] text-[11px]">Lacks required capabilities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {res.missing_capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded-lg bg-[#FDE8E8] border border-[#F8B4B4] text-[#EA4B48] text-[10px] font-medium"
                        >
                          {cap === 'has_water' && 'Missing Clean Water'}
                          {cap === 'has_fuel' && 'Missing Cooking Fuel'}
                          {cap === 'has_refrigeration' && 'Missing Cold Storage'}
                          {cap !== 'has_water' && cap !== 'has_fuel' && cap !== 'has_refrigeration' && cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#F2F2F2] flex items-center justify-between text-xs text-[#666666]">
          <span>Infant formula → water; Rations → fuel + water; Cold medicine → refrigeration</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F2F2F2] hover:bg-[#E6E6E6] text-[#1A1A1A] font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
