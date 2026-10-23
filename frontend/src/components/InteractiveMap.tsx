import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bike, 
  Play, 
  Pause, 
  RotateCcw, 
  Navigation, 
  Radio, 
  Info,
  Loader2,
  MapPin
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  donations,
  shelters,
  riders,
  allocations,
  onTriggerAutoAllocate,
  isAllocating = false,
}) => {
  // States
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

  // Leaflet DOM & Object Refs
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const leafletPolylineRef = useRef<L.Polyline | null>(null);
  const leafletSimMarkerRef = useRef<L.Marker | null>(null);

  // Default selected allocation to first available
  useEffect(() => {
    if (allocations.length > 0) {
      const exists = allocations.some((a) => a.id === selectedAllocationId);
      if (!exists) {
        setSelectedAllocationId(allocations[0].id);
      }
    } else {
      setSelectedAllocationId('');
    }
  }, [allocations, selectedAllocationId]);

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

  // ==========================================
  // LEAFLET MAP INITIALIZATION & LAYER UPDATES
  // ==========================================
  useEffect(() => {
    if (!leafletContainerRef.current) return;

    if (!leafletMapRef.current) {
      // Center of Pune Metropolitan Relief Corridor
      const map = L.map(leafletContainerRef.current, {
        center: [18.5350, 73.8567],
        zoom: 12,
        zoomControl: true,
      });

      // CartoDB Voyager tiles (clean, beautiful, high-contrast street map)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      leafletLayerGroupRef.current = layerGroup;
      leafletMapRef.current = map;

      // Invalidate size once container renders
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    const map = leafletMapRef.current;
    const layerGroup = leafletLayerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear dynamic markers from previous render
    layerGroup.clearLayers();

    // 1. Render Donation Markers
    if (showDonations) {
      donations.forEach((d) => {
        const donationIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div style="background-color: #FF8A00; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255, 138, 0, 0.45); border: 2px solid #FFFFFF; cursor: pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([d.location.latitude, d.location.longitude], { icon: donationIcon });
        marker.on('click', () => {
          setSelectedEntity({ type: 'donation', data: d });
        });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <strong style="color: #1A1A1A; font-size: 13px;">${d.item_name}</strong><br/>
            <span style="color: #00B207; font-weight: bold;">${d.remaining_quantity ?? d.quantity} ${d.unit}</span> (${d.urgency_level})<br/>
            <span style="color: #666666;">Donor: ${d.donor_name}</span><br/>
            <span style="color: #808080; font-size: 10px;">${d.location.address}</span>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // 2. Render Shelter Markers
    if (showShelters) {
      shelters.forEach((s) => {
        const isOpen = s.status === 'OPEN';
        const shelterIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div style="background-color: ${isOpen ? '#7E22CE' : '#EA4B48'}; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(126, 34, 206, 0.45); border: 2px solid #FFFFFF; cursor: pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([s.location.latitude, s.location.longitude], { icon: shelterIcon });
        marker.on('click', () => {
          setSelectedEntity({ type: 'shelter', data: s });
        });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <strong style="color: #1A1A1A; font-size: 13px;">${s.name}</strong><br/>
            <span style="color: #7E22CE; font-weight: bold;">Needed: ${s.needed_meals} meals</span> (${s.status})<br/>
            <span style="color: #666666;">Occupancy: ${s.current_occupancy}/${s.capacity} spots</span><br/>
            <span style="color: #808080; font-size: 10px;">${s.location.address}</span>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // 3. Render Volunteer Courier Markers
    if (showRiders) {
      riders.forEach((r) => {
        const riderIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div style="background-color: #2B7FDE; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(43, 127, 222, 0.45); border: 2px solid #FFFFFF; cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([r.location.latitude, r.location.longitude], { icon: riderIcon });
        marker.on('click', () => {
          setSelectedEntity({ type: 'rider', data: r });
        });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <strong style="color: #1A1A1A; font-size: 13px;">${r.name}</strong><br/>
            <span style="color: #2B7FDE; font-weight: bold;">${r.vehicle_type}</span> (${r.status})<br/>
            <span style="color: #666666;">Capacity: ${r.capacity_units} units</span> | Reliability: ${Math.round(r.reliability_score * 100)}%
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // 4. Render Active Delivery Polyline Route
    if (leafletPolylineRef.current) {
      map.removeLayer(leafletPolylineRef.current);
      leafletPolylineRef.current = null;
    }

    if (showRoutes && activeRoute && activeRoute.polyline.length > 0) {
      const latLngs: [number, number][] = activeRoute.polyline.map((p) => [p.latitude, p.longitude]);
      const polyline = L.polyline(latLngs, {
        color: activeRoute.is_fallback ? '#FF8A00' : '#00B207',
        weight: 5,
        opacity: 0.85,
        dashArray: activeRoute.is_fallback ? '8, 8' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      leafletPolylineRef.current = polyline;

      // Fit map bounds to show route if progress is at 0
      if (simProgress === 0 && latLngs.length > 1) {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    }

    // 5. Render Simulated Moving Courier Marker
    if (leafletSimMarkerRef.current) {
      map.removeLayer(leafletSimMarkerRef.current);
      leafletSimMarkerRef.current = null;
    }

    if (currentSimCoord) {
      const simIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; background-color: rgba(0, 178, 7, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 36px; height: 36px; background-color: #00B207; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0, 178, 7, 0.5); border: 2.5px solid #FFFFFF;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
            <div style="position: absolute; top: 100%; margin-top: 2px; background: #1A1A1A; color: #FFFFFF; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
              ${Math.round(simProgress * 100)}%
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const simMarker = L.marker([currentSimCoord.lat, currentSimCoord.lng], { icon: simIcon, zIndexOffset: 1000 }).addTo(map);
      leafletSimMarkerRef.current = simMarker;
    }

  }, [
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-[#EAF8E7] via-white to-[#F8FAF8] border border-[#BDE5BA] rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-[#00B207] text-white rounded-xl shadow-sm shadow-[#00B207]/30">
                <Navigation className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#1A1A1A]">
                    Live Relief Corridor & Courier GPS Tracking
                  </h2>
                  <span className="text-[10px] bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] px-2.5 py-0.5 rounded-full font-bold">
                    LIVE STREET MAP
                  </span>
                </div>
                <p className="text-xs text-[#666666] mt-1 max-w-2xl leading-relaxed">
                  Real-time geographic visualization of perishable aid pickup corridors, flood shelters, 
                  courier telemetry, and automated delivery progress across the Pune urban relief corridor.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onTriggerAutoAllocate && (
              <button
                onClick={onTriggerAutoAllocate}
                disabled={isAllocating}
                className="px-4 py-2 bg-[#00B207] hover:bg-[#008A05] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#00B207]/25 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Radio className="w-4 h-4" />
                <span>Auto-Allocate Aid</span>
              </button>
            )}

            <div className="p-2.5 bg-white border border-[#E6E6E6] rounded-xl text-right shadow-sm">
              <span className="text-[10px] text-[#808080] font-mono block">Geographic Corridor</span>
              <span className="text-xs font-mono font-bold text-[#2C742F]">
                Pune Urban Relief Grid (18.52°N, 73.85°E)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Viewport & Tracking Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Map Container (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          
          {/* Map Card */}
          <div className="relative bg-white border border-[#E6E6E6] rounded-2xl overflow-hidden shadow-lg h-[580px]">
            
            {/* Live Leaflet Real Street Map */}
            <div 
              ref={leafletContainerRef} 
              className="w-full h-full z-10" 
            />

            {/* Top Left Corridor Watermark Pill */}
            <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur-md border border-[#E6E6E6] px-3.5 py-2 rounded-xl text-xs shadow-md pointer-events-none space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A]">
                <MapPin className="w-3.5 h-3.5 text-[#00B207]" />
                <span>Pune Disaster Relief Corridor</span>
              </div>
              <p className="text-[10px] text-[#666666]">
                Hinjewadi ↔ Shivajinagar ↔ Camp ↔ Koregaon Park ↔ Viman Nagar
              </p>
            </div>

            {/* Top Right Legend & Filter Controls */}
            <div className="absolute top-4 right-4 z-40 bg-white/95 backdrop-blur-md border border-[#E6E6E6] p-3 rounded-2xl shadow-xl space-y-2 text-xs">
              <div className="text-[10px] uppercase font-bold text-[#808080] tracking-wider">
                Corridor Layers
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-[#1A1A1A] hover:text-[#00B207]">
                  <input
                    type="checkbox"
                    checked={showDonations}
                    onChange={(e) => setShowDonations(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#FF8A00] rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A00]" />
                  <span>Donations ({donations.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#1A1A1A] hover:text-[#00B207]">
                  <input
                    type="checkbox"
                    checked={showShelters}
                    onChange={(e) => setShowShelters(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#7E22CE] rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7E22CE]" />
                  <span>Shelters ({shelters.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#1A1A1A] hover:text-[#00B207]">
                  <input
                    type="checkbox"
                    checked={showRiders}
                    onChange={(e) => setShowRiders(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#2B7FDE] rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2B7FDE]" />
                  <span>Couriers ({riders.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#1A1A1A] hover:text-[#00B207]">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#00B207] rounded"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00B207]" />
                  <span>Delivery Route</span>
                </label>
              </div>
            </div>

            {/* Bottom Status Pill on Map */}
            <div className="absolute bottom-4 right-4 z-40 bg-white/95 backdrop-blur-md border border-[#E6E6E6] px-3.5 py-1.5 rounded-xl text-[11px] font-mono text-[#2C742F] shadow-lg flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#00B207] animate-pulse" />
              <span>Real Pune Street Tiles · High Precision GPS</span>
            </div>
          </div>

          {/* Route & Fallback Information Ribbon */}
          {loadingRoute ? (
            <div className="p-3.5 bg-white border border-[#E6E6E6] rounded-xl flex items-center gap-2 text-xs text-[#666666] shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#00B207]" />
              <span className="font-mono text-[#2C742F]">Computing route waypoints & distance...</span>
            </div>
          ) : activeRoute ? (
            <div className="p-3.5 bg-white border border-[#E6E6E6] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  activeRoute.is_fallback
                    ? 'bg-[#FFF3E5] text-[#D97706] border-[#FDE3B7]'
                    : 'bg-[#EAF8E7] text-[#2C742F] border-[#BDE5BA]'
                }`}>
                  {activeRoute.is_fallback ? 'DEMO FALLBACK: Geodesic Line' : 'Pune Road Corridor Route'}
                </span>
                <span className="text-[#4D4D4D]">{activeRoute.note}</span>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[#666666]">
                  Est. Distance: <strong className="text-[#1A1A1A]">{activeRoute.distance_km} km</strong>
                </span>
                <span className="text-[#666666]">
                  ETA: <strong className="text-[#00B207]">{activeRoute.estimated_duration_minutes} mins</strong>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Side: Simulation Control Panel & Selected Entity Inspector (1 col) */}
        <div className="space-y-4">
          
          {/* Simulation Tracking Card */}
          <div className="p-5 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F2]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00B207]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Rider Simulation
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA]">
                {simStatus}
              </span>
            </div>

            {/* Allocation Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1A1A1A]">
                Select Active Dispatched Parcel
              </label>
              <select
                value={selectedAllocationId}
                onChange={(e) => setSelectedAllocationId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF8] border border-[#E6E6E6] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00B207] transition-colors"
              >
                {allocations.length === 0 ? (
                  <option value="">No Active Allocations (Click Auto-Allocate)</option>
                ) : (
                  allocations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.donation_item_name} ({a.quantity} {a.unit}) → {a.shelter_name} {a.status === 'REROUTED' ? '⚠️ [REROUTED]' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedAlloc ? (
              <div className="space-y-3 pt-1">
                {/* Route Summary */}
                <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Courier:</span>
                    <span className="font-bold text-[#2B7FDE]">{selectedAlloc.rider_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Vehicle:</span>
                    <span className="text-[#1A1A1A] truncate max-w-[140px]">{selectedAlloc.rider_vehicle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">From:</span>
                    <span className="text-[#1A1A1A] truncate max-w-[140px]">{selectedAlloc.donor_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Destination:</span>
                    <div className="text-right">
                      <span className="text-[#1A1A1A] truncate max-w-[140px] block font-semibold">{selectedAlloc.shelter_name}</span>
                      {selectedAlloc.original_shelter_name && (
                        <span className="text-[10px] font-mono text-[#D97706] block">
                          (Rerouted from {selectedAlloc.original_shelter_name})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Telemetry */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#666666]">Route Progress:</span>
                    <span className="font-mono font-bold text-[#00B207]">
                      {Math.round(simProgress * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#E6E6E6] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#00B207] to-[#2C742F] h-2 rounded-full transition-all duration-150"
                      style={{ width: `${simProgress * 100}%` }}
                    />
                  </div>

                  {activeRoute && (
                    <div className="flex items-center justify-between text-[11px] text-[#666666] font-mono pt-1">
                      <span>Est. Remaining:</span>
                      <span className="text-[#1A1A1A] font-semibold">
                        {Math.max(0, Math.ceil(activeRoute.estimated_duration_minutes * (1 - simProgress)))} mins
                      </span>
                    </div>
                  )}

                  {currentSimCoord && (
                    <div className="p-2 bg-[#F8FAF8] rounded-lg border border-[#E6E6E6] font-mono text-[10px] text-[#666666]">
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
                      className="py-2 px-3 bg-[#00B207] hover:bg-[#008A05] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{simProgress > 0 && simProgress < 1 ? 'Resume' : 'Start'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseSimulation}
                      className="py-2 px-3 bg-[#FF8A00] hover:bg-[#e07b00] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                    >
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetSimulation}
                    className="py-2 px-3 bg-[#F2F7F2] hover:bg-[#EAF8E7] text-[#2C742F] font-semibold rounded-xl text-xs flex items-center justify-center gap-1 border border-[#BDE5BA]"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#00B207]" />
                    <span>Reset</span>
                  </button>

                  <select
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(Number(e.target.value))}
                    className="px-2 py-2 bg-[#F8FAF8] border border-[#E6E6E6] rounded-xl text-xs text-[#1A1A1A] font-mono text-center focus:outline-none"
                  >
                    <option value={1}>1x Speed</option>
                    <option value={2}>2x Speed</option>
                    <option value={4}>4x Speed</option>
                  </select>
                </div>

                <div className="p-2.5 bg-[#F8FAF8] rounded-xl border border-[#E6E6E6] text-[10px] text-[#666666] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#2B7FDE] shrink-0" />
                  <span>Simulated GPS journey movement along the active Pune relief corridor.</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#808080] space-y-2">
                <Bike className="w-8 h-8 text-[#CCCCCC] mx-auto" />
                <p>Run auto-allocation to assign courier parcels and enable simulated journey tracking.</p>
              </div>
            )}
          </div>

          {/* Selected Marker Inspector */}
          {selectedEntity && (
            <div className="p-4 bg-white border border-[#E6E6E6] rounded-2xl shadow-sm space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#F2F2F2]">
                <span className="text-[10px] uppercase font-mono font-bold text-[#808080]">
                  {selectedEntity.type === 'donation' && 'Donation Batch Details'}
                  {selectedEntity.type === 'shelter' && 'Shelter Facility Details'}
                  {selectedEntity.type === 'rider' && 'Courier Profile'}
                </span>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-[#999999] hover:text-[#1A1A1A] text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {selectedEntity.type === 'donation' && (
                <div className="text-xs space-y-1 text-[#4D4D4D]">
                  <div className="font-bold text-[#1A1A1A] text-sm">
                    {selectedEntity.data.item_name}
                  </div>
                  <div>Donor: {selectedEntity.data.donor_name} ({selectedEntity.data.donor_type})</div>
                  <div>Quantity: <strong className="text-[#00B207]">{selectedEntity.data.remaining_quantity ?? selectedEntity.data.quantity} {selectedEntity.data.unit}</strong></div>
                  <div>Safe Window: {selectedEntity.data.safe_window_minutes} mins ({selectedEntity.data.urgency_level})</div>
                  <div className="text-[#808080] text-[11px]">{selectedEntity.data.location.address}</div>
                </div>
              )}

              {selectedEntity.type === 'shelter' && (
                <div className="text-xs space-y-1 text-[#4D4D4D]">
                  <div className="font-bold text-[#1A1A1A] text-sm">
                    {selectedEntity.data.name}
                  </div>
                  <div>Status: <span className="font-mono font-bold text-[#00B207]">{selectedEntity.data.status}</span></div>
                  <div>Needed Meals: <strong className="text-[#00B207]">{selectedEntity.data.needed_meals}</strong></div>
                  <div>Occupancy: {selectedEntity.data.current_occupancy}/{selectedEntity.data.capacity} spots</div>
                  <div className="text-[#808080] text-[11px]">Contact: {selectedEntity.data.contact_person} ({selectedEntity.data.phone})</div>
                </div>
              )}

              {selectedEntity.type === 'rider' && (
                <div className="text-xs space-y-1 text-[#4D4D4D]">
                  <div className="font-bold text-[#1A1A1A] text-sm">
                    {selectedEntity.data.name}
                  </div>
                  <div>Status: <span className="font-mono font-bold text-[#2B7FDE]">{selectedEntity.data.status}</span></div>
                  <div>Vehicle: {selectedEntity.data.vehicle_type}</div>
                  <div>Capacity: {selectedEntity.data.capacity_units} units (Load: {selectedEntity.data.current_load})</div>
                  <div>Reliability: <strong className="text-[#FF8A00]">{Math.round(selectedEntity.data.reliability_score * 100)}%</strong></div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
