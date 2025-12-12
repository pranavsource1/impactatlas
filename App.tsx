import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CesiumViewer } from './components/CesiumViewer';
import { OverlayUI } from './components/OverlayUI';
import { AiAssistant } from './components/AiAssistant';
import { CHRONOS_SYSTEM_INSTRUCTION, NEWS_SYSTEM_INSTRUCTION, CHAT_SYSTEM_INSTRUCTION } from './constants';
import { ClimateData, LatLon, ChatMessage, NewsHeadline } from './types';

// --- GROQ CONFIGURATION ---
const API_KEY = process.env.GROQ_API_KEY;
// FIX: Use the local proxy URL to bypass CORS
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
  // 0. MOCK DATA GENERATOR (Fallback)
  // ---------------------------------------------------------------------------
  const getMockData = (location: string, year: number, seaLevel: number): ClimateData => {
    return {
        location: location,
        coordinates: { lat: 40.7128, lon: -74.0060 },
        flood_altitude_meters: seaLevel,
        building_style: {
            risk_color_hex: "#FF4500",
            safe_color_hex: "#A9A9A9",
            description: `Simulated high-risk zones for ${location}.`
        },
        impact_analysis: {
            hospitals: "Operating on backup power due to grid instability.",
            power_grid: "Critical failure in low-lying substations.",
            transportation: "Transit tunnels suspended due to flooding.",
            economic_loss: `$${(seaLevel * 2.5 + 1).toFixed(1)} Billion damage.`
        },
        narrative: `By ${year}, ${location} faces ${seaLevel}m sea level rise. Immediate infrastructure reinforcement is required.`
    };
  };

  const getMockNews = (location: string) => [
      `BREAKING: ${location} declares climate emergency.`,
      "ECONOMY: Coastal insurance markets suspend new policies.",
      "TECH: CityOS AI deploying autonomous flood barriers.",
      "WEATHER: Record storm surge anticipated tonight."
  ];

  // ---------------------------------------------------------------------------
  // 1. GROQ API CALLER
  // ---------------------------------------------------------------------------
  const callGroq = async (systemPrompt: string, userPrompt: string): Promise<string> => {
    if (!API_KEY) {
      setApiStatus("Error: Missing Key");
      throw new Error("NO_KEY");
    }

    try {
      setApiStatus("Thinking...");
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
        const err = await response.json().catch(() => ({}));
        console.error("Groq Error:", err);
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setApiStatus("Groq Online");
      return data.choices[0]?.message?.content || "";
    } catch (e) {
      console.error("Fetch Failed:", e);
      throw e;
    }
  };

  // ---------------------------------------------------------------------------
  // 2. SIMULATION LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const runSimulation = async () => {
      setLoadingData(true);
      
      let rise = isSandboxMode ? manualSeaLevel : Math.max(0.2, (year - 2020) * 0.05);
      if (stormCategory > 0) rise += (stormCategory * 0.5);
      if (isDefended) rise = Math.max(0, rise - 2.0);

      let scenario = isSandboxMode 
        ? `Manual: +${rise.toFixed(2)}m (Cat ${stormCategory})` 
        : `Year ${year} (BAU)`;

      try {
        const system = `${CHRONOS_SYSTEM_INSTRUCTION}\nIMPORTANT: Output valid JSON object only.`;
        const user = `Location: ${searchQuery}\nScenario: ${scenario}`;
        
        const text = await callGroq(system, user);
        const data = JSON.parse(text) as ClimateData;
        
        setClimateData(data);
        fetchNews(data.location, scenario, data.narrative);

      } catch (error) {
        console.warn("Groq Failed, switching to Sim Mode:", error);
        setApiStatus("Simulation Mode (Offline)");
        
        // Fallback
        setClimateData(getMockData(searchQuery, year, Number(rise.toFixed(2))));
        
        const mockNews = getMockNews(searchQuery);
        setNewsHeadlines(mockNews.map((t, i) => ({
            id: `mock-${i}`, text: t, source: "SIMULATION FEED"
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
        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${apiStatus === "Groq Online" ? "bg-green-900/80 border-green-500 text-green-200" : "bg-purple-900/80 border-purple-500 text-purple-200"}`}>
           STATUS: {apiStatus}
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