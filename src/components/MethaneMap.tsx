import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { MethaneHotspot } from "@/lib/mock-data";
import { MapLegend } from "@/components/MapLegend";
import { TimelineSlider } from "@/components/TimelineSlider";
import { MapControls } from "@/components/MapControls";

interface MethaneMapProps {
  hotspots: MethaneHotspot[];
  onSelectHotspot?: (id: string) => void;
  selectedId?: string;
  center?: [number, number];
  zoom?: number;
  // Toggle controls
  liveEnabled?: boolean;
  onLiveToggle?: (enabled: boolean) => void;
  clusterEnabled?: boolean;
  onClusterToggle?: (enabled: boolean) => void;
  anomalyEnabled?: boolean;
  onAnomalyToggle?: (enabled: boolean) => void;
}

const INDIA_BOUNDS = L.latLngBounds([
  [3.6235641873, 64.0216407222],
  [39.2469098899, 98.7292544704],
]);

export function MethaneMap({
  hotspots,
  onSelectHotspot,
  selectedId,
  center = [21.435237, 81.375448],
  zoom = 5,
  liveEnabled = true,
  onLiveToggle,
  clusterEnabled = false,
  onClusterToggle,
  anomalyEnabled = false,
  onAnomalyToggle,
}: MethaneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const anomalyLayersRef = useRef<L.Layer[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      minZoom: 4,
      maxBounds: INDIA_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false,
    });

    map.fitBounds(INDIA_BOUNDS);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render hotspot markers — responds to hotspots, selectedId, and clusterEnabled
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up previous layers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    // Create cluster group if clustering is enabled
    let clusterGroup: L.MarkerClusterGroup | null = null;
    if (clusterEnabled) {
      clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const children = cluster.getAllChildMarkers();
          const count = children.length;

          // Find max concentration among clustered markers
          let maxConc = 0;
          children.forEach((m: any) => {
            if (m.options._concentration) {
              maxConc = Math.max(maxConc, m.options._concentration);
            }
          });

          const color = getColor(maxConc);
          const sizeClass = count >= 10 ? "cluster-lg" : count >= 5 ? "cluster-md" : "cluster-sm";

          return L.divIcon({
            html: `<div class="methane-cluster ${sizeClass}" style="--cluster-color: ${color}">
              <span class="cluster-count">${count}</span>
              <span class="cluster-label">CH₄</span>
            </div>`,
            className: "methane-cluster-icon",
            iconSize: L.point(48, 48),
          });
        },
      });
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
    }

    hotspots.forEach((hs) => {
      // Plume polygon (ellipse approximation) — always on the map directly
      const plumeRadius = Math.sqrt(hs.plumeArea) * 15000;
      const windAngle = (hs.lat * 3 + hs.lng * 2) % 360;
      const plumePoints: L.LatLngExpression[] = [];
      for (let i = 0; i <= 36; i++) {
        const angle = (i / 36) * 2 * Math.PI;
        const rx = plumeRadius * 1.5;
        const ry = plumeRadius * 0.6;
        const cos = Math.cos((windAngle * Math.PI) / 180);
        const sin = Math.sin((windAngle * Math.PI) / 180);
        const x = rx * Math.cos(angle);
        const y = ry * Math.sin(angle);
        const rotX = x * cos - y * sin;
        const rotY = x * sin + y * cos;
        const lat = hs.lat + rotY / 111000;
        const lng = hs.lng + rotX / (111000 * Math.cos((hs.lat * Math.PI) / 180));
        plumePoints.push([lat, lng]);
      }

      const plume = L.polygon(plumePoints, {
        fillColor: getColor(hs.concentration),
        fillOpacity: 0.15,
        stroke: true,
        color: getColor(hs.concentration),
        weight: 1,
        opacity: 0.4,
        dashArray: "4 4",
        className: "animated-plume"
      }).addTo(map);

      // Wind direction arrow — always on map
      const arrowLat = hs.lat + (Math.sin((windAngle * Math.PI) / 180) * plumeRadius * 1.2) / 111000;
      const arrowLng = hs.lng + (Math.cos((windAngle * Math.PI) / 180) * plumeRadius * 1.2) / (111000 * Math.cos((hs.lat * Math.PI) / 180));
      const windMarker = L.marker([arrowLat, arrowLng], {
        icon: L.divIcon({
          html: `<div class="wind-arrow-animate" style="transform: rotate(${windAngle}deg); color: hsl(210,20%,60%); font-size: 14px;">→</div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map);

      // Heatmap circle
      const heatCircle = L.circleMarker([hs.lat, hs.lng], {
        radius: Math.max(12, hs.plumeArea * 2.5),
        fillColor: getColor(hs.concentration),
        fillOpacity: 0.3,
        stroke: false,
        className: "heatmap-pulse"
      });

      // Core marker
      const isSelected = hs.id === selectedId;
      const marker = L.circleMarker([hs.lat, hs.lng], {
        radius: isSelected ? 8 : 6,
        fillColor: getColor(hs.concentration),
        fillOpacity: 0.9,
        color: isSelected ? "#ffffff" : getColor(hs.concentration),
        weight: isSelected ? 3 : 1,
        // Store concentration for cluster icon coloring
        _concentration: hs.concentration,
      } as any);

      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 13px; line-height: 1.6; min-width: 220px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: ${getColor(hs.concentration)};">${hs.nearestFacility}</div>
          <div><strong>ID:</strong> ${hs.id}</div>
          <div><strong>Location:</strong> ${hs.lat.toFixed(2)}°, ${hs.lng.toFixed(2)}°</div>
          <div><strong>CH₄:</strong> ${hs.concentration} ppb</div>
          <div><strong>Anomaly:</strong> <span style="color: ${getAnomalyColor(hs.anomalyDelta)};">+${hs.anomalyDelta} ppb</span></div>
          <div><strong>Emission:</strong> ${hs.emissionRate} kg/hr</div>
          <div><strong>Plume Area:</strong> ${hs.plumeArea} km²</div>
          <div><strong>Confidence:</strong> ${(hs.confidenceScore * 100).toFixed(0)}%</div>
          <div><strong>Detected:</strong> ${new Date(hs.detectedAt).toLocaleString()}</div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid hsl(220,14%,20%);">
            <strong>Plume:</strong> ~${(hs.plumeArea * 1.2).toFixed(1)} km L × ~${(hs.plumeArea * 0.4).toFixed(1)} km W
          </div>
        </div>
      `);

      marker.on("click", () => onSelectHotspot?.(hs.id));

      if (isSelected) {
        map.setView([hs.lat, hs.lng], 6, { animate: true });
      }

      // Add markers to cluster group or directly to map
      if (clusterEnabled && clusterGroup) {
        heatCircle.addTo(map); // heat circles stay on map for visual effect
        clusterGroup.addLayer(marker);
      } else {
        heatCircle.addTo(map);
        marker.addTo(map);
      }

      markersRef.current.push(plume, windMarker, heatCircle, marker);
    });
  }, [hotspots, selectedId, onSelectHotspot, clusterEnabled]);

  // Anomaly detection overlay — separate effect so it toggles independently
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous anomaly layers
    anomalyLayersRef.current.forEach((l) => map.removeLayer(l));
    anomalyLayersRef.current = [];

    if (!anomalyEnabled) return;

    hotspots.forEach((hs) => {
      if (hs.anomalyDelta < 200) return;

      const color = getAnomalyColor(hs.anomalyDelta);
      const severity = hs.anomalyDelta >= 500 ? "CRITICAL" : hs.anomalyDelta >= 300 ? "HIGH" : "ELEVATED";

      // Outer pulsing ring
      const outerRing = L.circleMarker([hs.lat, hs.lng], {
        radius: 22,
        fillColor: "transparent",
        fillOpacity: 0,
        color: color,
        weight: 2,
        opacity: 0.8,
        dashArray: "6 4",
        className: "anomaly-ring",
      }).addTo(map);

      // Inner pulsing ring
      const innerRing = L.circleMarker([hs.lat, hs.lng], {
        radius: 16,
        fillColor: color,
        fillOpacity: 0.08,
        color: color,
        weight: 1.5,
        opacity: 0.5,
        className: "anomaly-ring-inner",
      }).addTo(map);

      // Anomaly label
      const label = L.marker([hs.lat, hs.lng], {
        icon: L.divIcon({
          html: `<div class="anomaly-badge" style="--anomaly-color: ${color}">
            <span class="anomaly-delta">+${hs.anomalyDelta}</span>
            <span class="anomaly-unit">ppb</span>
            <span class="anomaly-severity">${severity}</span>
          </div>`,
          className: "anomaly-badge-icon",
          iconSize: [72, 36],
          iconAnchor: [36, -14],
        }),
      }).addTo(map);

      label.bindTooltip(
        `<div style="font-family: monospace; font-size: 11px; padding: 4px 8px;">
          <b>Anomaly Detected</b><br/>
          +${hs.anomalyDelta} ppb above regional avg (${hs.regionalAverage ?? "~1850"} ppb)<br/>
          Severity: <span style="color: ${color}; font-weight: bold;">${severity}</span>
        </div>`,
        { direction: "top", offset: [0, -30] }
      );

      anomalyLayersRef.current.push(outerRing, innerRing, label);
    });
  }, [hotspots, anomalyEnabled]);

  const [activeLayer, setActiveLayer] = useState<"observed" | "predicted" | "physics" | "error">("observed");

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Top Right 4-Layer Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex bg-card/90 backdrop-blur-md border border-border rounded-lg p-1 gap-1 shadow-lg">
        {[
          { id: "observed", label: "OBSERVED (GEE)", color: "text-emerald-400" },
          { id: "predicted", label: "MODEL PREDICTION (PINN)", color: "text-primary" },
          { id: "physics", label: "PHYSICS PLUME", color: "text-orange-400" },
          { id: "error", label: "PREDICTION ERROR", color: "text-red-400" },
        ].map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id as any)}
            className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-all duration-200 ${
              activeLayer === layer.id
                ? "bg-secondary text-foreground border border-border shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={activeLayer === layer.id ? layer.color : ""}>{layer.label}</span>
          </button>
        ))}
      </div>

      <MapControls
        liveEnabled={liveEnabled}
        onLiveToggle={onLiveToggle ?? (() => {})}
        clusterEnabled={clusterEnabled}
        onClusterToggle={onClusterToggle ?? (() => {})}
        anomalyEnabled={anomalyEnabled}
        onAnomalyToggle={onAnomalyToggle ?? (() => {})}
      />
      <MapLegend />
      <TimelineSlider />
    </div>
  );
}

function getColor(concentration: number): string {
  if (concentration > 2200) return "#ef4444";
  if (concentration > 1900) return "#eab308";
  if (concentration > 1700) return "#22c55e";
  return "#3b82f6";
}

function getAnomalyColor(delta: number): string {
  if (delta >= 500) return "#ef4444"; // red — critical
  if (delta >= 300) return "#f97316"; // orange — high
  if (delta >= 200) return "#eab308"; // yellow — elevated
  return "#22c55e"; // green — normal
}
