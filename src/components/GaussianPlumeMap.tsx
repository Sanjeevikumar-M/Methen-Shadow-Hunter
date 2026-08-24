/**
 * GaussianPlumeMap.tsx
 *
 * Interactive Leaflet map that renders the Gaussian plume concentration
 * grid returned by the Django backend as a heatmap overlay, draws the
 * back-trajectory path, and marks the nearest industrial facility.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReceptorPoint, TrajectoryWaypoint, NearestFacility } from "@/lib/api";

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface GaussianPlumeMapProps {
  sourceLat: number;
  sourceLng: number;
  receptorGrid: ReceptorPoint[];
  trajectory: TrajectoryWaypoint[];
  nearestFacility?: NearestFacility | null;
  windDirection: number;  // degrees
  windSpeed: number;
}

function concentrationToColor(ppb: number, maxPpb: number): string {
  if (maxPpb <= 0) return "rgba(0,255,100,0.1)";
  const ratio = Math.min(ppb / maxPpb, 1.0);
  // Gradient: green → yellow → orange → red
  const r = Math.round(255 * Math.min(ratio * 2, 1));
  const g = Math.round(255 * Math.min((1 - ratio) * 2, 1));
  const b = 0;
  const a = 0.15 + ratio * 0.65;
  return `rgba(${r},${g},${b},${a})`;
}

export default function GaussianPlumeMap({
  sourceLat,
  sourceLng,
  receptorGrid,
  trajectory,
  nearestFacility,
  windDirection,
  windSpeed,
}: GaussianPlumeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [sourceLat, sourceLng],
      zoom: 9,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;

    // Dark satellite tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 }
    ).addTo(map);

    // ── Plume concentration grid as coloured circles ─────────────────────
    const maxPpb = Math.max(...receptorGrid.map((p) => p.concentration_ppb), 1);

    receptorGrid.forEach((pt) => {
      const color = concentrationToColor(pt.concentration_ppb, maxPpb);
      const radius = 800 + (pt.concentration_ppb / maxPpb) * 2200;
      L.circle([pt.lat, pt.lng], {
        radius,
        color: "transparent",
        fillColor: color,
        fillOpacity: 1,
        weight: 0,
      })
        .bindPopup(
          `<div style="font-family:monospace;font-size:12px;color:#e5e5e5;background:#111;padding:6px 10px;border-radius:8px;">
            <b>Concentration</b><br/>
            ${pt.concentration_ppb.toFixed(2)} ppb<br/>
            σ_y: ${pt.sigma_y.toFixed(0)} m &nbsp; σ_z: ${pt.sigma_z.toFixed(0)} m<br/>
            x: ${(pt.x_m / 1000).toFixed(1)} km downwind
          </div>`
        )
        .addTo(map);
    });

    // ── Source marker ─────────────────────────────────────────────────────
    const sourceIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,#ff4500,#ff000088);border:2px solid #ff6622;box-shadow:0 0 12px #ff4500aa;"></div>`,
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([sourceLat, sourceLng], { icon: sourceIcon })
      .bindPopup(
        `<div style="font-family:monospace;font-size:12px;color:#e5e5e5;background:#111;padding:6px 10px;border-radius:8px;">
          <b>💨 Emission Source</b><br/>
          ${sourceLat.toFixed(4)}, ${sourceLng.toFixed(4)}<br/>
          Wind: ${windSpeed} m/s @ ${windDirection}°
        </div>`
      )
      .addTo(map);

    // ── Back-trajectory path ──────────────────────────────────────────────
    if (trajectory.length > 0) {
      const tPoints: L.LatLngExpression[] = [
        [sourceLat, sourceLng],
        ...trajectory.map((w) => [w.lat, w.lng] as L.LatLngExpression),
      ];
      L.polyline(tPoints, {
        color: "#38bdf8",
        weight: 2,
        dashArray: "6 4",
        opacity: 0.75,
      }).addTo(map);

      // Mark trajectory endpoint (probable source region)
      const endPt = trajectory[trajectory.length - 1];
      const endIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#38bdf8;border:2px solid #fff;box-shadow:0 0 8px #38bdf8aa;"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([endPt.lat, endPt.lng], { icon: endIcon })
        .bindPopup(
          `<div style="font-family:monospace;font-size:12px;color:#e5e5e5;background:#111;padding:6px 10px;border-radius:8px;">
            <b>🎯 Probable Source Region</b><br/>
            ${endPt.lat.toFixed(4)}, ${endPt.lng.toFixed(4)}<br/>
            ${trajectory.length * 2} km upwind
          </div>`
        )
        .addTo(map);
    }

    // ── Nearest facility marker ────────────────────────────────────────────
    if (nearestFacility) {
      const facIcon = L.divIcon({
        html: `<div style="width:22px;height:22px;border-radius:4px;background:#f59e0b;border:2px solid #fbbf24;box-shadow:0 0 10px #f59e0baa;display:flex;align-items:center;justify-content:center;">🏭</div>`,
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([nearestFacility.lat, nearestFacility.lng], { icon: facIcon })
        .bindPopup(
          `<div style="font-family:monospace;font-size:12px;color:#e5e5e5;background:#111;padding:6px 10px;border-radius:8px;">
            <b>🏭 ${nearestFacility.name}</b><br/>
            Type: ${nearestFacility.type}<br/>
            Distance: ${nearestFacility.distance_km.toFixed(1)} km
          </div>`
        )
        .addTo(map);

      // Line from source to facility
      L.polyline([[sourceLat, sourceLng], [nearestFacility.lat, nearestFacility.lng]], {
        color: "#f59e0b",
        weight: 1.5,
        dashArray: "3 5",
        opacity: 0.5,
      }).addTo(map);
    }

    // ── Wind direction arrow (SVG overlay) ────────────────────────────────
    const arrowIcon = L.divIcon({
      html: `<div style="transform:rotate(${windDirection}deg);font-size:24px;color:#60a5fa;filter:drop-shadow(0 0 6px #60a5fa88);">↑</div>`,
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    // Place arrow 3 km upwind of source
    const upwindRad = ((windDirection + 180) % 360) * (Math.PI / 180);
    const arrowLat = sourceLat + (3000 * Math.cos(upwindRad)) / 111320;
    const arrowLng = sourceLng + (3000 * Math.sin(upwindRad)) / (111320 * Math.cos(sourceLat * Math.PI / 180));
    L.marker([arrowLat, arrowLng], { icon: arrowIcon })
      .bindTooltip(`Wind: ${windSpeed} m/s`, { permanent: false })
      .addTo(map);

    // Fit map to plume extent if we have grid points
    if (receptorGrid.length > 0) {
      const allLats = [sourceLat, ...receptorGrid.map((p) => p.lat)];
      const allLngs = [sourceLng, ...receptorGrid.map((p) => p.lng)];
      map.fitBounds([
        [Math.min(...allLats), Math.min(...allLngs)],
        [Math.max(...allLats), Math.max(...allLngs)],
      ], { padding: [30, 30] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [sourceLat, sourceLng, receptorGrid, trajectory, nearestFacility, windDirection, windSpeed]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 440, borderRadius: 12, overflow: "hidden" }}
    />
  );
}
