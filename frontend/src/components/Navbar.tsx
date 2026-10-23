import React, { useState } from 'react';
import { 
  Leaf,
  LayoutDashboard, 
  Package, 
  Bike, 
  Building2, 
  Radio, 
  Cpu, 
  Navigation,
  RefreshCw, 
  Menu, 
  X, 
  WifiOff,
  MapPin,
  PhoneCall,
  Search,
  Sparkles
} from 'lucide-react';
import { NavTab } from '../types';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  backendHealthy: boolean | null;
  lastUpdated: string | null;
  onOpenCreateDonation?: () => void;
  onTriggerAutoAllocate?: () => void;
  isAllocating?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  backendHealthy,
  lastUpdated,
  onOpenCreateDonation,
  onTriggerAutoAllocate,
  isAllocating
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'map', label: 'Live Map', icon: <Navigation className="w-4 h-4" />, badge: 'GPS' },
    { id: 'donations', label: 'Food & Aid Batches', icon: <Package className="w-4 h-4" /> },
    { id: 'riders', label: 'Volunteer Riders', icon: <Bike className="w-4 h-4" /> },
    { id: 'shelters', label: 'Relief Shelters', icon: <Building2 className="w-4 h-4" /> },
    { id: 'dispatch', label: 'Real-Time Dispatch', icon: <Radio className="w-4 h-4" />, badge: 'Active' },
    { id: 'simulation', label: 'Chaos Simulation', icon: <Cpu className="w-4 h-4" />, badge: 'Lab' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onTabChange('donations');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E6E6E6] shadow-sm">
      {/* 1. Shopery Utility Top Bar */}
      <div className="bg-[#EDF2EE] text-xs text-[#4D4D4D] border-b border-[#E2EBE2] py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#00B207]" />
            <span className="font-medium text-[#2C742F]">Pune Civic Relief Corridor:</span>
            <span className="hidden sm:inline text-[#666666]">100% Zero-Waste Food Salvage & Rapid Dispatch Network</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-1.5 text-[#666666]">
              <PhoneCall className="w-3.5 h-3.5 text-[#00B207]" />
              <span>Emergency Desk:</span>
              <span className="font-semibold text-[#1A1A1A]">+91 20 2612 0000</span>
            </div>

            <div className="h-3 w-px bg-[#D0DCD0] hidden md:block" />

            {/* Live Backend Connection Indicator */}
            <div className="flex items-center gap-1.5">
              {backendHealthy === true ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#00B207] animate-pulse" />
                  <span className="text-[#2C742F] font-semibold text-[11px]">API Live</span>
                </>
              ) : backendHealthy === false ? (
                <>
                  <WifiOff className="w-3 h-3 text-[#EA4B48]" />
                  <span className="text-[#EA4B48] font-semibold text-[11px]">API Offline</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#FF8A00] animate-pulse" />
                  <span className="text-[#FF8A00] font-semibold text-[11px]">Syncing...</span>
                </>
              )}
            </div>

            {lastUpdated && (
              <span className="text-[11px] text-[#808080] hidden lg:inline font-mono">
                {lastUpdated}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Shopery Main Header (Brand + Search + Quick Actions) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-3 cursor-pointer group select-none flex-shrink-0"
          >
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#00B207] text-white shadow-md shadow-[#00B207]/25 group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 fill-white stroke-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF8A00] rounded-full border-2 border-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-[#1A1A1A]">
                  The<span className="text-[#00B207]">Saviour</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase bg-[#EAF8E7] text-[#2C742F] border border-[#BDE5BA] px-2 py-0.5 rounded-full">
                  ORGANIC AID
                </span>
              </div>
              <p className="text-[11px] text-[#808080] font-normal leading-tight hidden sm:block">
                Zero-Waste Food Logistics & Civic Dispatch
              </p>
            </div>
          </div>

          {/* Search Bar - Shopery eCommerce Style */}
          <form 
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-lg items-center relative border-2 border-[#E6E6E6] focus-within:border-[#00B207] rounded-lg overflow-hidden transition-colors"
          >
            <div className="flex items-center pl-3 pr-2 text-[#999999]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search surplus meals, bakery, rations, medicine, shelters..."
              className="w-full py-2 text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#00B207] hover:bg-[#008A05] text-white text-xs font-semibold px-5 py-2.5 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Quick Auto-Allocate CTA if provided */}
            {onTriggerAutoAllocate && (
              <button
                onClick={onTriggerAutoAllocate}
                disabled={isAllocating}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#EAF8E7] hover:bg-[#d8f3d4] text-[#2C742F] border border-[#BDE5BA] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00B207]" />
                <span>Auto-Allocate</span>
              </button>
            )}

            {/* Quick Add Donation CTA if provided */}
            {onOpenCreateDonation && (
              <button
                onClick={onOpenCreateDonation}
                className="inline-flex items-center gap-1.5 bg-[#00B207] hover:bg-[#008A05] text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-[#00B207]/25"
              >
                <span>+ Donate Food</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh live data"
              className="p-2 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F2F2F2] border border-[#E6E6E6] rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00B207]' : ''}`} />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#4D4D4D] hover:text-[#1A1A1A] hover:bg-[#F2F2F2] border border-[#E6E6E6] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Shopery Category / Tab Navigation Bar */}
      <div className="bg-[#1A1A1A] text-white hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all relative ${
                    isActive
                      ? 'text-white bg-[#00B207] font-semibold'
                      : 'text-[#CCCCCC] hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-[#00B207]' : 'bg-[#333333] text-[#AAAAAA]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden py-3 px-4 border-t border-[#E6E6E6] bg-white space-y-1 shadow-lg">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="mb-3 flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search donations, shelters..."
              className="flex-1 px-3 py-2 border border-[#E6E6E6] rounded-lg text-xs"
            />
            <button type="submit" className="bg-[#00B207] text-white px-3 py-2 rounded-lg text-xs font-semibold">
              Search
            </button>
          </form>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium ${
                  isActive
                    ? 'bg-[#EAF8E7] text-[#00B207] font-bold border border-[#BDE5BA]'
                    : 'text-[#4D4D4D] hover:bg-[#F2F2F2]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#EDF2EE] text-[#4D4D4D] font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
