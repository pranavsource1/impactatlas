import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CesiumViewer } from './components/CesiumViewer';
import { OverlayUI } from './components/OverlayUI';
import { AiAssistant } from './components/AiAssistant';
import { CHRONOS_SYSTEM_INSTRUCTION, NEWS_SYSTEM_INSTRUCTION, CHAT_SYSTEM_INSTRUCTION } from './constants';
import { ClimateData, LatLon, ChatMessage, NewsHeadline } from './types';

// UPDATED: Use the model from the docs (2.5), with a fallback to 1.5
const MODEL_NAME_PREFERRED = 'gemini-2.5-flash';
const MODEL_NAME_FALLBACK = 'gemini-1.5-flash';

// Initialize SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function App() {
  // --- STATE ---
  const [year, setYear] = useState<number>(2025);
  const [searchQuery, setSearchQuery] = useState<string>("New York, USA");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  
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
  // HELPER: Robust Text Extraction (Handles New SDK .text property vs function)
  // ---------------------------------------------------------------------------
  const getResponseText = (response: any): string => {
    try {
      if (!response) return "";
      // The NEW SDK (@google/genai) uses .text as a property (getter)
      if (typeof response.text === 'string') return response.text;
      // The OLD SDK used .text() as a function
      if (typeof response.text === 'function') return response.text();
      // Fallback for raw JSON
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
      }
      return "";
    } catch (e) {
      console.error("Error extracting text:", e);
      return "";
    }
  };

  // ---------------------------------------------------------------------------
  // 1. FETCH SIMULATION DATA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchClimateData = async () => {
      setLoadingData(true);
      try {
        let scenario = isSandboxMode
          ? `Manual Mode. Sea Level: +${manualSeaLevel}m. Storm Cat: ${stormCategory}.`
          : `Year ${year}, Business-as-usual.`;
        if (isDefended) scenario += " Defenses Active.";

        // Combine system instruction into prompt to avoid config errors
        const fullPrompt = `
          ${CHRONOS_SYSTEM_INSTRUCTION}
          OUTPUT STRICT JSON ONLY.
          
          Request:
          Location: ${searchQuery}
          Scenario: ${scenario}
        `;

        console.log(`Simulating ${searchQuery} using ${MODEL_NAME_PREFERRED}...`);
        
        let response: any;
        try {
            // Try Gemini 2.5 (Latest)
            response = await ai.models.generateContent({
              model: MODEL_NAME_PREFERRED,
              contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
              config: { responseMimeType: "application/json" }
            });
        } catch (err) {
            console.warn(`Gemini 2.5 failed, trying fallback (${MODEL_NAME_FALLBACK})...`, err);
            // Fallback to Gemini 1.5 if 2.5 is not found
            response = await ai.models.generateContent({
              model: MODEL_NAME_FALLBACK,
              contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
              config: { responseMimeType: "application/json" }
            });
        }

        const textString = getResponseText(response);
        // Clean markdown if present
        const cleanJson = textString.replace(/```json/g, '').replace(/```/g, '').trim();
        
        if (cleanJson) {
          const data = JSON.parse(cleanJson) as ClimateData;
          setClimateData(data);
          fetchNews(data, scenario);
        }
      } catch (error) {
        console.error("Simulation Failed:", error);
      } finally {
        setLoadingData(false);
      }
    };

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => fetchClimateData(), 500);
    return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
  }, [year, searchQuery, isSandboxMode, manualSeaLevel, stormCategory, isDefended]);

  // ---------------------------------------------------------------------------
  // 2. FETCH NEWS
  // ---------------------------------------------------------------------------
  const fetchNews = useCallback(async (data: ClimateData, scenario: string) => {
    try {
      const fullPrompt = `
        ${NEWS_SYSTEM_INSTRUCTION}
        OUTPUT JSON ARRAY ONLY.
        
        CONTEXT:
        Location: ${data.location}
        Scenario: ${scenario}
        Impact: ${data.narrative}
      `;
      
      // Use fallback logic for news as well
      let response: any;
      try {
        response = await ai.models.generateContent({
            model: MODEL_NAME_PREFERRED,
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            config: { responseMimeType: "application/json" }
        });
      } catch {
         response = await ai.models.generateContent({
            model: MODEL_NAME_FALLBACK,
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            config: { responseMimeType: "application/json" }
        });
      }
      
      const textString = getResponseText(response);
      const cleanJson = textString.replace(/```json/g, '').replace(/```/g, '').trim();
      
      if (cleanJson) {
          const headlines: string[] = JSON.parse(cleanJson);
          setNewsHeadlines(headlines.map((text, i) => ({
              id: `news-${Date.now()}-${i}`,
              text,
              source: i % 2 === 0 ? 'CityOS Alert' : 'Global Wire'
          })));
      }
    } catch (e) {
      console.error("News Failed:", e);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. HANDLE CHAT
  // ---------------------------------------------------------------------------
  const handleSendChat = useCallback(async (msg: string) => {
    const newUserMsg: ChatMessage = { role: 'user', text: msg, timestamp: new Date() };
    setChatHistory(prev => [...prev, newUserMsg]);
    setLoadingChat(true);

    try {
        const fullPrompt = `
            ${CHAT_SYSTEM_INSTRUCTION}
            
            DATA:
            Location: ${climateData?.location || searchQuery}
            Sea Level: ${climateData?.flood_altitude_meters || 0}m
            Narrative: ${climateData?.narrative || "No data"}
            
            USER: ${msg}
        `;

        let response: any;
        try {
            response = await ai.models.generateContent({
                model: MODEL_NAME_PREFERRED,
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            });
        } catch {
             response = await ai.models.generateContent({
                model: MODEL_NAME_FALLBACK,
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            });
        }

        const textString = getResponseText(response);
        if (textString) {
            setChatHistory(prev => [...prev, { role: 'model', text: textString, timestamp: new Date() }]);
        }
    } catch (e: any) {
        console.error("Chat Failed:", e);
        setChatHistory(prev => [...prev, { 
            role: 'model', 
            text: `⚠ Error: ${e.message}`, 
            timestamp: new Date() 
        }]);
    } finally {
        setLoadingChat(false);
    }
  }, [climateData, searchQuery]);

  // --- VISUALS ---
  let visualSeaLevel = isSandboxMode ? manualSeaLevel + (stormCategory > 0 ? stormCategory * 0.2 : 0) : (climateData?.flood_altitude_meters ?? 0);
  const targetLocation: LatLon = climateData?.coordinates ?? { lat: 40.7128, lon: -74.0060 };
  const buildingColors = React.useMemo(() => climateData ? {
    risk: climateData.building_style.risk_color_hex,
    safe: climateData.building_style.safe_color_hex
  } : undefined, [climateData]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans">
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