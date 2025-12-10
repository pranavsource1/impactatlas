// Since we are loading Cesium via CDN, we declare it on the window object
// to avoid TypeScript errors without installing the heavy npm package.

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

export interface ClimateData {
  location: string;
  coordinates: LatLon;
  flood_altitude_meters: number;
  building_style: {
    risk_color_hex: string;
    safe_color_hex: string;
    description: string;
  };
  narrative: string;
}

declare global {
  interface Window {
    Cesium: any;
  }
}