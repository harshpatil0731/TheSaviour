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
      badgeColor: 'bg-[#FDE8E8] text-[#EA4B48] border-[#F8B4B4]',
      cardBorder: 'border-[#F8B4B4] bg-[#FFF8F8]',
    },
    {
      id: 'scenario-2-batch-split',
      title: 'Scenario 2: Multi-Rider Parcel Split',
      description: 'Banquet posts 180 hot meals expiring in 75 minutes. Tests automatic generation of courier parcels with capacity soft holds.',
      tag: 'Batch Splitting',
      badgeColor: 'bg-[#FFF3E5] text-[#D97706] border-[#FDE3B7]',
      cardBorder: 'border-[#FDE3B7] bg-[#FFFBF5]',
    },
    {
      id: 'scenario-3-ghost-rider',
      title: 'Scenario 3: Ghost Courier & Handover',
      description: 'Allocates fleet, then simulates courier failing heartbeats and going silent. Demonstrates courier marked SUSPECT and parcel handover.',
      tag: 'Courier Recovery',
      badgeColor: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
      cardBorder: 'border-[#E9D5FF] bg-[#FAF5FF]',
    },
    {
      id: 'scenario-4-shelter-fill',
      title: 'Scenario 4: Shelter Fills Mid-Transit',
      description: 'A courier is en route when citizen walk-ins fill the shelter. Tests dynamic mid-transit retargeting via the Salvage Ladder.',
      tag: 'Salvage Ladder',
      badgeColor: 'bg-[#EBF4FE] text-[#2B7FDE] border-[#C6E0FC]',
      cardBorder: 'border-[#C6E0FC] bg-[#F5F9FF]',
    },
    {
      id: 'scenario-5-dependency-violation',
      title: 'Scenario 5: Clean Water Dependency Check',
      description: 'Tests declarative compatibility engine excluding shelters lacking clean water, refrigerated cold chains, or fuel.',
      tag: 'Dependency Rule',
      badgeColor: 'bg-[#EAF8E7] text-[#2C742F] border-[#BDE5BA]',
      cardBorder: 'border-[#BDE5BA] bg-[#F8FCF8]',
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
      <div className="p-6 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-[#EAF8E7] text-[#00B207] rounded-xl">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  Chaos & Disaster Simulation Lab
                </h2>
                <span className="text-[10px] bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] px-2.5 py-0.5 rounded-full font-bold">
                  DEMO / SIMULATED
                </span>
              </div>
              <p className="text-xs text-[#666666] mt-1 max-w-2xl leading-relaxed">
                Deliberately inject failures (silence couriers, close shelters, fill demand) to test deterministic dispatch recovery and the Salvage Ladder in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Virtual Clock */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <button
            onClick={handleResetSimulation}
            disabled={executingChaos === 'reset'}
            className="px-4 py-2.5 bg-[#F2F7F2] hover:bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${executingChaos === 'reset' ? 'animate-spin text-[#00B207]' : ''}`} />
            <span>Reset Demo Seeds</span>
          </button>

          <div className="p-2.5 bg-[#F8FAF8] border border-[#E6E6E6] rounded-xl space-y-1 text-right">
            <span className="text-[10px] text-[#808080] font-mono block">Virtual Clock Rate</span>
            <div className="flex items-center gap-1">
              {[1, 10, 60].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setClockSpeed(spd)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors ${
                    clockSpeed === spd
                      ? 'bg-[#00B207] text-white border-[#00B207] font-bold'
                      : 'bg-white text-[#666666] border-[#E6E6E6] hover:bg-[#F2F7F2]'
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card A: Courier Failure Injection */}
        <div className="p-5 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F2]">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-[#2B7FDE]" />
              <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Courier Failure Injection
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#EBF4FE] text-[#2B7FDE] border border-[#C6E0FC]">
              Heartbeat Silence
            </span>
          </div>

          <p className="text-xs text-[#666666] leading-relaxed">
            Select a courier to suppress heartbeats. The system marks them <strong>SUSPECT</strong> and immediately executes parcel handover or returns cargo to inventory.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#1A1A1A] block mb-1.5">
                Select Target Courier:
              </label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF8] border border-[#E6E6E6] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00B207]"
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
              className="w-full py-2.5 px-4 bg-[#EA4B48] hover:bg-[#d43f3c] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all"
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
        <div className="p-5 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F2]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF8A00]" />
              <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Shelter Disruption Lab
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FFF3E5] text-[#D97706] border border-[#FDE3B7]">
              Salvage Ladder
            </span>
          </div>

          <p className="text-xs text-[#666666] leading-relaxed">
            Trigger sudden demand saturation or emergency closures. Tests real-time rerouting of active parcels to open, compatible shelters.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#1A1A1A] block mb-1.5">
                Select Destination Shelter:
              </label>
              <select
                value={selectedShelterId}
                onChange={(e) => setSelectedShelterId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF8] border border-[#E6E6E6] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00B207]"
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
                className="py-2.5 px-3 bg-[#FF8A00] hover:bg-[#e07b00] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition-all"
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
                className="py-2.5 px-3 bg-[#FDE8E8] hover:bg-[#fad4d4] text-[#EA4B48] border border-[#F8B4B4] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {executingChaos === 'shelter-close' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EA4B48]" />
                )}
                <span>Emergency Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Disruption Result Banner */}
      {(chaosMessage || chaosRecoveryList.length > 0) && (
        <div className="p-5 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#00B207] animate-pulse" />
              <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                Chaos Execution Output
              </h4>
            </div>
            <button
              onClick={() => {
                setChaosMessage(null);
                setChaosRecoveryList([]);
              }}
              className="text-xs text-[#808080] hover:text-[#1A1A1A]"
            >
              Clear
            </button>
          </div>

          {chaosMessage && (
            <p className="text-xs font-mono text-[#2C742F] bg-[#EAF8E7] p-3 rounded-xl border border-[#BDE5BA]">
              {chaosMessage}
            </p>
          )}

          {chaosRecoveryList.length > 0 && (
            <div className="space-y-2 mt-2">
              <span className="text-[11px] font-bold text-[#1A1A1A] uppercase block">
                Recovered Parcels ({chaosRecoveryList.length}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {chaosRecoveryList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[10px] text-[#666666]">
                      <span>Action: <strong className="text-[#00B207]">{item.action}</strong></span>
                      <span className="text-[#D97706] font-bold">{item.status}</span>
                    </div>
                    {item.new_rider && (
                      <div className="text-[11px] text-[#2B7FDE]">
                        {item.previous_rider} → {item.new_rider}
                      </div>
                    )}
                    {item.new_shelter && (
                      <div className="text-[11px] text-[#D97706]">
                        {item.previous_shelter} → {item.new_shelter}
                      </div>
                    )}
                    <div className="text-[10px] text-[#666666] pt-1 leading-relaxed">
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
        <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>Scripted Evaluator Scenarios</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]">
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
                className={`p-5 rounded-2xl border ${sc.cardBorder} flex flex-col justify-between transition-all shadow-sm hover:shadow-md`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono uppercase font-bold text-[#1A1A1A]">
                      {sc.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.badgeColor}`}>
                      {sc.tag}
                    </span>
                  </div>
                  <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6E6E6] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-[#2C742F]">
                    Deterministic Engine
                  </span>
                  
                  <button
                    onClick={() => handleRunScenario(sc.id)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00B207] hover:bg-[#008A05] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
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
        <div className="p-5 bg-white border border-[#BDE5BA] rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#00B207]" />
              <h4 className="text-sm font-bold text-[#1A1A1A]">
                {lastScenarioResult.scenario_name} — Executed Successfully
              </h4>
            </div>
            <span className="text-xs font-bold text-[#2C742F] bg-[#EAF8E7] px-2.5 py-0.5 rounded-full border border-[#BDE5BA]">
              {lastScenarioResult.allocations_count} Active Allocations
            </span>
          </div>

          <p className="text-xs text-[#4D4D4D] leading-relaxed font-mono bg-[#F8FAF8] p-3 rounded-xl border border-[#E6E6E6]">
            {lastScenarioResult.description}
          </p>

          <div className="text-xs text-[#2C742F] font-mono font-semibold">
            Result: {lastScenarioResult.message}
          </div>

          {lastScenarioResult.recovery_results.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#F2F2F2] space-y-2">
              <span className="text-xs font-bold text-[#1A1A1A] uppercase block">
                Disruption Handover & Reroutes:
              </span>
              <div className="space-y-1.5">
                {lastScenarioResult.recovery_results.map((rec, i) => (
                  <div key={i} className="p-2.5 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] text-xs font-mono text-[#4D4D4D] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#00B207]">{rec.action}: </span>
                      {rec.new_rider && <span>Courier {rec.previous_rider} → {rec.new_rider}</span>}
                      {rec.new_shelter && <span>Shelter {rec.previous_shelter} → {rec.new_shelter}</span>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFF3E5] text-[#D97706] border border-[#FDE3B7] font-semibold">
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
