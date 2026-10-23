import React, { useState, useEffect, useCallback } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  SummaryCards 
} from './components/SummaryCards';
import { 
  UrgencySection 
} from './components/UrgencySection';
import { 
  RecentActivitySection 
} from './components/RecentActivitySection';
import { 
  DonationsList 
} from './components/DonationsList';
import { 
  RidersList 
} from './components/RidersList';
import { 
  SheltersList 
} from './components/SheltersList';
import { 
  DispatchPreview 
} from './components/DispatchPreview';
import { 
  SimulationPreview 
} from './components/SimulationPreview';
import { 
  LoadingState 
} from './components/LoadingState';
import { 
  ErrorMessage 
} from './components/ErrorMessage';
import { 
  Toast, 
  ToastMessage 
} from './components/Toast';
import { 
  DonationCreateModal 
} from './components/DonationCreateModal';
import { 
  AllocationResultsModal 
} from './components/AllocationResultsModal';
import { 
  InteractiveMap 
} from './components/InteractiveMap';
import { 
  api 
} from './services/api';
import { 
  NavTab, 
  DashboardResponse, 
  Donation, 
  Rider, 
  Shelter, 
  Allocation, 
  AutoAllocationResponse 
} from './types';
import { 
  ShieldCheck, 
  Plus, 
  Play, 
  MapPin,
  Loader2 
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Phase 2 & 3 Interactive States
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showCreateDonationModal, setShowCreateDonationModal] = useState<boolean>(false);
  
  // Phase 3 Auto-Allocation State
  const [isAllocating, setIsAllocating] = useState<boolean>(false);
  const [allocationResult, setAllocationResult] = useState<AutoAllocationResponse | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      // Parallel fetch to backend
      const [healthRes, dashRes, donRes, ridRes, sheRes, allocRes] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getDashboard(),
        api.getDonations(),
        api.getRiders(),
        api.getShelters(),
        api.getAllocations().catch(() => []),
      ]);

      setBackendHealthy(healthRes?.status === 'healthy');
      setDashboardData(dashRes);
      setDonations(donRes);
      setRiders(ridRes);
      setShelters(sheRes);
      setAllocations(allocRes);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to fetch data from TheSaviour API:', err);
      setBackendHealthy(false);
      setError(err?.message || 'Failed to connect to TheSaviour FastAPI backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Phase 3 Auto-Allocation Action
  const handleTriggerAutoAllocate = async () => {
    setIsAllocating(true);
    try {
      const res = await api.triggerAutoAllocation();
      setAllocationResult(res);

      if (res.total_allocations_created > 0) {
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Auto-Allocation Completed',
          message: `Created ${res.total_allocations_created} courier allocations dishing ${res.total_quantity_allocated} aid units.`,
        });
      } else {
        setToast({
          id: Date.now().toString(),
          type: 'info',
          title: 'Allocation Cycle Checked',
          message: res.message,
        });
      }

      // Silent refresh to update metrics, unallocated counters, and active dispatches
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to execute auto allocation:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Auto-Allocation Error',
        message: err?.message || 'Failed to execute allocation algorithm.',
      });
    } finally {
      setIsAllocating(false);
    }
  };

  // Phase 2 Mutation Handlers
  const handleDonationCreated = (newDonation: Donation) => {
    setDonations((prev) => [newDonation, ...prev]);
    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'Donation Batch Registered',
      message: `${newDonation.quantity} ${newDonation.unit} of "${newDonation.item_name}" registered with safe arrival window of ${newDonation.safe_window_minutes} mins.`,
    });
    loadData(true);
  };

  const handleDonationUpdated = (updated: Donation) => {
    setDonations((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Donation Batch Updated',
      message: `Batch "${updated.item_name}": ${updated.remaining_quantity ?? updated.quantity} unallocated ${updated.unit} remaining (${updated.status}).`,
    });
    loadData(true);
  };

  const handleShelterUpdated = (updated: Shelter) => {
    setShelters((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'Shelter Updated',
      message: `${updated.name}: Demand updated to ${updated.needed_meals} meals, occupancy ${updated.current_occupancy}/${updated.capacity} (${updated.status}).`,
    });
    loadData(true);
  };

  const handleRiderUpdated = (updated: Rider) => {
    setRiders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Volunteer Rider Updated',
      message: `${updated.name}: Status set to ${updated.status}, carrying capacity ${updated.capacity_units} units.`,
    });
    loadData(true);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        backendHealthy={backendHealthy}
        lastUpdated={lastUpdated}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Error Banner if API Fails */}
        {error && (
          <ErrorMessage
            title="FastAPI Server Connection Issue"
            message={error}
            onRetry={() => loadData(false)}
          />
        )}

        {/* Initial Loading Spinner */}
        {loading && !dashboardData ? (
          <LoadingState
            message="Initializing TheSaviour Logistics Grid..."
            subtext="Querying Pune emergency in-memory repositories (/api/dashboard, /api/donations, /api/riders, /api/shelters, /api/allocations)"
          />
        ) : (
          <div>
            {/* Tab 1: Overview */}
            {currentTab === 'overview' && dashboardData && (
              <div className="space-y-6">
                
                {/* Hero / Operational Status Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LIVE DISPATCH ACTIVE
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Zone: Pune Central Disaster Corridor
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
                        Real-Time Civic Aid Redistribution
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
                        Treating time, volunteer transport capacity, and shelter dependencies as first-class constraints. 
                        Zero food waste, zero stranded couriers.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Phase 3 Action Button: Auto-Allocate Aid */}
                      <button
                        onClick={handleTriggerAutoAllocate}
                        disabled={isAllocating}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center gap-1.5"
                      >
                        {isAllocating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Allocating Fleet...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Auto-Allocate Aid</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setCurrentTab('map')}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
                      >
                        <MapPin className="w-4 h-4 text-cyan-400" />
                        <span>Live Map</span>
                      </button>

                      <button
                        onClick={() => setShowCreateDonationModal(true)}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Register Batch</span>
                      </button>

                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-mono">System Invariant</div>
                        <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Spoilage Protected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <SummaryCards summary={dashboardData.summary} />

                {/* Urgency Section */}
                <UrgencySection
                  donations={dashboardData.urgent_donations}
                  onViewAll={() => setCurrentTab('donations')}
                />

                {/* Grid with Recent Activity and Live Fleet/Shelters Peek */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Activity (2 cols) */}
                  <div className="lg:col-span-2">
                    <RecentActivitySection activities={dashboardData.recent_activities} />
                  </div>

                  {/* Operational Quick Glance (1 col) */}
                  <div className="space-y-6">
                    {/* Active Couriers Peek */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Active Riders
                        </h3>
                        <button
                          onClick={() => setCurrentTab('riders')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          View Fleet ({dashboardData.summary.total_riders_count})
                        </button>
                      </div>
                      <div className="divide-y divide-slate-800/60 mt-2">
                        {dashboardData.top_riders.map((r) => (
                          <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-slate-200">{r.name}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{r.vehicle_type}</div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                r.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                'bg-cyan-950 text-cyan-400 border border-cyan-800'
                              }`}>
                                {r.status}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">{Math.round(r.reliability_score * 100)}% reliability</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shelters Peek */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Open Shelters
                        </h3>
                        <button
                          onClick={() => setCurrentTab('shelters')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          View Shelters ({dashboardData.summary.active_shelters_count})
                        </button>
                      </div>
                      <div className="divide-y divide-slate-800/60 mt-2">
                        {dashboardData.open_shelters.map((s) => (
                          <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-slate-200">{s.name}</div>
                              <div className="text-[11px] text-slate-400">{s.location.name}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] font-mono font-bold text-emerald-400">
                                {s.needed_meals} meals
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {s.current_occupancy}/{s.capacity} spots
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Interactive Map & Simulated Rider Tracking */}
            {currentTab === 'map' && (
              <InteractiveMap
                donations={donations}
                shelters={shelters}
                riders={riders}
                allocations={allocations}
                onTriggerAutoAllocate={handleTriggerAutoAllocate}
                isAllocating={isAllocating}
              />
            )}

            {/* Tab 2: Donations */}
            {currentTab === 'donations' && (
              <DonationsList 
                donations={donations}
                shelters={shelters}
                onOpenCreateModal={() => setShowCreateDonationModal(true)}
                onDonationUpdated={handleDonationUpdated}
              />
            )}

            {/* Tab 3: Riders */}
            {currentTab === 'riders' && (
              <RidersList 
                riders={riders}
                onRiderUpdated={handleRiderUpdated}
              />
            )}

            {/* Tab 4: Shelters */}
            {currentTab === 'shelters' && (
              <SheltersList 
                shelters={shelters}
                onShelterUpdated={handleShelterUpdated}
              />
            )}

            {/* Tab 5: Dispatch Console (Phase 5 recovery & parcel lifecycle active) */}
            {currentTab === 'dispatch' && (
              <DispatchPreview 
                allocations={allocations}
                onTriggerAutoAllocate={handleTriggerAutoAllocate}
                onAllocationUpdated={() => loadData(true)}
                isAllocating={isAllocating}
              />
            )}

            {/* Tab 6: Simulation (Phase 5 Chaos Lab) */}
            {currentTab === 'simulation' && (
              <SimulationPreview 
                riders={riders}
                shelters={shelters}
                onStateMutated={() => loadData(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Register Donation Batch Modal */}
      <DonationCreateModal
        isOpen={showCreateDonationModal}
        onClose={() => setShowCreateDonationModal(false)}
        onSuccess={handleDonationCreated}
      />

      {/* Phase 3 Auto-Allocation Results Modal */}
      <AllocationResultsModal
        result={allocationResult}
        isOpen={!!allocationResult}
        onClose={() => setAllocationResult(null)}
        onViewDispatch={() => setCurrentTab('dispatch')}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">TheSaviour</span>
            <span className="text-slate-400">•</span>
            <span>Civic Aid Coordination Platform</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-emerald-400">Phase 5 Recovery & Chaos Simulation Active</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>FastAPI Backend: http://localhost:8000</span>
            <span>Frontend: React + Vite + Tailwind</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
