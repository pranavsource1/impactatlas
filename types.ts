export interface LatLon {
  lat: number;
  lon: number;
}

export interface CityPreset {
  name: string;
  coords: LatLon;
  heading: number;
  pitch: number;
  range: number;
}

export interface ImpactDetails {
  hospitals: string;
  power_grid: string;
  transportation: string;
  economic_loss: string;
}

export interface ClimateData {
  location: string;
  coordinates: LatLon;
  flood_altitude_meters: number;
  building_style: {
    risk_color_hex: string;
    safe_color_hex: string;
    description: string;
  };
  impact_analysis: ImpactDetails;
  narrative: string;
}

// NEW: Chat & News Types
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface NewsHeadline {
  id: string;
  text: string;
  source: string; // e.g. "CNN Future", "CityOS Alert"
}

declare global {
  interface Window {
    Cesium: any;
  }
}