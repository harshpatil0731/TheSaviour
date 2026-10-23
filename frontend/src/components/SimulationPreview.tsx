import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  Loader2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Bike, 
  Building2, 
  Zap, 
  ShieldAlert, 
  Radio 
} from 'lucide-react';
import { Rider, Shelter, ScenarioExecutionResponse, AllocationRecoveryResult } from '../types';
import { api } from '../services/api';

interface SimulationPreviewProps {
  riders?: Rider[];
  shelters?: Shelter[];
  onStateMutated?: () => void;
  onToast?: (toast: any) => void;
}

export const SimulationPreview: React.FC<SimulationPreviewProps> = ({
  riders = [],
  shelters = [],
  onStateMutated,
  onToast,
}) => {
  const [selectedRiderId, setSelectedRiderId] = useState<string>(riders[0]?.id || '');
  const [selectedShelterId, setSelectedShelterId] = useState<string>(shelters[0]?.id || '');
  const [executingScenario, setExecutingScenario] = useState<string | null>(null);
  const [executingChaos, setExecutingChaos] = useState<string | null>(null);
  const [lastScenarioResult, setLastScenarioResult] = useState<ScenarioExecutionResponse | null>(null);
  const [chaosMessage, setChaosMessage] = useState<string | null>(null);
  const [chaosRecoveryList, setChaosRecoveryList] = useState<AllocationRecoveryResult[]>([]);
  const [clockSpeed, setClockSpeed] = useState<number>(1);

  // Synchronize dropdown selections when fleet or shelters update
  React.useEffect(() => {
    if ((!selectedRiderId || !riders.some((r) => r.id === selectedRiderId)) && riders.length > 0) {
      setSelectedRiderId(riders[0].id);
    }
  }, [riders, selectedRiderId]);

  React.useEffect(() => {
    if ((!selectedShelterId || !shelters.some((s) => s.id === selectedShelterId)) && shelters.length > 0) {
      setSelectedShelterId(shelters[0].id);
    }
  }, [shelters, selectedShelterId]);

  const scenarios = [
    {
      id: 'scenario-1-tight-expiry',
      title: 'Scenario 1: Tight Expiry Window',
      description: 'Injects 60 meals expiring in 20 minutes with nearest shelter 18 minutes away. Evaluates urgent batches against fleet ETA constraints.',
      tag: 'Urgency Priority',
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
      cardBorder: 'border-rose-500/30 bg-rose-950/10',
    },
    {
      id: 'scenario-2-batch-split',
      title: 'Scenario 2: Multi-Rider Parcel Split',
      description: 'Banquet posts 180 hot meals expiring in 75 minutes. Tests automatic generation of courier parcels with capacity soft holds.',
      tag: 'Batch Splitting',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
      cardBorder: 'border-amber-500/30 bg-amber-950/10',
    },
    {
      id: 'scenario-3-ghost-rider',
      title: 'Scenario 3: Ghost Courier & Handover',
      description: 'Allocates fleet, then simulates courier failing heartbeats and going silent. Demonstrates courier marked SUSPECT and parcel handover.',
      tag: 'Courier Recovery',
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
      cardBorder: 'border-purple-500/30 bg-purple-950/10',
    },
    {
      id: 'scenario-4-shelter-fill',
      title: 'Scenario 4: Shelter Fills Mid-Transit',
      description: 'A courier is en route when citizen walk-ins fill the shelter. Tests dynamic mid-transit retargeting via the Salvage Ladder.',
      tag: 'Salvage Ladder',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      cardBorder: 'border-cyan-500/30 bg-cyan-950/10',
    },
    {
      id: 'scenario-5-dependency-violation',
      title: 'Scenario 5: Clean Water Dependency Check',
      description: 'Tests declarative compatibility engine excluding shelters lacking clean water, refrigerated cold chains, or fuel.',
      tag: 'Dependency Rule',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      cardBorder: 'border-emerald-500/30 bg-emerald-950/10',
    },
  ];

  const handleRunScenario = async (scenarioId: string) => {
    setExecutingScenario(scenarioId);
    setChaosMessage(null);
    setChaosRecoveryList([]);
    try {
      const res = await api.runSimulationScenario(scenarioId);
      setLastScenarioResult(res);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'success',
          title: `Executed ${res.scenario_name}`,
          message: res.message,
        });
      }
      if (onStateMutated) onStateMutated();
    } catch (err: any) {
      setChaosMessage(`Error executing scenario: ${err.message}`);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'error',
          title: 'Scenario Failed',
          message: err.message,
        });
      }
    } finally {
      setExecutingScenario(null);
    }
  };

  const handleRiderGoSilent = async () => {
    if (!selectedRiderId) return;
    setExecutingChaos('rider');
    setLastScenarioResult(null);
    try {
      const res = await api.simulateRiderGoSilent(selectedRiderId);
      setChaosMessage(res.message);
      setChaosRecoveryList(res.affected_allocations);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'warning',
          title: `Courier ${res.rider_name} Silent`,
          message: res.message,
        });
      }
      if (onStateMutated) onStateMutated();
    } catch (err: any) {
      setChaosMessage(`Rider failure injection failed: ${err.message}`);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'error',
          title: 'Injection Failed',
          message: err.message,
        });
      }
    } finally {
      setExecutingChaos(null);
    }
  };

  const handleShelterFill = async () => {
    if (!selectedShelterId) return;
    setExecutingChaos('shelter-fill');
    setLastScenarioResult(null);
    try {
      const res = await api.simulateShelterFill(selectedShelterId);
      setChaosMessage(res.message);
      setChaosRecoveryList(res.affected_allocations);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'info',
          title: `Shelter ${res.shelter_name} Filled`,
          message: res.message,
        });
      }
      if (onStateMutated) onStateMutated();
    } catch (err: any) {
      setChaosMessage(`Shelter demand fill failed: ${err.message}`);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'error',
          title: 'Fill Simulation Failed',
          message: err.message,
        });
      }
    } finally {
      setExecutingChaos(null);
    }
  };

  const handleShelterClose = async () => {
    if (!selectedShelterId) return;
    setExecutingChaos('shelter-close');
    setLastScenarioResult(null);
    try {
      const res = await api.simulateShelterClose(selectedShelterId);
      setChaosMessage(res.message);
      setChaosRecoveryList(res.affected_allocations);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'warning',
          title: `Shelter ${res.shelter_name} Closed`,
          message: res.message,
        });
      }
      if (onStateMutated) onStateMutated();
    } catch (err: any) {
      setChaosMessage(`Shelter closure failed: ${err.message}`);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'error',
          title: 'Close Simulation Failed',
          message: err.message,
        });
      }
    } finally {
      setExecutingChaos(null);
    }
  };

  const handleResetSimulation = async () => {
    setExecutingChaos('reset');
    setLastScenarioResult(null);
    setChaosRecoveryList([]);
    try {
      const res = await api.resetSimulation();
      setChaosMessage(res.message);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'System State Reset',
          message: 'All demo entities, active allocations, and courier holds restored to initial state.',
        });
      }
      if (onStateMutated) onStateMutated();
    } catch (err: any) {
      setChaosMessage(`Simulation reset failed: ${err.message}`);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          type: 'error',
          title: 'Reset Failed',
          message: err.message,
        });
      }
    } finally {
      setExecutingChaos(null);
    }
  };

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
              DEMO / SIMULATED
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Deliberately inject failures (silence couriers, close shelters, fill demand) to test deterministic dispatch recovery and the Salvage Ladder in real-time.
          </p>
        </div>

        {/* Global Controls & Virtual Clock */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <button
            onClick={handleResetSimulation}
            disabled={executingChaos === 'reset'}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${executingChaos === 'reset' ? 'animate-spin text-purple-400' : ''}`} />
            <span>Reset Demo Seeds</span>
          </button>

          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-right">
            <span className="text-[10px] text-slate-400 font-mono block">Virtual Clock Rate</span>
            <div className="flex items-center gap-1">
              {[1, 10, 60].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setClockSpeed(spd)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                    clockSpeed === spd
                      ? 'bg-purple-900 text-purple-200 border-purple-600 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Chaos Injection Lab (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A: Courier Failure Injection */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Courier Failure Injection
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Ghost / Silence
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Select a courier to suppress heartbeats. The system marks them <strong>SUSPECT</strong> and immediately executes parcel handover or returns cargo to inventory.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Select Target Courier:
              </label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.vehicle_type}) — Status: {r.status}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRiderGoSilent}
              disabled={executingChaos === 'rider' || !selectedRiderId}
              className="w-full py-2.5 px-4 bg-rose-600/90 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50 transition-all"
            >
              {executingChaos === 'rider' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing Courier Handover...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Simulate Courier Silence (Go Silent)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card B: Shelter Disruption Lab */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Shelter Disruption Lab
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
              Salvage Ladder
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Trigger sudden demand saturation or emergency closures. Tests real-time rerouting of active parcels to open, compatible shelters.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Select Destination Shelter:
              </label>
              <select
                value={selectedShelterId}
                onChange={(e) => setSelectedShelterId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {shelters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Demand: {s.needed_meals} meals) — {s.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShelterFill}
                disabled={executingChaos === 'shelter-fill' || !selectedShelterId}
                className="py-2.5 px-3 bg-amber-600/90 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 disabled:opacity-50 transition-all"
              >
                {executingChaos === 'shelter-fill' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Fill Demand (0 Needed)</span>
              </button>

              <button
                onClick={handleShelterClose}
                disabled={executingChaos === 'shelter-close' || !selectedShelterId}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/60 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {executingChaos === 'shelter-close' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Emergency Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Disruption Result Banner */}
      {(chaosMessage || chaosRecoveryList.length > 0) && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Chaos Execution Output
              </h4>
            </div>
            <button
              onClick={() => {
                setChaosMessage(null);
                setChaosRecoveryList([]);
              }}
              className="text-xs text-slate-500 hover:text-white"
            >
              Clear
            </button>
          </div>

          {chaosMessage && (
            <p className="text-xs font-mono text-emerald-300 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/40">
              {chaosMessage}
            </p>
          )}

          {chaosRecoveryList.length > 0 && (
            <div className="space-y-2 mt-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase block">
                Recovered Parcels ({chaosRecoveryList.length}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {chaosRecoveryList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Action: <strong className="text-emerald-400">{item.action}</strong></span>
                      <span className="text-amber-400">{item.status}</span>
                    </div>
                    {item.new_rider && (
                      <div className="text-[11px] text-cyan-300">
                        {item.previous_rider} → {item.new_rider}
                      </div>
                    )}
                    {item.new_shelter && (
                      <div className="text-[11px] text-amber-300">
                        {item.previous_shelter} → {item.new_shelter}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                      {item.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scripted Scenarios Suite Header */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>Scripted Evaluator Scenarios</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            One-Click Deterministic Verification
          </span>
        </h3>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((sc) => {
            const isRunning = executingScenario === sc.id;

            return (
              <div
                key={sc.id}
                className={`p-5 rounded-2xl border ${sc.cardBorder} flex flex-col justify-between transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono uppercase font-bold text-slate-200">
                      {sc.title}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${sc.badgeColor}`}>
                      {sc.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] font-mono text-emerald-400">
                    Deterministic Engine
                  </span>
                  
                  <button
                    onClick={() => handleRunScenario(sc.id)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Run Scenario</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scenario Execution Result Panel */}
      {lastScenarioResult && (
        <div className="p-5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                {lastScenarioResult.scenario_name} — Executed Successfully
              </h4>
            </div>
            <span className="text-xs font-mono text-purple-300">
              {lastScenarioResult.allocations_count} Active Allocations
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            {lastScenarioResult.description}
          </p>

          <div className="text-xs text-emerald-400 font-mono">
            Result: {lastScenarioResult.message}
          </div>

          {lastScenarioResult.recovery_results.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
              <span className="text-xs font-bold text-white uppercase block">
                Disruption Handover & Reroutes:
              </span>
              <div className="space-y-1.5">
                {lastScenarioResult.recovery_results.map((rec, i) => (
                  <div key={i} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-400">{rec.action}: </span>
                      {rec.new_rider && <span>Courier {rec.previous_rider} → {rec.new_rider}</span>}
                      {rec.new_shelter && <span>Shelter {rec.previous_shelter} → {rec.new_shelter}</span>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
