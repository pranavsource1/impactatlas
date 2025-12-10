import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CesiumViewer } from './components/CesiumViewer';
import { OverlayUI } from './components/OverlayUI';
import { CHRONOS_SYSTEM_INSTRUCTION, MIN_YEAR } from './constants';
import { ClimateData, LatLon } from './types';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function App() {
  const [year, setYear] = useState<number>(2025);
  const [searchQuery, setSearchQuery] = useState<string>("New York, USA");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  
  // Debounce logic
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchClimateData = async () => {
      setLoadingData(true);
      try {
        const prompt = `Location: ${searchQuery}. Scenario: Year ${year}, Business-as-usual emissions.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: CHRONOS_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          const data = JSON.parse(response.text) as ClimateData;
          setClimateData(data);
        }
      } catch (error) {
        console.error("Failed to fetch climate data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Reduced debounce to 500ms for snappier Hackathon responsiveness
    debounceTimeout.current = setTimeout(() => {
      fetchClimateData();
    }, 500);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [year, searchQuery]);

  const seaLevelRise = climateData?.flood_altitude_meters ?? 0;
  // Fallback to NY coords if data isn't loaded yet
  const targetLocation: LatLon = climateData?.coordinates ?? { lat: 40.7128, lon: -74.0060 };
  const buildingColors = climateData ? {
    risk: climateData.building_style.risk_color_hex,
    safe: climateData.building_style.safe_color_hex
  } : undefined;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans">
      
      {/* 3D Globe Layer */}
      <div className="absolute inset-0 z-0">
        <CesiumViewer 
          seaLevelRise={seaLevelRise}
          targetLocation={targetLocation}
          buildingColors={buildingColors}
          onLoaded={() => setIsLoaded(true)}
        />
      </div>

      {/* UI Overlay Layer */}
      <OverlayUI 
        year={year}
        setYear={setYear}
        seaLevelRise={seaLevelRise}
        onSearch={setSearchQuery}
        loading={!isLoaded}
        loadingData={loadingData}
        climateData={climateData}
      />

    </div>
  );
}

export default App;