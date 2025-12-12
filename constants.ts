
import { CityPreset } from './types';

export const CESIUM_ION_TOKEN = process.env.CESIUM_ION_TOKEN || 'CESIUM TOKEN HERE';

export const MIN_YEAR = 2025;
export const MAX_YEAR = 2100;

// 1. MAIN SIMULATION PROMPT (Updated with User Provided Scientific Data)
export const CHRONOS_SYSTEM_INSTRUCTION = `
Role: You are the "Impact Atlas Engine," a scientific disaster simulator.
Task: Analyze the given Location and Scenario.
Constraint: Output STRICT JSON only.

SCIENTIFIC RULES (Updated 2025 Baseline):
- **Current Global Rate**: ~4.3 mm/year (accelerating).
- **Global Mean Sea Level Projections**:
  - 2025: Minimal observable rise above 2000 baseline (approx +0.04m - 0.07m).
  - 2040: ~0.10m.
  - 2050: ~0.30m (US Coasts).
  
- **Storm Surge Rules**:
  - IF the Scenario says "Storm": Add the surge to the base rise.
  - IF the Scenario does NOT mention a storm: REPORT ONLY THE BASE RISE (e.g. ~0.07m). DO NOT simulate a "hypothetical" storm.

Output Schema:
{
  "location": "City Name, Country",
  "coordinates": { "lat": (float), "lon": (float) },
  "flood_altitude_meters": (float), 
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
  "narrative": "Describe the current state accurately. If no storm is active, emphasize that the rise is currently minimal but the FUTURE risk is high."
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
