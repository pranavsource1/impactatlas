import { CityPreset } from './types';

export const CESIUM_ION_TOKEN = process.env.CESIUM_ION_TOKEN || '';
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export const MIN_YEAR = 2025;
export const MAX_YEAR = 2100;

// 1. MAIN SIMULATION PROMPT (Updated with Real Science)
export const CHRONOS_SYSTEM_INSTRUCTION = `
Role: You are the "Impact Atlas Engine," a scientific disaster simulator.
Task: Analyze the given Location and Scenario.
Constraint: Output STRICT JSON only.

SCIENTIFIC RULES (IPCC SSP5-8.5 "High Emissions"):
- Base Sea Level Rise (Global Mean):
  - 2025: +0.05m to +0.10m
  - 2050: +0.25m to +0.40m
  - 2075: +0.60m to +0.80m
  - 2100: +1.0m to +1.5m
- Storm Surge Adder:
  - Cat 1: +1.5m
  - Cat 3: +3.0m
  - Cat 5: +5.5m

Output Schema:
{
  "location": "City Name, Country",
  "coordinates": { "lat": (float), "lon": (float) },
  "flood_altitude_meters": (float), // Calculate: Base Rise + Storm Surge
  "building_style": {
    "risk_color_hex": "#HexCode",
    "safe_color_hex": "#HexCode",
    "description": "Short visual description."
  },
  "impact_analysis": {
    "hospitals": "Specific status",
    "power_grid": "Grid status",
    "transportation": "Transit status",
    "economic_loss": "Estimated cost"
  },
  "narrative": "Scientific description of the impact."
}
`;

// 2. NEWS TICKER PROMPT
export const NEWS_SYSTEM_INSTRUCTION = `
Role: You are "FutureNews AI."
Task: Output a JSON object with a key 'headlines' containing an array of 4 short, urgent headlines.
Example: { "headlines": ["Seawall breach in Sector 4", "Market crash due to coastal risk"] }
`;

// 3. CHATBOT PROMPT
export const CHAT_SYSTEM_INSTRUCTION = `
Role: You are "CityOS," the city's AI.
Tone: Authoritative, data-driven.
Task: Answer questions based on the current flood level provided in context.
`;

export const PRESET_CITIES: CityPreset[] = [
  { 
    name: "New York, USA", 
    coords: { lat: 40.7046, lon: -74.0094 }, 
    heading: 18, 
    pitch: -25, 
    range: 2000 
  },
  { 
    name: "Mumbai, India", 
    coords: { lat: 18.9220, lon: 72.8347 }, 
    heading: 90, 
    pitch: -30, 
    range: 3000 
  }
];