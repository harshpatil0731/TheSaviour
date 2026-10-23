import React from 'react';
import { 
  Radio, 
  GitFork, 
  ShieldCheck, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

export const DispatchPreview: React.FC = () => {
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
                Deterministic Dispatch Engine
              </h2>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono">
                Phase 1 Prototype Interface
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
              TheSaviour treats time, rider capacity, and human unreliability as first-class constraints. 
              Bulk supply is dynamically partitioned into courier-sized parcels backed by two-sided soft locks on shelter capacity.
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-right">
            <span className="text-[10px] text-slate-400 font-mono block">Safety Invariant Check</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              now + travel + handling ≤ expiry - buffer
            </span>
          </div>
        </div>
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
            The allocator creates 5 independent parcels with unique lifecycles, ETAs, and assigned volunteers.
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

      {/* Ready for Phase 2 Banner */}
      <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Core domain entities & in-memory stores are initialized and verified for Phase 2 algorithm execution.</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400 uppercase">Phase 1 Complete</span>
      </div>
    </div>
  );
};
