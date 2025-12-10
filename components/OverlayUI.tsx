import React, { useState } from 'react';
import { MIN_YEAR, MAX_YEAR } from '../constants';
import { ClimateData } from '../types';

interface OverlayUIProps {
  year: number;
  setYear: (year: number) => void;
  seaLevelRise: number;
  onSearch: (city: string) => void;
  loading: boolean;
  loadingData: boolean;
  climateData: ClimateData | null;
}

export const OverlayUI: React.FC<OverlayUIProps> = ({ 
  year, 
  setYear, 
  seaLevelRise, 
  onSearch,
  loading,
  loadingData,
  climateData
}) => {
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput);
    }
  };

  // Dynamic color for flood level text
  const getFloodLevelColor = (level: number) => {
    if (level <= 0.2) return "text-blue-400"; // Safe/Normal
    if (level < 2.0) return "text-yellow-400"; // Warning
    return "text-red-500"; // Danger
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      
      {/* Header & Search */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-6 rounded-xl border border-white/10 max-w-sm shadow-2xl transition-all duration-300 hover:shadow-blue-900/20">
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tighter">
          IMPACT<span className="text-blue-500">ATLAS</span>
        </h1>
        <p className="text-gray-400 text-xs mb-4 font-mono">
          AI-Powered Climate Simulation Engine
        </p>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            type="text" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter City (e.g., Shanghai)"
            className="w-full bg-black/40 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-500"
          />
          <button 
            type="submit"
            disabled={loadingData}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingData ? "..." : "Simulate"}
          </button>
        </form>
      </div>

      {/* Loading Indicator */}
      {(loading || loadingData) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/80 px-8 py-4 rounded-full border border-blue-500/30 backdrop-blur-xl flex items-center gap-4 shadow-2xl shadow-blue-900/20">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
              <span className="text-blue-100 font-mono text-sm tracking-wide">
                {loading ? "INITIALIZING DIGITAL TWIN..." : "GENERATING RISK SCENARIO..."}
              </span>
            </div>
        </div>
      )}

      {/* Data Panel */}
      {climateData && !loadingData && (
        <div className="absolute top-40 right-6 pointer-events-auto w-80 bg-slate-900/90 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-2xl space-y-4 animate-fadeIn">
           <div>
             <div className="flex justify-between items-center mb-1">
               <h2 className="text-lg font-bold text-white truncate">{climateData.location}</h2>
               <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300 font-mono">
                 Scenario: {year}
               </span>
             </div>
             
             <div className="mt-3 bg-red-950/40 border-l-2 border-red-500 p-3 rounded-r">
               <p className="text-sm text-gray-200 leading-snug italic">
                 "{climateData.narrative}"
               </p>
             </div>
           </div>

           <div className="bg-white/5 p-3 rounded-lg border border-white/5">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: climateData.building_style.risk_color_hex, boxShadow: `0 0 10px ${climateData.building_style.risk_color_hex}` }}></div>
                <div className="text-xs text-gray-300 font-medium uppercase tracking-wider">Infrastructure Risk</div>
             </div>
             <p className="text-xs text-gray-400 leading-relaxed">
               {climateData.building_style.description}
             </p>
           </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="pointer-events-auto w-full max-w-3xl mx-auto bg-slate-900/90 backdrop-blur-md p-6 rounded-t-2xl border-t border-x border-white/10 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Timeline</div>
            <div className="text-5xl font-mono font-bold text-white tracking-tighter">
              {year}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Projected Sea Level Rise</div>
            <div className={`text-3xl font-mono font-bold transition-colors duration-500 ${getFloodLevelColor(seaLevelRise)}`}>
              +{seaLevelRise.toFixed(2)}m
            </div>
          </div>
        </div>

        <div className="relative h-6 flex items-center">
             <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
            />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-2 uppercase">
            <span>Present Day ({MIN_YEAR})</span>
            <span>Business as Usual ({MAX_YEAR})</span>
        </div>
      </div>
    </div>
  );
};