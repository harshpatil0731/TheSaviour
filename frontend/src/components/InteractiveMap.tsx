import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bike, 
  Building2, 
  Package, 
  Play, 
  Pause, 
  RotateCcw, 
  Navigation, 
  Radio, 
  AlertTriangle, 
  Info,
  Loader2
} from 'lucide-react';
import { 
  Donation, 
  Shelter, 
  Rider, 
  Allocation, 
  RouteCalculationResponse 
} from '../types';
import { api } from '../services/api';

interface InteractiveMapProps {
  donations: Donation[];
  shelters: Shelter[];
  riders: Rider[];
  allocations: Allocation[];
  onTriggerAutoAllocate?: () => void;
  isAllocating?: boolean;
}

// Bounding box for Pune disaster relief corridor
const PUNE_BOUNDS = {
  minLat: 18.4900,
  maxLat: 18.6100,
  minLng: 73.7100,
  maxLng: 73.9400,
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  donations,
  shelters,
  riders,
  allocations,
  onTriggerAutoAllocate,
  isAllocating = false,
}) => {
  // Google Maps API Key from environment
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  // States
  const [mapsLoaded, setMapsLoaded] = useState<boolean>(false);
  const [authFailed, setAuthFailed] = useState<boolean>(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [activeRoute, setActiveRoute] = useState<RouteCalculationResponse | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);

  // Simulation Tracking State
  const [simPlaying, setSimPlaying] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0); // 0.0 to 1.0
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simStatus, setSimStatus] = useState<string>('READY');
  const simIntervalRef = useRef<any>(null);

  // Filter toggles
  const [showDonations, setShowDonations] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showRiders, setShowRiders] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  // Selected Marker Info Details
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'donation' | 'shelter' | 'rider';
    data: any;
  } | null>(null);

  // DOM Refs
  const googleMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const simMarkerRef = useRef<any>(null);

  // Default selected allocation to first available
  useEffect(() => {
    if (allocations.length > 0 && !selectedAllocationId) {
      setSelectedAllocationId(allocations[0].id);
    }
  }, [allocations, selectedAllocationId]);

  // Load Google Maps Script if key provided
  useEffect(() => {
    if (!googleMapsApiKey || googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return;
    }

    // Set up auth failure listener
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps Authentication failed: invalid or unauthorized API key.');
      setAuthFailed(true);
      setMapsLoaded(false);
    };

    if ((window as any).google && (window as any).google.maps) {
      setMapsLoaded(true);
      return;
    }

    const scriptId = 'google-maps-js-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapsLoaded(true);
      script.onerror = () => setAuthFailed(true);
      document.head.appendChild(script);
    }
  }, [googleMapsApiKey]);

  // Fetch or calculate route when selected allocation changes
  useEffect(() => {
    if (!selectedAllocationId) {
      setActiveRoute(null);
      return;
    }

    const alloc = allocations.find((a) => a.id === selectedAllocationId);
    if (!alloc) return;

    const donation = donations.find((d) => d.id === alloc.donation_id);
    const shelter = shelters.find((s) => s.id === alloc.shelter_id);

    if (donation && shelter) {
      setLoadingRoute(true);
      api.calculateRoute({
        origin_lat: donation.location.latitude,
        origin_lng: donation.location.longitude,
        dest_lat: shelter.location.latitude,
        dest_lng: shelter.location.longitude,
        donor_name: donation.donor_name,
        shelter_name: shelter.name,
      })
        .then((res) => {
          setActiveRoute(res);
        })
        .catch((err) => {
          console.error('Route calculation error:', err);
        })
        .finally(() => {
          setLoadingRoute(false);
        });
    }
  }, [selectedAllocationId, allocations, donations, shelters]);

  // Reset simulation when selected allocation changes
  useEffect(() => {
    handleResetSimulation();
  }, [selectedAllocationId]);

  // Simulation tick loop
  useEffect(() => {
    if (simPlaying) {
      simIntervalRef.current = setInterval(() => {
        setSimProgress((prev) => {
          const next = prev + 0.015 * simSpeed;
          if (next >= 1.0) {
            setSimPlaying(false);
            setSimStatus('DELIVERED');
            return 1.0;
          }
          if (next < 0.3) {
            setSimStatus('EN_ROUTE_PICKUP');
          } else {
            setSimStatus('EN_ROUTE_DROP');
          }
          return next;
        });
      }, 100);
    } else {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    }
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [simPlaying, simSpeed]);

  const handleStartSimulation = () => {
    if (simProgress >= 1.0) {
      setSimProgress(0);
    }
    setSimPlaying(true);
  };

  const handlePauseSimulation = () => {
    setSimPlaying(false);
  };

  const handleResetSimulation = () => {
    setSimPlaying(false);
    setSimProgress(0);
    setSimStatus('READY');
  };

  // Compute current simulated coordinates along the active route
  const getSimulatedCoordinates = useCallback(() => {
    if (!activeRoute || activeRoute.polyline.length === 0) {
      return null;
    }
    const points = activeRoute.polyline;
    const totalPoints = points.length;
    const exactIndex = simProgress * (totalPoints - 1);
    const lowIndex = Math.floor(exactIndex);
    const highIndex = Math.min(totalPoints - 1, lowIndex + 1);
    const fraction = exactIndex - lowIndex;

    const p1 = points[lowIndex];
    const p2 = points[highIndex];
    return {
      lat: p1.latitude + (p2.latitude - p1.latitude) * fraction,
      lng: p1.longitude + (p2.longitude - p1.longitude) * fraction,
    };
  }, [activeRoute, simProgress]);

  const currentSimCoord = getSimulatedCoordinates();

  // Initialize or update live Google Map if SDK is available
  useEffect(() => {
    if (!mapsLoaded || !googleMapRef.current || !(window as any).google) return;

    const google = (window as any).google;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(googleMapRef.current, {
        center: { lat: 18.5350, lng: 73.8567 },
        zoom: 12,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1f2c' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2c' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8e9bb0' }] },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#2b3447' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212936' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#0d131f' }],
          },
          {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#151b26' }],
          },
        ],
      });
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Render Donation Markers
    if (showDonations) {
      donations.forEach((d) => {
        const marker = new google.maps.Marker({
          position: { lat: d.location.latitude, lng: d.location.longitude },
          map,
          title: d.item_name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#F59E0B',
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 8,
          },
        });
        marker.addListener('click', () => {
          setSelectedEntity({ type: 'donation', data: d });
        });
        markersRef.current.push(marker);
      });
    }

    // Render Shelter Markers
    if (showShelters) {
      shelters.forEach((s) => {
        const marker = new google.maps.Marker({
          position: { lat: s.location.latitude, lng: s.location.longitude },
          map,
          title: s.name,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: '#8B5CF6',
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 6,
          },
        });
        marker.addListener('click', () => {
          setSelectedEntity({ type: 'shelter', data: s });
        });
        markersRef.current.push(marker);
      });
    }

    // Render Courier Markers
    if (showRiders) {
      riders.forEach((r) => {
        const marker = new google.maps.Marker({
          position: { lat: r.location.latitude, lng: r.location.longitude },
          map,
          title: r.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#06B6D4',
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 7,
          },
        });
        marker.addListener('click', () => {
          setSelectedEntity({ type: 'rider', data: r });
        });
        markersRef.current.push(marker);
      });
    }

    // Render Polyline Route
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (showRoutes && activeRoute && activeRoute.polyline.length > 0) {
      const pathCoords = activeRoute.polyline.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
      }));

      polylineRef.current = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: activeRoute.is_fallback ? '#F59E0B' : '#10B981',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map,
      });
    }

    // Render Simulated Moving Courier Marker
    if (simMarkerRef.current) {
      simMarkerRef.current.setMap(null);
      simMarkerRef.current = null;
    }

    if (currentSimCoord) {
      simMarkerRef.current = new google.maps.Marker({
        position: currentSimCoord,
        map,
        title: 'Simulated Courier Position',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          fillColor: '#10B981',
          fillOpacity: 1.0,
          strokeWeight: 3,
          strokeColor: '#FFFFFF',
          scale: 7,
        },
      });
    }
  }, [
    mapsLoaded,
    donations,
    shelters,
    riders,
    showDonations,
    showShelters,
    showRiders,
    showRoutes,
    activeRoute,
    currentSimCoord,
  ]);

  // Selected Allocation Entity
  const selectedAlloc = allocations.find((a) => a.id === selectedAllocationId);

  // Coordinate Projection Helper for Vector Canvas
  const projectCoord = (lat: number, lng: number) => {
    const latSpan = PUNE_BOUNDS.maxLat - PUNE_BOUNDS.minLat;
    const lngSpan = PUNE_BOUNDS.maxLng - PUNE_BOUNDS.minLng;
    const x = ((lng - PUNE_BOUNDS.minLng) / lngSpan) * 100;
    const y = ((PUNE_BOUNDS.maxLat - lat) / latSpan) * 100;
    return {
      x: Math.max(4, Math.min(96, x)),
      y: Math.max(4, Math.min(96, y)),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Navigation className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white">
                Live Relief Corridor & Courier Tracking
              </h2>
              <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                DEMO / SIMULATION
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Real-time geographic visualization of perishable aid pickup corridors, flood shelters, 
              courier telemetry, and automated delivery progress across the Pune urban relief corridor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onTriggerAutoAllocate && (
              <button
                onClick={onTriggerAutoAllocate}
                disabled={isAllocating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Radio className="w-4 h-4" />
                <span>Auto-Allocate Aid</span>
              </button>
            )}

            <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-right">
              <span className="text-[10px] text-slate-400 font-mono block">Geographic Corridor</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Pune Metropolitan Area (WGS84)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Setup Message if Missing or Invalid */}
      {(!googleMapsApiKey || authFailed) && (
        <div className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>Google Maps API Key Setup</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {authFailed ? 'Invalid Key / Auth Failed' : 'Browser Key Not Detected'}
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                To render live Google Maps satellite tiles and live road navigation, add your browser key to{' '}
                <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                  frontend/.env.local
                </code>{' '}
                as <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono">VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY</code>.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              Interactive Pune Vector Engine Active
            </span>
          </div>
        </div>
      )}

      {/* Main Map Viewport & Tracking Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Map Container (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          
          {/* Map Card */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[560px]">
            
            {/* Live Google Map Container (Active if key valid and script loaded) */}
            {mapsLoaded && !authFailed && (
              <div ref={googleMapRef} className="w-full h-full" />
            )}

            {/* Fallback Vector Interactive Map (Active if no key, loading, or auth failed) */}
            {(!mapsLoaded || authFailed) && (
              <div className="relative w-full h-full bg-[#0d121f] overflow-hidden select-none">
                
                {/* Pune Grid Lines & River SVG Background */}
                <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  {/* Stylized Mula-Mutha River Corridor */}
                  <path
                    d="M 10 200 Q 180 180 320 280 T 600 240 T 900 360"
                    fill="none"
                    stroke="#1e3a5f"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 200 Q 180 180 320 280 T 600 240 T 900 360"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                  />
                </svg>

                {/* Corridor Labels */}
                <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 pointer-events-none">
                  <span className="text-emerald-400 font-bold">Zone:</span> Pune Relief Corridor (Hinjewadi ↔ Camp ↔ Koregaon Park)
                </div>

                <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 pointer-events-none">
                  Grid Bounds: {PUNE_BOUNDS.minLat.toFixed(2)}°N - {PUNE_BOUNDS.maxLat.toFixed(2)}°N, {PUNE_BOUNDS.minLng.toFixed(2)}°E - {PUNE_BOUNDS.maxLng.toFixed(2)}°E
                </div>

                {/* SVG Active Delivery Routes */}
                {showRoutes && activeRoute && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Render polyline route */}
                    <polyline
                      points={activeRoute.polyline
                        .map((p) => {
                          const proj = projectCoord(p.latitude, p.longitude);
                          return `${proj.x}%,${proj.y}%`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke={activeRoute.is_fallback ? '#F59E0B' : '#10B981'}
                      strokeWidth="3.5"
                      strokeDasharray={activeRoute.is_fallback ? '6,6' : 'none'}
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {/* Donation Markers */}
                {showDonations &&
                  donations.map((d) => {
                    const pos = projectCoord(d.location.latitude, d.location.longitude);
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedEntity({ type: 'donation', data: d })}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 focus:outline-none"
                      >
                        <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-950 hover:scale-125 transition-transform border border-amber-200">
                          <Package className="w-4 h-4" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap pointer-events-none transition-opacity">
                          {d.item_name} ({d.remaining_quantity ?? d.quantity} {d.unit})
                        </div>
                      </button>
                    );
                  })}

                {/* Shelter Markers */}
                {showShelters &&
                  shelters.map((s) => {
                    const pos = projectCoord(s.location.latitude, s.location.longitude);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedEntity({ type: 'shelter', data: s })}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 focus:outline-none"
                      >
                        <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl font-bold shadow-lg hover:scale-125 transition-transform border ${
                          s.status === 'OPEN'
                            ? 'bg-purple-600 text-white shadow-purple-950 border-purple-300'
                            : 'bg-rose-700 text-white shadow-rose-950 border-rose-300'
                        }`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap pointer-events-none transition-opacity">
                          {s.name} ({s.needed_meals} meals needed)
                        </div>
                      </button>
                    );
                  })}

                {/* Volunteer Couriers Initial Markers */}
                {showRiders &&
                  riders.map((r) => {
                    const pos = projectCoord(r.location.latitude, r.location.longitude);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedEntity({ type: 'rider', data: r })}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 focus:outline-none"
                      >
                        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-950 hover:scale-125 transition-transform border-2 border-white">
                          <Bike className="w-3.5 h-3.5" />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap pointer-events-none transition-opacity">
                          {r.name} ({r.status})
                        </div>
                      </button>
                    );
                  })}

                {/* Simulated Courier Animated Pin */}
                {currentSimCoord && (
                  (() => {
                    const pos = projectCoord(currentSimCoord.lat, currentSimCoord.lng);
                    return (
                      <div
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                      >
                        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-slate-950 shadow-2xl shadow-emerald-500 border-2 border-white animate-bounce">
                          <Bike className="w-5 h-5" />
                          <div className="absolute -inset-1 bg-emerald-400 rounded-full animate-ping opacity-40" />
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-[9px] font-bold rounded whitespace-nowrap shadow-md">
                          COURIER: {Math.round(simProgress * 100)}%
                        </div>
                      </div>
                    );
                  })()
                )}

              </div>
            )}

            {/* Top Right Legend & Filter Controls */}
            <div className="absolute top-4 right-4 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-xl space-y-2 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Corridor Layers
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showDonations}
                    onChange={(e) => setShowDonations(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-500 rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Donations ({donations.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showShelters}
                    onChange={(e) => setShowShelters(e.target.checked)}
                    className="w-3.5 h-3.5 accent-purple-500 rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Shelters ({shelters.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showRiders}
                    onChange={(e) => setShowRiders(e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-500 rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span>Couriers ({riders.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-500 rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Delivery Route</span>
                </label>
              </div>
            </div>

            {/* Bottom Status Pill on Map */}
            <div className="absolute bottom-4 right-4 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-300 shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Simulated In-Transit Telemetry</span>
            </div>
          </div>

          {/* Route & Fallback Information Ribbon */}
          {loadingRoute ? (
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-2 text-xs text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="font-mono text-emerald-400">Computing route waypoints & distance...</span>
            </div>
          ) : activeRoute ? (
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  activeRoute.is_fallback
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {activeRoute.is_fallback ? 'DEMO FALLBACK: Geodesic Line' : 'Google Routes API (Road)'}
                </span>
                <span className="text-slate-300">{activeRoute.note}</span>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-slate-400">
                  Est. Distance: <strong className="text-white">{activeRoute.distance_km} km</strong>
                </span>
                <span className="text-slate-400">
                  ETA: <strong className="text-emerald-400">{activeRoute.estimated_duration_minutes} mins</strong>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Side: Simulation Control Panel & Selected Entity Inspector (1 col) */}
        <div className="space-y-4">
          
          {/* Simulation Tracking Card */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Rider Simulation
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                {simStatus}
              </span>
            </div>

            {/* Allocation Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Select Active Dispatched Parcel
              </label>
              <select
                value={selectedAllocationId}
                onChange={(e) => setSelectedAllocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {allocations.length === 0 ? (
                  <option value="">No Active Allocations (Click Auto-Allocate)</option>
                ) : (
                  allocations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.donation_item_name} ({a.quantity} {a.unit}) → {a.shelter_name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedAlloc ? (
              <div className="space-y-3 pt-1">
                {/* Route Summary */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Courier:</span>
                    <span className="font-bold text-cyan-300">{selectedAlloc.rider_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Vehicle:</span>
                    <span className="text-slate-300 truncate max-w-[140px]">{selectedAlloc.rider_vehicle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">From:</span>
                    <span className="text-slate-300 truncate max-w-[140px]">{selectedAlloc.donor_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Destination:</span>
                    <span className="text-slate-300 truncate max-w-[140px]">{selectedAlloc.shelter_name}</span>
                  </div>
                </div>

                {/* Progress Bar & Telemetry */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Route Progress:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.round(simProgress * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-150"
                      style={{ width: `${simProgress * 100}%` }}
                    />
                  </div>

                  {activeRoute && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>Est. Remaining:</span>
                      <span className="text-slate-200">
                        {Math.max(0, Math.ceil(activeRoute.estimated_duration_minutes * (1 - simProgress)))} mins
                      </span>
                    </div>
                  )}

                  {currentSimCoord && (
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[10px] text-slate-400">
                      <div>Sim Lat: {currentSimCoord.lat.toFixed(5)}°N</div>
                      <div>Sim Lng: {currentSimCoord.lng.toFixed(5)}°E</div>
                    </div>
                  )}
                </div>

                {/* Simulation Control Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {!simPlaying ? (
                    <button
                      onClick={handleStartSimulation}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-950"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{simProgress > 0 && simProgress < 1 ? 'Resume' : 'Start'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseSimulation}
                      className="py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                    >
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetSimulation}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>

                  <select
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(Number(e.target.value))}
                    className="px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono text-center focus:outline-none"
                  >
                    <option value={1}>1x Speed</option>
                    <option value={2}>2x Speed</option>
                    <option value={4}>4x Speed</option>
                  </select>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Clearly labeled DEMO movement. Not connected to real GPS hardware.</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 space-y-2">
                <Bike className="w-8 h-8 text-slate-700 mx-auto" />
                <p>Run auto-allocation to assign courier parcels and enable simulated journey tracking.</p>
              </div>
            )}
          </div>

          {/* Selected Marker Inspector */}
          {selectedEntity && (
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  {selectedEntity.type === 'donation' && 'Donation Batch Details'}
                  {selectedEntity.type === 'shelter' && 'Shelter Facility Details'}
                  {selectedEntity.type === 'rider' && 'Courier Profile'}
                </span>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-slate-500 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {selectedEntity.type === 'donation' && (
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="font-bold text-white text-sm">
                    {selectedEntity.data.item_name}
                  </div>
                  <div>Donor: {selectedEntity.data.donor_name} ({selectedEntity.data.donor_type})</div>
                  <div>Quantity: {selectedEntity.data.remaining_quantity ?? selectedEntity.data.quantity} {selectedEntity.data.unit}</div>
                  <div>Safe Window: {selectedEntity.data.safe_window_minutes} mins ({selectedEntity.data.urgency_level})</div>
                  <div className="text-slate-400 text-[11px]">{selectedEntity.data.location.address}</div>
                </div>
              )}

              {selectedEntity.type === 'shelter' && (
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="font-bold text-white text-sm">
                    {selectedEntity.data.name}
                  </div>
                  <div>Status: <span className="font-mono text-emerald-400">{selectedEntity.data.status}</span></div>
                  <div>Needed Meals: {selectedEntity.data.needed_meals}</div>
                  <div>Occupancy: {selectedEntity.data.current_occupancy}/{selectedEntity.data.capacity} spots</div>
                  <div className="text-slate-400 text-[11px]">Contact: {selectedEntity.data.contact_person} ({selectedEntity.data.phone})</div>
                </div>
              )}

              {selectedEntity.type === 'rider' && (
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="font-bold text-white text-sm">
                    {selectedEntity.data.name}
                  </div>
                  <div>Status: <span className="font-mono text-cyan-400">{selectedEntity.data.status}</span></div>
                  <div>Vehicle: {selectedEntity.data.vehicle_type}</div>
                  <div>Capacity: {selectedEntity.data.capacity_units} units (Load: {selectedEntity.data.current_load})</div>
                  <div>Reliability: {Math.round(selectedEntity.data.reliability_score * 100)}%</div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
