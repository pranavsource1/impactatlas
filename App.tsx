import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CesiumViewer } from './components/CesiumViewer';
import { OverlayUI } from './components/OverlayUI';
import { AiAssistant } from './components/AiAssistant';
import { CHRONOS_SYSTEM_INSTRUCTION, NEWS_SYSTEM_INSTRUCTION, CHAT_SYSTEM_INSTRUCTION } from './constants';
import { ClimateData, LatLon, ChatMessage, NewsHeadline } from './types';

// --- GROQ CONFIGURATION ---
const API_KEY = process.env.GROQ_API_KEY;
const API_URL = "/api/groq/openai/v1/chat/completions";
const MODEL_NAME = "llama-3.3-70b-versatile";

function App() {
  // --- STATE ---
  const [year, setYear] = useState<number>(2025);
  const [searchQuery, setSearchQuery] = useState<string>("New York, USA");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  
  const [apiStatus, setApiStatus] = useState<string>("Groq Ready");

  // Modes
  const [isSandboxMode, setSandboxMode] = useState(false);
  const [manualSeaLevel, setManualSeaLevel] = useState(0);
  const [stormCategory, setStormCategory] = useState(0);
  const [isDefended, setIsDefended] = useState(false);

  // AI Features
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [newsHeadlines, setNewsHeadlines] = useState<NewsHeadline[]>([]);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLoaded = useCallback(() => setIsLoaded(true), []);

  // ---------------------------------------------------------------------------
  // 0. SCIENTIFIC DATA GENERATOR (Updated: Global vs US Projections)
  // ---------------------------------------------------------------------------
  
  // New logic based on provided text:
  // Global: 0.10m by 2040
  // US: 0.30m by 2050
  const calculateScientificRise = (targetYear: number, location: string) => {
      const deltaY = targetYear - 2000; // Baseline 2000
      if (deltaY < 0) return 0;

      const isUS = location.toLowerCase().includes("usa") || 
                   location.toLowerCase().includes("united states") || 
                   location.toLowerCase().includes("new york") ||
                   location.toLowerCase().includes("miami");

      if (isUS) {
         // US Scenario: Target ~0.30m by 2050 (delta 50)
         // Curve: y = 0.00012 * x^2 (Matches 0.3m at 50)
         return 0.00012 * Math.pow(deltaY, 2);
      } else {
         // Global Mean Scenario: Target ~0.10m by 2040 (delta 40)
         // Curve: y = 0.0000625 * x^2 (Matches 0.1m at 40)
         return 0.0000625 * Math.pow(deltaY, 2);
      }
  };

  const getMockData = (location: string, year: number, seaLevel: number): ClimateData => {
    return {
        location: location,
        coordinates: { lat: 40.7128, lon: -74.0060 },
        flood_altitude_meters: parseFloat(seaLevel.toFixed(2)),
        building_style: {
            risk_color_hex: "#EF4444", // Tailwind Red-500
            safe_color_hex: "#94A3B8", // Tailwind Slate-400
            description: `Simulated high-risk zones for ${location} based on IPCC SSP5-8.5.`
        },
        impact_analysis: {
            hospitals: seaLevel > 1.0 ? "Basement critical systems flooded." : "Operational, flood barriers active.",
            power_grid: seaLevel > 0.5 ? "Local substations compromised." : "Stable.",
            transportation: seaLevel > 0.3 ? "Coastal roads and tunnels closed." : "Minor delays.",
            economic_loss: `$${(seaLevel * 12.5).toFixed(1)} Billion (est).`
        },
        narrative: `By ${year}, ${location} faces a projected ${seaLevel.toFixed(2)}m rise. (Global Mean projection: 0.10m by 2040).`
    };
  };

  const getMockNews = (location: string) => [
      `ALERT: ${location} coastal flood warning active.`,
      "SCIENCE: New data confirms 4.3mm/year sea level acceleration.",
      "INFRASTRUCTURE: 2040 flood targets revised.",
      "MARKET: Insurance premiums rise in coastal sectors."
  ];

  // ---------------------------------------------------------------------------
  // 1. GROQ API CALLER
  // ---------------------------------------------------------------------------
  const callGroq = async (systemPrompt: string, userPrompt: string): Promise<string> => {
    if (!API_KEY) {
      setApiStatus("Offline Mode");
      throw new Error("NO_KEY");
    }

    try {
      setApiStatus("Analyzing...");
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 1024,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setApiStatus("Live Data");
      return data.choices[0]?.message?.content || "";
    } catch (e) {
      setApiStatus("Simulation Mode");
      throw e;
    }
  };

  // ---------------------------------------------------------------------------
  // 2. SIMULATION LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const runSimulation = async () => {
      setLoadingData(true);
      
      // REALISTIC CALCULATION (Updated with Location Awareness)
      let rise = isSandboxMode 
        ? manualSeaLevel 
        : calculateScientificRise(year, searchQuery);

      // Add Storm Surge (Customized for Hackathon Narrative)
      if (stormCategory > 0) {
          if (stormCategory === 3) {
            rise += 2.0; // Force exactly 2.0m for Cat 3
          } else {
            rise += (stormCategory * 0.7); // Approximate scale for other categories
          }
      }
      
      // Subtract Defenses
      if (isDefended) {
          rise = Math.max(0, rise - 2.5); // Standard Seawall Height ~2.5m
      }

      let scenario = isSandboxMode 
        ? `Manual Simulation: +${rise.toFixed(2)}m (Cat ${stormCategory})` 
        : `Year ${year} (Updated 2025-2050 Projections)`;

      try {
        const system = `${CHRONOS_SYSTEM_INSTRUCTION}\nIMPORTANT: Output valid JSON object only.`;
        const user = `Location: ${searchQuery}\nScenario: ${scenario}\nCalculated Base Rise: ${rise.toFixed(2)}m`;
        
        const text = await callGroq(system, user);
        const data = JSON.parse(text) as ClimateData;
        
        // --- FIX: TIGHTER OVERRIDE CHECK ---
        // Changed threshold from 1.0 to 0.1 to prevent AI from Hallucinating a Cat 1 storm
        // when we only want the baseline safe level (~0.07m).
        if (Math.abs(data.flood_altitude_meters - rise) > 0.1) {
            console.log(`Overriding AI value (${data.flood_altitude_meters}m) with Math (${rise}m)`);
            data.flood_altitude_meters = parseFloat(rise.toFixed(2));
        }
        
        setClimateData(data);
        fetchNews(data.location, scenario, data.narrative);

      } catch (error) {
        // Fallback to Simulation Mode
        setClimateData(getMockData(searchQuery, year, Number(rise.toFixed(2))));
        
        const mockNews = getMockNews(searchQuery);
        setNewsHeadlines(mockNews.map((t, i) => ({
            id: `mock-${i}`, text: t, source: i % 2 === 0 ? 'CityOS' : 'Global Wire'
        })));
      } finally {
        setLoadingData(false);
      }
    };

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(runSimulation, 800);
    return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
  }, [year, searchQuery, isSandboxMode, manualSeaLevel, stormCategory, isDefended]);

  // ---------------------------------------------------------------------------
  // 3. NEWS LOGIC
  // ---------------------------------------------------------------------------
  const fetchNews = useCallback(async (location: string, scenario: string, impact: string) => {
    try {
      if (!API_KEY) throw new Error("Skipping News API");
      const system = `${NEWS_SYSTEM_INSTRUCTION}\nIMPORTANT: Output a JSON object with a key 'headlines' containing an array of strings.`;
      const user = `Context: ${location}, ${scenario}, ${impact}`;
      const text = await callGroq(system, user);
      
      const json = JSON.parse(text);
      const headlines = json.headlines || json;
      
      if (Array.isArray(headlines)) {
          setNewsHeadlines(headlines.map((t: string, i: number) => ({
              id: `news-${Date.now()}-${i}`, text: t, source: i % 2 === 0 ? 'CityOS' : 'Global Wire'
          })));
      }
    } catch (e) {
      // Ignore news errors
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 4. CHAT LOGIC
  // ---------------------------------------------------------------------------
  const handleSendChat = useCallback(async (msg: string) => {
    const newUserMsg: ChatMessage = { role: 'user', text: msg, timestamp: new Date() };
    setChatHistory(prev => [...prev, newUserMsg]);
    setLoadingChat(true);

    try {
        if (!API_KEY) throw new Error("NO_KEY");
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODEL_NAME,
              messages: [
                { role: "system", content: CHAT_SYSTEM_INSTRUCTION },
                { role: "user", content: `Context: ${climateData?.location}, Sea Level ${climateData?.flood_altitude_meters}m.\nUser: ${msg}` }
              ],
              temperature: 0.7,
              max_tokens: 500
            }),
        });
        
        const data = await response.json();
        const text = data.choices[0]?.message?.content;

        if (text) {
            setChatHistory(prev => [...prev, { role: 'model', text: text, timestamp: new Date() }]);
        }
    } catch (e) {
        setTimeout(() => {
            setChatHistory(prev => [...prev, { 
                role: 'model', 
                text: `[OFFLINE] Analysis: High risk at +${climateData?.flood_altitude_meters}m. Evacuation advised.`, 
                timestamp: new Date() 
            }]);
        }, 500);
    } finally {
        setLoadingChat(false);
    }
  }, [climateData]);

  // --- VISUALS ---
  let visualSeaLevel = climateData?.flood_altitude_meters || 0;
  const targetLocation: LatLon = climateData?.coordinates ?? { lat: 40.7128, lon: -74.0060 };
  const buildingColors = React.useMemo(() => climateData ? {
    risk: climateData.building_style.risk_color_hex,
    safe: climateData.building_style.safe_color_hex
  } : undefined, [climateData]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans">
      
      {/* STATUS BAR */}
      <div className="absolute top-0 left-0 z-50 p-2 pointer-events-none opacity-90">
        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${apiStatus === "Live Data" ? "bg-green-900/80 border-green-500 text-green-200" : "bg-blue-900/80 border-blue-500 text-blue-200"}`}>
           DATA SOURCE: {apiStatus === "Live Data" ? "AI + IPCC AR6" : "IPCC SIMULATION (Offline)"}
        </span>
      </div>

      <div className="absolute inset-0 z-0">
        <CesiumViewer 
          seaLevelRise={visualSeaLevel}
          targetLocation={targetLocation}
          buildingColors={buildingColors}
          stormCategory={stormCategory}
          isDefended={isDefended}
          onLoaded={handleLoaded}
        />
      </div>

      <OverlayUI 
        year={year}
        setYear={setYear}
        seaLevelRise={visualSeaLevel}
        onSearch={setSearchQuery}
        loading={!isLoaded}
        loadingData={loadingData}
        climateData={climateData}
        isSandboxMode={isSandboxMode}
        setSandboxMode={setSandboxMode}
        manualSeaLevel={manualSeaLevel}
        setManualSeaLevel={setManualSeaLevel}
        stormCategory={stormCategory}
        setStormCategory={setStormCategory}
        isDefended={isDefended}
        toggleDefense={() => setIsDefended(!isDefended)}
      />

      <AiAssistant 
        chatHistory={chatHistory}
        onSendChat={handleSendChat}
        newsHeadlines={newsHeadlines}
        isChatOpen={isChatOpen}
        toggleChat={() => setIsChatOpen(!isChatOpen)}
        loadingChat={loadingChat}
      />
    </div>
  );
}

export default App;