import React from 'react';
import { 
  Cpu, 
  Play
} from 'lucide-react';

export const SimulationPreview: React.FC = () => {
  const scenarios = [
    {
      title: 'Scenario 1: Tight Expiry Window',
      description: 'Injects 60 meals expiring in 20 minutes with nearest shelter 18 minutes away. Demonstrates immediate feasibility rejection or highest-urgency standby assignment.',
      tag: 'Safety Check',
      color: 'border-rose-500/30 bg-rose-950/20 text-rose-400',
    },
    {
      title: 'Scenario 2: Multi-Rider Parcel Split',
      description: 'Banquet posts 180 hot meals expiring in 75 minutes. Tests automatic generation of 5 courier parcels with soft holds across multiple Pune night shelters.',
      tag: 'Capacity Match',
      color: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    },
    {
      title: 'Scenario 3: Ghost Reservation & Silence',
      description: 'Simulates volunteer courier accepting a parcel and going silent for 15 minutes. Lease manager detects missing heartbeats and triggers automatic reclaim & re-offer.',
      tag: 'Lease Expiry',
      color: 'border-purple-500/30 bg-purple-950/20 text-purple-400',
    },
    {
      title: 'Scenario 4: Shelter Fills Mid-Transit',
      description: 'A courier is en route when citizens fill the shelter. Tests dynamic mid-transit retargeting to the next best feasible shelter via the salvage ladder.',
      tag: 'Rerouting Engine',
      color: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400',
    },
    {
      title: 'Scenario 5: Clean Water Dependency Check',
      description: 'Routes infant formula to shelter with missing water capability. Validates declarative compatibility engine excluding incompatible destination sites.',
      tag: 'Dependency Rule',
      color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Header */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Cpu className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              Chaos & Simulation Panel
            </h2>
            <span className="text-xs bg-purple-950 text-purple-400 border border-purple-800/80 px-2 py-0.5 rounded-full font-mono">
              Evaluator Preview
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Designed for hackathon judges and evaluators to deliberately inject chaos (silence couriers, close shelters, accelerate time) and observe the system recover deterministically.
          </p>
        </div>

        {/* Mock Virtual Clock Controls */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] text-slate-400 font-mono block">Virtual Clock Simulation</span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-400 font-mono text-xs border border-emerald-800">
              1x Realtime
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 text-slate-500 font-mono text-xs border border-slate-800 cursor-not-allowed">
              10x Fast
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 text-slate-500 font-mono text-xs border border-slate-800 cursor-not-allowed">
              60x Fast
            </span>
          </div>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((sc, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl border ${sc.color} flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono uppercase font-bold text-slate-200">
                  {sc.title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                  {sc.tag}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {sc.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px] font-mono text-slate-400">
                Scheduled for Phase 2 Engine integration
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Play className="w-3 h-3" />
                Script Ready
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
