import { CityPreset } from './types';

// NOTE: Replace with your actual Cesium Ion Token
// Create one at https://ion.cesium.com/
export const CESIUM_ION_TOKEN = process.env.CESIUM_ION_TOKEN || 'YOUR_CESIUM_TOKEN';

// We keep this for the Geocoding/AI logic, though specific map tile keys aren't needed for OSM
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export const MIN_YEAR = 2025;
export const MAX_YEAR = 2100;

export const CHRONOS_SYSTEM_INSTRUCTION = `
Role: You are the "Chronos Logic Engine," a specialized API backend for a climate simulation app using CesiumJS.
Task: You will receive a Location (City/Region) and a Scenario (e.g., "Year 2050").
Output Format: You must strictly output JSON only (no conversational text). The JSON must follow this schema:
{
  "location": "City Name, Country",
  "coordinates": { "lat": (float), "lon": (float) },
  "flood_altitude_meters": (float estimated water level rise),
  "building_style": {
    "risk_color_hex": "#HexCode (e.g., #FF4444 for danger)",
    "safe_color_hex": "#HexCode (e.g., #FFFFFF for safe)",
    "description": "Short explanation of the coloring logic."
  },
  "narrative": "Short warning text about the specific infrastructure at risk in this location."
}
Constraint: Ensure the flood_altitude_meters is realistic based on the scenario (e.g., +2m for year 2050, +5m for 2100).
Constraint: Provide accurate lat/lon coordinates for the city center so the 3D globe can fly there.
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