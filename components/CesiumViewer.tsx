import React, { useEffect, useRef, useState } from 'react';
import { CESIUM_ION_TOKEN } from '../constants';
import { LatLon } from '../types';

interface CesiumViewerProps {
  seaLevelRise: number;
  targetLocation: LatLon | null;
  buildingColors?: { risk: string; safe: string };
  stormCategory: number;
  isDefended: boolean;
  onLoaded: () => void;
}

const FLOOD_THRESHOLD = 0.15; 

// FIX: React.memo makes this component ignore updates from Chat/News
// It only re-renders if 'seaLevelRise', 'targetLocation', etc. change.
export const CesiumViewer = React.memo<CesiumViewerProps>(({ 
  seaLevelRise, 
  targetLocation,
  buildingColors,
  stormCategory,
  isDefended,
  onLoaded
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const waterEntityRef = useRef<any>(null);
  const wallEntityRef = useRef<any>(null);
  const rainSystemRef = useRef<any>(null);
  const tilesetRef = useRef<any>(null);
  const scanlineStageRef = useRef<any>(null);
  const [tilesetReady, setTilesetReady] = useState(false);
  
  const seaLevelRiseRef = useRef(seaLevelRise);

  useEffect(() => {
    seaLevelRiseRef.current = seaLevelRise;
  }, [seaLevelRise]);

  useEffect(() => {
    if (!containerRef.current) return;
    const Cesium = window.Cesium;
    if (!Cesium) return;

    if (!CESIUM_ION_TOKEN || CESIUM_ION_TOKEN.includes('PLACEHOLDER')) {
      console.warn("Cesium Ion Token is missing.");
    }
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain({ requestVertexNormals: true, requestWaterMask: true }),
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
      shadows: true,
      terrainShadows: Cesium.ShadowMode.ENABLED,
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.globe.enableLighting = true;
    
    // --- ANIMATION: RED ALERT SCANLINE ---
    // A post-process shader that draws a moving red line over the city
    const scanlineFragmentShader = `
      uniform sampler2D colorTexture;
      uniform sampler2D depthTexture;
      uniform float time;
      in vec2 v_textureCoordinates;
      void main() {
          vec4 color = texture(colorTexture, v_textureCoordinates);
          
          // Math for a moving horizontal bar
          float scan = sin(v_textureCoordinates.y * 50.0 - time * 5.0);
          float line = step(0.95, scan); 
          
          // Apply Red Tint if line is present
          if (line > 0.0) {
             color.rgb = mix(color.rgb, vec3(1.0, 0.2, 0.2), 0.5); // 50% Red overlay
          }
          out_FragColor = color;
      }
    `;
    
    scanlineStageRef.current = viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
        fragmentShader: scanlineFragmentShader,
        uniforms: { time: 0.0 }
    }));
    scanlineStageRef.current.enabled = false;

    // Animation Loop
    const updateLoop = () => {
        if (scanlineStageRef.current && scanlineStageRef.current.enabled) {
            scanlineStageRef.current.uniforms.time = performance.now() / 1000.0;
        }
    };
    viewer.scene.preUpdate.addEventListener(updateLoop);

    // Load Buildings
    const loadBuildings = async () => {
      try {
        let tileset;
        if (typeof Cesium.createOsmBuildings === 'function') {
           tileset = await Cesium.createOsmBuildings();
        } else {
           const resource = await Cesium.IonResource.fromAssetId(96188);
           tileset = await Cesium.Cesium3DTileset.fromUrl(resource);
        }

        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewer.scene.primitives.add(tileset);
            tilesetRef.current = tileset;
            setTilesetReady(true);
            
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(-74.0060, 40.7128, 2000),
              orientation: { heading: Cesium.Math.toRadians(20), pitch: Cesium.Math.toRadians(-20) }
            });
        }
        onLoaded();
      } catch (error) {
        console.error("Error loading OSM Buildings.", error);
        onLoaded();
      }
    };

    loadBuildings();
    viewerRef.current = viewer;

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewer.scene.preUpdate.removeEventListener(updateLoop);
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []); 

  // --- Visual Effects ---

  useEffect(() => {
    if (!viewerRef.current) return;
    updateAtmosphere(viewerRef.current, stormCategory);
    updateRain(viewerRef.current, stormCategory);
    
    // Enable Scanline Animation if High Risk
    // Logic: If sea level > 2m OR Storm Category >= 4, turn on the "Red Alert" scan
    if (scanlineStageRef.current) {
        const isCritical = (seaLevelRise > 2.0 || stormCategory >= 4) && !isDefended;
        scanlineStageRef.current.enabled = isCritical;
    }
  }, [stormCategory, seaLevelRise, isDefended]);

  const updateAtmosphere = (viewer: any, category: number) => {
    const Cesium = window.Cesium;
    if (category > 0) {
        const intensity = category / 5;
        viewer.scene.skyAtmosphere.hueShift = -0.5 * intensity;
        viewer.scene.skyAtmosphere.saturationShift = -0.2 - (0.5 * intensity);
        viewer.scene.skyAtmosphere.brightnessShift = -0.3 - (0.6 * intensity);
        viewer.scene.fog.density = 0.0002 + (0.0008 * intensity); 
    } else {
        viewer.scene.skyAtmosphere.hueShift = 0.0;
        viewer.scene.skyAtmosphere.saturationShift = 0.0;
        viewer.scene.skyAtmosphere.brightnessShift = 0.0;
        viewer.scene.fog.density = 0.0001; 
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(2025, 6, 1, 17, 0, 0));
    }
  };

  const updateRain = (viewer: any, category: number) => {
    const Cesium = window.Cesium;
    if (rainSystemRef.current) {
        viewer.scene.primitives.remove(rainSystemRef.current);
        rainSystemRef.current = null;
    }

    if (category > 0) {
        const intensity = category / 5;
        rainSystemRef.current = new Cesium.ParticleSystem({
            image: 'https://raw.githubusercontent.com/CesiumGS/cesium/master/Apps/SampleData/circular_particle.png',
            startColor: new Cesium.Color(0.6, 0.7, 0.8, 0.4 + (0.2 * intensity)),
            endColor: new Cesium.Color(0.6, 0.7, 0.8, 0.0),
            startScale: 1.0,
            endScale: 0.0,
            minimumParticleLife: 1.2,
            maximumParticleLife: 1.2,
            minimumSpeed: 15.0 + (20.0 * intensity),
            maximumSpeed: 20.0 + (25.0 * intensity),
            imageSize: new Cesium.Cartesian2(4, 15), 
            emissionRate: 1000.0 + (4000.0 * intensity),
            lifetime: 16.0,
            emitter: new Cesium.SphereEmitter(2000.0), 
            modelMatrix: viewer.scene.camera.inverseViewMatrix, 
        });
        viewer.scene.primitives.add(rainSystemRef.current);
    }
  };

  // Sea Wall
  useEffect(() => {
      const Cesium = window.Cesium;
      if (!viewerRef.current || !targetLocation) return;
      if (wallEntityRef.current) {
          viewerRef.current.entities.remove(wallEntityRef.current);
          wallEntityRef.current = null;
      }
      if (isDefended) {
          const center = Cesium.Cartesian3.fromDegrees(targetLocation.lon, targetLocation.lat);
          wallEntityRef.current = viewerRef.current.entities.add({
              position: center,
              ellipse: {
                  semiMinorAxis: 1500.0,
                  semiMajorAxis: 1500.0,
                  height: 0,
                  extrudedHeight: 20.0,
                  material: new Cesium.Color(0.2, 1.0, 0.4, 0.3),
                  outline: true,
                  outlineColor: Cesium.Color.GREEN
              }
          });
      }
  }, [isDefended, targetLocation]);

  // Building Styling
  useEffect(() => {
    const Cesium = window.Cesium;
    if (!tilesetRef.current || !Cesium || !tilesetReady) return;

    const riskColor = buildingColors?.risk || '#FF4500';
    const safeColor = buildingColors?.safe || '#A9A9A9'; 
    const defendedColor = '#4ADE80'; 

    if (isDefended) {
        tilesetRef.current.style = new Cesium.Cesium3DTileStyle({ color: `color('${defendedColor}')` });
        return;
    }

    const isFloodDangerous = seaLevelRise > 0.5;
    tilesetRef.current.style = new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          [`${isFloodDangerous} === true && \${feature['cesium#estimatedHeight']} < 20`, `color('${riskColor}')`],
          ["true", `color('${safeColor}')`]
        ]
      }
    });
  }, [seaLevelRise, buildingColors, tilesetReady, isDefended]);

  // Water & FlyTo
  useEffect(() => {
    if (!viewerRef.current || !targetLocation) return;
    const Cesium = window.Cesium;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(targetLocation.lon, targetLocation.lat, 1500),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 3,
      complete: () => updateWaterLayer(targetLocation.lon, targetLocation.lat)
    });
  }, [targetLocation]);

  useEffect(() => {
    if (!viewerRef.current) return;
    const shouldShow = seaLevelRise > FLOOD_THRESHOLD && !isDefended;
    if (waterEntityRef.current) {
      waterEntityRef.current.show = shouldShow;
      if (shouldShow) waterEntityRef.current.ellipse.extrudedHeight = seaLevelRise;
    }
  }, [seaLevelRise, isDefended]);

  const updateWaterLayer = (lon: number, lat: number) => {
    const Cesium = window.Cesium;
    if (!viewerRef.current) return;
    if (waterEntityRef.current) viewerRef.current.entities.remove(waterEntityRef.current);
    const center = Cesium.Cartesian3.fromDegrees(lon, lat);
    const shouldShow = seaLevelRiseRef.current > FLOOD_THRESHOLD && !isDefended;
    waterEntityRef.current = viewerRef.current.entities.add({
      name: "Flood Simulation Plane",
      position: center,
      show: shouldShow, 
      ellipse: {
        semiMinorAxis: 25000,
        semiMajorAxis: 25000,
        material: new Cesium.Color(0.0, 0.6, 0.9, 0.6),
        height: -1000.0,
        extrudedHeight: seaLevelRiseRef.current,
        outline: false,
      }
    });
  };

  return <div ref={containerRef} className="w-full h-full bg-slate-900" />;
});