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
  // Sandbox Props
  isSandboxMode: boolean;
  setSandboxMode: (mode: boolean) => void;
  manualSeaLevel: number;
  setManualSeaLevel: (level: number) => void;
  stormCategory: number;
  setStormCategory: (cat: number) => void;
  isDefended: boolean;
  toggleDefense: () => void;
}

export const OverlayUI: React.FC<OverlayUIProps> = ({ 
  year, setYear, seaLevelRise, onSearch, loading, loadingData, climateData,
  isSandboxMode, setSandboxMode, manualSeaLevel, setManualSeaLevel,
  stormCategory, setStormCategory, isDefended, toggleDefense
}) => {
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) onSearch(searchInput);
  };

  const getFloodLevelColor = (level: number) => {
    if (level <= 0.2) return "text-blue-400";
    if (level < 2.0) return "text-yellow-400";
    return "text-red-500";
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      
      {/* Header & Controls - Reduced padding to p-5 to keep tab size constrained */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-5 rounded-xl border border-white/10 max-w-sm shadow-2xl space-y-4">
        
        {/* --- LOGO SECTION --- */}
        <div className="flex items-center gap-3">
            {/* Larger Logo Size (w-28) */}
            <img 
              src="/logo.png" 
              alt="Impact Atlas Logo" 
              className="w-28 h-28 object-contain drop-shadow-md shrink-0" 
            />
            <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tighter leading-none">
                IMPACT<span className="text-blue-500">ATLAS</span>
                </h1>
                <div className="flex gap-2 text-[10px] font-mono mt-1">
                    <button 
                        onClick={() => setSandboxMode(false)}
                        className={`px-2 py-1 rounded ${!isSandboxMode ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                        TIMELINE
                    </button>
                    <button 
                        onClick={() => setSandboxMode(true)}
                        className={`px-2 py-1 rounded ${isSandboxMode ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                        SANDBOX
                    </button>
                </div>
            </div>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            type="text" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter City..."
            className="w-full bg-black/40 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
          />
          <button type="submit" disabled={loadingData} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium">
            LOAD
          </button>
        </form>

        {/* SANDBOX CONTROLS */}
        {isSandboxMode && (
            <div className="space-y-4 pt-4 border-t border-white/10 animate-fadeIn">
                {/* Sea Level Input (Slider + Text) */}
                <div>
                    <div className="flex justify-between items-center text-xs text-gray-300 mb-2">
                        <span className="font-bold uppercase">Manual Sea Level (m)</span>
                        <input
                            type="number"
                            min={0}
                            max={20}
                            step={0.1}
                            value={manualSeaLevel}
                            onChange={(e) => setManualSeaLevel(Math.max(0, Number(e.target.value)))}
                            className="w-16 bg-black/50 border border-gray-600 rounded px-2 py-1 text-right text-blue-400 font-mono focus:border-blue-500 outline-none"
                        />
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.1}
                        value={manualSeaLevel}
                        onChange={(e) => setManualSeaLevel(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                {/* Storm Category Buttons */}
                <div>
                    <div className="text-xs text-gray-300 mb-2 font-bold uppercase">Storm Category</div>
                    <div className="grid grid-cols-6 gap-1">
                        {[0, 1, 2, 3, 4, 5].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setStormCategory(cat)}
                                className={`py-1 rounded text-xs font-bold transition-colors ${
                                    stormCategory === cat 
                                    ? (cat === 0 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white') 
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                                {cat === 0 ? 'None' : `${cat}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* DEFENSE TOGGLE */}
        <button 
          onClick={toggleDefense}
          className={`w-full py-2 px-3 rounded text-sm font-bold transition-all border ${isDefended ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-blue-600/20 border-blue-500/50 text-blue-200 hover:bg-blue-600/40'}`}
        >
          {isDefended ? "✓ SEA WALL ACTIVE" : "+ BUILD SEA WALL"}
        </button>
      </div>

      {/* Loading & Data Panels */}
      {(loading || loadingData) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/80 px-8 py-4 rounded-full border border-purple-500/30 backdrop-blur-xl flex items-center gap-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-ping" />
              <span className="text-purple-100 font-mono text-sm tracking-wide">
                SIMULATING PHYSICS...
              </span>
            </div>
        </div>
      )}

      {/* CLIMATE DATA PANEL */}
      {climateData && !loadingData && (
        <div className="absolute top-6 right-6 pointer-events-auto w-80 max-h-[85vh] overflow-y-auto custom-scrollbar bg-slate-900/90 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-2xl space-y-4 animate-fadeIn">
           <div>
             <div className="flex justify-between items-center mb-1">
               <h2 className="text-lg font-bold text-white truncate">{climateData.location}</h2>
               <span className={`text-xs px-2 py-0.5 rounded font-mono ${isDefended ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                 {isDefended ? 'MITIGATED' : 'IMPACT ANALYSIS'}
               </span>
             </div>
             <p className="text-sm text-gray-300 leading-snug mt-2 border-l-2 border-purple-500 pl-3">"{climateData.narrative}"</p>
           </div>
           
           {climateData.impact_analysis && (
             <div className="space-y-2">
                <div className="bg-red-950/30 p-2 rounded border border-red-500/20 flex gap-3 items-start">
                    <span className="text-xl mt-1">🏥</span>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-red-400 font-bold mb-0.5">HOSPITALS</div>
                        <div className="text-xs text-gray-300 break-words leading-snug">
                            {climateData.impact_analysis.hospitals}
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-950/30 p-2 rounded border border-yellow-500/20 flex gap-3 items-start">
                    <span className="text-xl mt-1">⚡</span>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-yellow-400 font-bold mb-0.5">POWER</div>
                        <div className="text-xs text-gray-300 break-words leading-snug">
                            {climateData.impact_analysis.power_grid}
                        </div>
                    </div>
                </div>

                <div className="bg-blue-950/30 p-2 rounded border border-blue-500/20 flex gap-3 items-start">
                    <span className="text-xl mt-1">💰</span>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-blue-400 font-bold mb-0.5">LOSS</div>
                        <div className="text-xs text-gray-300 break-words leading-snug">
                            {climateData.impact_analysis.economic_loss}
                        </div>
                    </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* TIMELINE FOOTER (Only show if NOT in sandbox mode) */}
      {!isSandboxMode && (
        <div className="pointer-events-auto w-full max-w-3xl mx-auto bg-slate-900/90 backdrop-blur-md p-6 rounded-t-2xl border-t border-x border-white/10">
          
          <div className="flex items-end justify-between mb-4">
            {/* Left: Year Display & Storm Toggle */}
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Timeline</div>
              <div className="text-5xl font-mono font-bold text-white tracking-tighter flex items-center gap-4">
                {year}
                
                {/* STORM SIMULATION TOGGLE */}
                <button
                  onClick={() => setStormCategory(stormCategory === 0 ? 3 : 0)}
                  className={`text-xs px-3 py-1 rounded border tracking-widest transition-all ${
                    stormCategory > 0 
                      ? "bg-red-600 border-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]" 
                      : "bg-white/5 border-white/20 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {stormCategory > 0 ? "⚠️ STORM ACTIVE (CAT 3)" : "+ SIMULATE STORM"}
                </button>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="text-right">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                 Total Flood Level
              </div>
              <div className={`text-3xl font-mono font-bold transition-colors duration-500 ${getFloodLevelColor(seaLevelRise)}`}>
                +{seaLevelRise.toFixed(2)}m
              </div>
              {stormCategory > 0 && (
                 <div className="text-[10px] text-red-400 font-mono mt-1">
                   INCLUDES +2.0m SURGE
                 </div>
              )}
            </div>
          </div>

          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}
    </div>
  );
};