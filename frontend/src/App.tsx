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
  MapPin,
  Loader2,
  Truck,
  Leaf,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { HERO_BANNER_IMAGE } from './utils/foodImages';

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

      if (healthRes && healthRes.status === 'healthy') {
        setBackendHealthy(true);
      } else {
        setBackendHealthy(false);
      }

      setDashboardData(dashRes);
      setDonations(donRes);
      setRiders(ridRes);
      setShelters(sheRes);
      setAllocations(allocRes);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.message || 'Unable to connect to FastAPI backend on http://localhost:8000.');
      setBackendHealthy(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Background polling every 20 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Phase 3 Auto-Allocation Trigger
  const handleTriggerAutoAllocate = async () => {
    setIsAllocating(true);
    try {
      const result = await api.triggerAutoAllocation();
      setAllocationResult(result);
      
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Intelligent Auto-Allocation Complete',
        message: `Generated ${result.total_allocations_created} allocations (${result.total_quantity_allocated} units) with 0 waste.`,
      });

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

  // Mutation Handlers
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
    <div className="min-h-screen bg-[#F8FAF8] text-[#1A1A1A] flex flex-col font-sans">
      {/* Top Header Navbar in Shopery Style */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        backendHealthy={backendHealthy}
        lastUpdated={lastUpdated}
        onOpenCreateDonation={() => setShowCreateDonationModal(true)}
        onTriggerAutoAllocate={handleTriggerAutoAllocate}
        isAllocating={isAllocating}
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
              <div className="space-y-8">
                
                {/* Shopery Promotional Hero Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#00B207] to-[#008A05] text-white shadow-xl">
                  {/* Decorative Background Image Overlay */}
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none">
                    <img 
                      src={HERO_BANNER_IMAGE} 
                      alt="Fresh wholesome food produce" 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="relative z-10 p-6 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="max-w-2xl space-y-4">
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide border border-white/30 text-white">
                        <Leaf className="w-3.5 h-3.5 fill-white" />
                        <span>100% Zero Food Waste · Pune Civic Relief Grid</span>
                      </div>

                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                        Fresh Food & Emergency Aid Delivered Where It Matters Most
                      </h1>

                      <p className="text-white/90 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
                        Matching surplus restaurant feasts, artisanal bakery surplus, and emergency medical kits directly with community shelters and volunteer riders across Pune.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          onClick={() => setShowCreateDonationModal(true)}
                          className="px-6 py-3 bg-white text-[#00B207] hover:bg-[#F2F7F2] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 group"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Donate Food Batch</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        <button
                          onClick={handleTriggerAutoAllocate}
                          disabled={isAllocating}
                          className="px-5 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                          {isAllocating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#00B207]" />
                              <span>Allocating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-[#FF8A00]" />
                              <span>Auto-Allocate Aid</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setCurrentTab('map')}
                          className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all border border-white/30 flex items-center gap-2 backdrop-blur-sm"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Live Map Corridor</span>
                        </button>
                      </div>
                    </div>

                    {/* Right side floating feature card */}
                    <div className="w-full lg:w-80 bg-white text-[#1A1A1A] p-5 rounded-2xl shadow-2xl border border-white/40 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-[#F2F2F2] pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#808080]">
                          Live Operational Guarantee
                        </span>
                        <span className="text-[10px] bg-[#EAF8E7] text-[#2C742F] font-bold px-2 py-0.5 rounded-full border border-[#BDE5BA]">
                          Verified
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#00B207] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[#1A1A1A] block">Automatic Batch Splitting</span>
                            <span className="text-[#666666]">Donations safely partition to match rider carrying limits.</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#00B207] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[#1A1A1A] block">Feasibility Invariant Check</span>
                            <span className="text-[#666666]">Strict arrival window before food spoilage deadline.</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#00B207] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[#1A1A1A] block">Mid-Route Salvage Ladder</span>
                            <span className="text-[#666666]">Automatic retargeting if couriers fail or shelters fill.</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#F2F2F2] flex items-center justify-between text-[11px] text-[#666666]">
                        <span>Pune Corridor Status:</span>
                        <span className="font-bold text-[#00B207] flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#00B207] animate-pulse" />
                          Optimal
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Shopery Value Proposition Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-[#E6E6E6] flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-[#EAF8E7] text-[#00B207] shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Zero-Waste Split Logistics</h4>
                      <p className="text-[11px] text-[#666666] mt-0.5">Partitioning large batches to courier limits</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E6E6E6] flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-[#EBF4FE] text-[#2B7FDE] shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Declarative Aid Safety</h4>
                      <p className="text-[11px] text-[#666666] mt-0.5">Cold-chain, clean water & fuel checks</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E6E6E6] flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-[#FFF3E5] text-[#D97706] shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Deadline Feasibility</h4>
                      <p className="text-[11px] text-[#666666] mt-0.5">Guaranteed arrival before spoilage</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E6E6E6] flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-xl bg-[#FDE8E8] text-[#EA4B48] shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Real-Time Salvage Ladder</h4>
                      <p className="text-[11px] text-[#666666] mt-0.5">Continuous handover & reroute safety</p>
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
                    <div className="bg-white border border-[#E6E6E6] rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F2]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Active Volunteer Fleet
                        </h3>
                        <button
                          onClick={() => setCurrentTab('riders')}
                          className="text-xs text-[#00B207] hover:text-[#008A05] font-semibold"
                        >
                          View Fleet ({dashboardData.summary.total_riders_count})
                        </button>
                      </div>
                      <div className="divide-y divide-[#F2F2F2] mt-2">
                        {dashboardData.top_riders.map((r) => (
                          <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-[#1A1A1A]">{r.name}</div>
                              <div className="text-[11px] text-[#808080] truncate max-w-[150px]">{r.vehicle_type}</div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                r.status === 'AVAILABLE' ? 'bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]' :
                                'bg-[#EBF4FE] text-[#2B7FDE] border border-[#C6E0FC]'
                              }`}>
                                {r.status}
                              </span>
                              <div className="text-[10px] text-[#666666] mt-0.5 font-medium">{Math.round(r.reliability_score * 100)}% score</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shelters Peek */}
                    <div className="bg-white border border-[#E6E6E6] rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F2]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Relief Shelters
                        </h3>
                        <button
                          onClick={() => setCurrentTab('shelters')}
                          className="text-xs text-[#00B207] hover:text-[#008A05] font-semibold"
                        >
                          View All ({dashboardData.summary.active_shelters_count})
                        </button>
                      </div>
                      <div className="divide-y divide-[#F2F2F2] mt-2">
                        {dashboardData.open_shelters.map((s) => (
                          <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-[#1A1A1A]">{s.name}</div>
                              <div className="text-[11px] text-[#808080]">{s.location.name}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] font-mono font-bold text-[#00B207]">
                                {s.needed_meals} meals
                              </span>
                              <div className="text-[10px] text-[#666666]">
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

            {/* Tab 5: Dispatch Console */}
            {currentTab === 'dispatch' && (
              <DispatchPreview 
                allocations={allocations}
                onTriggerAutoAllocate={handleTriggerAutoAllocate}
                onAllocationUpdated={() => loadData(true)}
                onToast={setToast}
                isAllocating={isAllocating}
              />
            )}

            {/* Tab 6: Simulation */}
            {currentTab === 'simulation' && (
              <SimulationPreview 
                riders={riders}
                shelters={shelters}
                onStateMutated={() => loadData(true)}
                onToast={setToast}
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

      {/* Auto-Allocation Results Modal */}
      <AllocationResultsModal
        result={allocationResult}
        isOpen={!!allocationResult}
        onClose={() => setAllocationResult(null)}
        onViewDispatch={() => setCurrentTab('dispatch')}
      />

      {/* Classic Shopery 4-Column Footer */}
      <footer className="mt-16 bg-[#1A1A1A] text-white pt-12 pb-8 border-t border-[#333333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-[#333333]">
            {/* Column 1: Brand & Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#00B207] text-white">
                  <Leaf className="w-5 h-5 fill-white stroke-white" />
                </div>
                <span className="font-extrabold text-xl tracking-tight">
                  The<span className="text-[#00B207]">Saviour</span>
                </span>
              </div>
              <p className="text-xs text-[#999999] leading-relaxed">
                Zero-waste civic food logistics platform connecting commercial donors, community shelters, and volunteer couriers across the Pune disaster relief corridor.
              </p>
              <div className="pt-1 text-xs text-[#CCCCCC] space-y-1">
                <div>Emergency Dispatch Hotline:</div>
                <div className="text-sm font-bold text-[#00B207]">+91 20 2612 0000</div>
              </div>
            </div>

            {/* Column 2: Relief Categories */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Aid Categories
              </h4>
              <ul className="space-y-2 text-xs text-[#999999]">
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('donations')}>
                  Fresh Cooked Meals (Hot & Ready)
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('donations')}>
                  Artisanal Bakery & Packaged Rations
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('donations')}>
                  Infant Formula & Baby Nutrition
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('donations')}>
                  Refrigerated Cold-Chain Medicine
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('donations')}>
                  Clean Drinking Water Supplies
                </li>
              </ul>
            </div>

            {/* Column 3: Logistics Core */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Deterministic Engine
              </h4>
              <ul className="space-y-2 text-xs text-[#999999]">
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('dispatch')}>
                  Automatic Batch Splitting
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('dispatch')}>
                  Deadline Feasibility Invariants
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('dispatch')}>
                  Adaptive Courier Slack Leases
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('simulation')}>
                  Salvage Ladder Mid-Route Rerouting
                </li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => setCurrentTab('map')}>
                  WGS84 Haversine Corridor Telemetry
                </li>
              </ul>
            </div>

            {/* Column 4: Quick Actions & Status */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                System Status
              </h4>
              <div className="bg-[#2A2A2A] p-3.5 rounded-xl border border-[#3A3A3A] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#999999]">FastAPI Backend:</span>
                  <span className="font-semibold text-[#00B207]">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#999999]">Engine State:</span>
                  <span className="font-mono text-[#CCCCCC]">In-Memory Repos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#999999]">Pune Corridors:</span>
                  <span className="font-semibold text-white">Active (6 Zones)</span>
                </div>
              </div>

              <button
                onClick={() => setShowCreateDonationModal(true)}
                className="w-full py-2.5 px-3 bg-[#00B207] hover:bg-[#008A05] text-white text-xs font-bold rounded-xl transition-colors shadow-md text-center"
              >
                + Register Donation
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#808080]">
            <div>
              © 2026 TheSaviour · Open Civic Relief Network · Zero-Waste Community Rescue
            </div>
            <div className="flex items-center gap-4">
              <span>FastAPI (Python 3.11)</span>
              <span>•</span>
              <span>React + Vite + Tailwind CSS</span>
              <span>•</span>
              <span className="text-[#00B207] font-semibold">100% Deterministic Guarantee</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
