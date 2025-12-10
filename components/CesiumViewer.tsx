import React, { useEffect, useRef } from 'react';
import { CESIUM_ION_TOKEN } from '../constants';
import { LatLon } from '../types';

interface CesiumViewerProps {
  seaLevelRise: number; // in meters
  targetLocation: LatLon | null;
  buildingColors?: {
    risk: string;
    safe: string;
  };
  onLoaded: () => void;
}

export const CesiumViewer: React.FC<CesiumViewerProps> = ({ 
  seaLevelRise, 
  targetLocation,
  buildingColors,
  onLoaded
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const waterEntityRef = useRef<any>(null);
  const tilesetRef = useRef<any>(null);
  
  // Refs for callbacks
  const seaLevelRiseRef = useRef(seaLevelRise);

  useEffect(() => {
    seaLevelRiseRef.current = seaLevelRise;
  }, [seaLevelRise]);

  // Initialize Cesium
  useEffect(() => {
    if (!containerRef.current) return;

    const Cesium = window.Cesium;
    if (!Cesium) return;

    // Check for valid token
    if (!CESIUM_ION_TOKEN || CESIUM_ION_TOKEN.includes('PLACEHOLDER') || CESIUM_ION_TOKEN.includes('YOUR_CESIUM')) {
      console.warn("Cesium Ion Token is missing or invalid. 3D Buildings may not load.");
    }

    // Set Cesium Ion Token
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain({
        requestVertexNormals: true, // Improves terrain lighting
        requestWaterMask: true
      }),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      animation: false,
      navigationHelpButton: false,
      creditContainer: document.createElement("div"),
      shadows: true, // HACKATHON: Enable shadows for visual depth
      terrainShadows: Cesium.ShadowMode.ENABLED,
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;
    
    // HACKATHON: Fix lighting to be dramatic (Noon) so shadows are visible
    // This prevents the "night time" issue if user opens app at night
    const noonTime = Cesium.JulianDate.fromDate(new Date(2025, 6, 1, 12, 0, 0));
    viewer.clock.currentTime = noonTime;
    viewer.clock.shouldAnimate = false;
    viewer.scene.globe.enableLighting = true;
    
    // Add OSM Buildings
    const loadBuildings = async () => {
      try {
        let tileset;
        
        // Robust loading: Try the helper, fallback to Asset ID if helper is missing/broken
        if (typeof Cesium.createOsmBuildings === 'function') {
           tileset = await Cesium.createOsmBuildings();
        } else {
           // Fallback to loading via Ion Asset ID (96188 is OSM Buildings)
           const resource = await Cesium.IonResource.fromAssetId(96188);
           tileset = await Cesium.Cesium3DTileset.fromUrl(resource);
        }

        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewer.scene.primitives.add(tileset);
            tilesetRef.current = tileset;
            
            // Initial fly to default location
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(-74.0060, 40.7128, 2000),
              orientation: {
                heading: Cesium.Math.toRadians(20),
                pitch: Cesium.Math.toRadians(-20),
              }
            });
        }
        
        onLoaded();
      } catch (error) {
        // Detailed error logging for "Failed to load buildings"
        console.error("Error loading OSM Buildings. Check your CESIUM_ION_TOKEN.", error);
        // Continue loading app even if buildings fail
        onLoaded();
      }
    };

    loadBuildings();
    viewerRef.current = viewer;

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Handle Styling based on Flood Risk
  useEffect(() => {
    const Cesium = window.Cesium;
    if (!tilesetRef.current || !Cesium) return;

    const riskColor = buildingColors?.risk || '#FF4444';
    const safeColor = buildingColors?.safe || '#FFFFFF';

    // Apply 3D Tile Style
    tilesetRef.current.style = new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          // If building estimated height is less than flood level, color it risk color
          [`\${feature['cesium#estimatedHeight']} < ${seaLevelRise}`, `color('${riskColor}')`], 
          ["true", `color('${safeColor}')`]
        ]
      }
    });

  }, [seaLevelRise, buildingColors]);

  // Handle FlyTo Location
  useEffect(() => {
    if (!viewerRef.current || !targetLocation) return;
    const Cesium = window.Cesium;

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(targetLocation.lon, targetLocation.lat, 1500),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0.0
      },
      duration: 3,
      complete: () => {
         updateWaterLayer(targetLocation.lon, targetLocation.lat);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLocation]);

  // Handle Water Layer Updates
  useEffect(() => {
    if (!viewerRef.current) return;
    
    // BUG FIX: At 0m (or near 0), hide the water entity completely to avoid 
    // z-fighting (flickering) with the ground/sea terrain.
    if (waterEntityRef.current) {
      const shouldShow = seaLevelRise > 0.1;
      waterEntityRef.current.show = shouldShow;
      
      if (shouldShow) {
        waterEntityRef.current.ellipse.extrudedHeight = seaLevelRise;
      }
    }
  }, [seaLevelRise]);

  const updateWaterLayer = (lon: number, lat: number) => {
    const Cesium = window.Cesium;
    if (!viewerRef.current) return;

    if (waterEntityRef.current) {
      viewerRef.current.entities.remove(waterEntityRef.current);
    }

    const center = Cesium.Cartesian3.fromDegrees(lon, lat);
    const radius = 25000; 
    
    // Initial visibility check
    const shouldShow = seaLevelRiseRef.current > 0.1;

    waterEntityRef.current = viewerRef.current.entities.add({
      name: "Flood Simulation Plane",
      position: center,
      show: shouldShow, 
      ellipse: {
        semiMinorAxis: radius,
        semiMajorAxis: radius,
        // HACKATHON VISUALS: Deep Azure Blue with optimized transparency
        material: new Cesium.Color(0.0, 0.5, 0.8, 0.55),
        // Fix: Anchor height deep underground so the water is a solid volume rising up
        // This prevents bottom artifacts when looking from an angle
        height: -1000.0,
        extrudedHeight: seaLevelRiseRef.current,
        outline: false,
      }
    });
  };

  return <div ref={containerRef} className="w-full h-full bg-slate-900" />;
};