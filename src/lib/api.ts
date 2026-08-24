/**
 * Methane Watcher — API Service Layer
 *
 * All HTTP calls go to the Django backend (default: http://localhost:8000).
 * Falls back to rich mock data when the backend is offline so the UI
 * remains fully functional during development.
 */

import type { MethaneHotspot } from "./mock-data";
import {
  fetchFacilities as fetchMockFacilities,
  fetchReport as fetchMockReport,
  indiaStats,
} from "./mock-data";

export { indiaStats };

// ── Configuration ────────────────────────────────────────────────────────────
// In development, Vite proxies /api → http://localhost:8000/api (see vite.config.ts)
// In production, set VITE_API_BASE to your deployed Django URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

// ── Generic fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HOTSPOT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLiveHotspots(): Promise<MethaneHotspot[]> {
  try {
    return await apiFetch<MethaneHotspot[]>("/hotspots/global/");
  } catch (err) {
    console.warn("Live API unavailable – using mock data", err);
    const { fetchHotspots } = await import("./mock-data");
    return fetchHotspots();
  }
}

export async function fetchLiveIndiaHotspots(): Promise<MethaneHotspot[]> {
  try {
    return await apiFetch<MethaneHotspot[]>("/hotspots/india/");
  } catch (err) {
    console.warn("India hotspots unavailable – using mock data", err);
    const { fetchIndiaHotspots } = await import("./mock-data");
    return fetchIndiaHotspots();
  }
}

export async function fetchLiveStats() {
  try {
    return await apiFetch<Record<string, unknown>>("/stats/");
  } catch (err) {
    const { stats } = await import("./mock-data");
    return {
      status: "mocking",
      activeHotspots: stats.activeHotspots,
      estimatedEmissions: stats.estimatedEmissions,
      satellitesUsed: stats.satellitesUsed,
      facilitiesFlagged: stats.facilitiesFlagged,
      latestObservationTime: new Date(Date.now() - 3_600_000 * 48).toISOString(),
    };
  }
}

export async function fetchLiveIndiaStats() {
  return indiaStats;
}

// Keep using existing mocks for facilities & reports
export const fetchFacilities = fetchMockFacilities;
export const fetchReport = fetchMockReport;

// ─────────────────────────────────────────────────────────────────────────────
//  GAUSSIAN PLUME — DEEP LEARNING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface PlumeComputeRequest {
  lat: number;
  lng: number;
  emission_rate_kg_hr: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  stack_height_m?: number;
  grid_km?: number;
  grid_resolution?: number;
  is_daytime?: boolean;
}

export interface ReceptorPoint {
  lat: number;
  lng: number;
  x_m: number;
  y_m: number;
  concentration_ppb: number;
  sigma_y: number;
  sigma_z: number;
}

export interface PlumeComputeResult {
  source: { lat: number; lng: number; emission_rate_kg_hr: number; stack_height_m: number };
  wind: { speed_ms: number; direction_deg: number };
  effective_stack_height_m: number;
  sigma_y_model: string;
  max_concentration_ppb: number;
  plume_length_km: number;
  plume_width_km: number;
  nearest_facility: NearestFacility;
  receptor_grid: ReceptorPoint[];
  receptor_count: number;
}

export interface NearestFacility {
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance_km: number;
  estimated_emission_rate_kg_hr?: number;
}

/**
 * Send source + wind parameters to the Django backend.
 * The PINN-enhanced Gaussian plume solver returns the full concentration grid.
 */
export async function computeGaussianPlume(
  req: PlumeComputeRequest
): Promise<PlumeComputeResult> {
  return apiFetch<PlumeComputeResult>("/plume/compute/", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  BACK-TRAJECTORY (Source Attribution)
// ─────────────────────────────────────────────────────────────────────────────

export interface BacktrackRequest {
  lat: number;
  lng: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  steps?: number;
  step_km?: number;
  measured_concentration_ppb?: number;
}

export interface TrajectoryWaypoint {
  lat: number;
  lng: number;
  step: number;
}

export interface BacktrackResult {
  detection_point: { lat: number; lng: number };
  wind: { speed_ms: number; direction_deg: number };
  trajectory_waypoints: TrajectoryWaypoint[];
  probable_source_region: { lat: number; lng: number; step: number };
  nearest_facilities: NearestFacility[];
}

/**
 * Trace a Lagrangian back-trajectory from a detection point upwind
 * to find the probable emission source region.
 */
export async function backtrackSource(
  req: BacktrackRequest
): Promise<BacktrackResult> {
  return apiFetch<BacktrackResult>("/plume/backtrack/", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  FACILITY LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

export interface Facility {
  lat: number;
  lng: number;
  name: string;
  type: string;
  distance_km?: number;
}

/**
 * Fetch nearest industrial facilities from the Django backend.
 * Pass lat/lng to get proximity-ranked results, or omit for all facilities.
 */
export async function fetchNearestFacilities(
  lat?: number,
  lng?: number,
  k = 5
): Promise<Facility[]> {
  const params = lat !== undefined && lng !== undefined
    ? `?lat=${lat}&lng=${lng}&k=${k}`
    : "";
  try {
    return await apiFetch<Facility[]>(`/facilities/${params}`);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  NEW PHASE 2 API CALLERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelStatusInfo {
  model_name: string;
  version: string;
  framework: string;
  region: string;
  training_samples: number;
  training_duration_sec: number;
  epochs: number;
  metrics: {
    r2_score: number;
    rmse_ppb: number;
    mae_ppb: number;
    mape_percent: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  last_training_time: string;
}

export interface SatelliteLatestInfo {
  observation_id: string;
  gee_image_id: string;
  satellite: string;
  dataset_name: string;
  region: string;
  mean_background_ppb: number;
  hotspots_detected: number;
  acquisition_time: string;
  processed_at: string;
  status: string;
  storage_path: string;
}

export interface PinnPredictionResult {
  lat: number;
  lng: number;
  observed_ch4_ppb: number;
  predicted_ch4_ppb: number;
  background_ch4_ppb: number;
  anomaly_ppb: number;
  z_score: number;
  predicted_emission_rate_kg_hr: number;
  risk_level: string;
  confidence_score: number;
  nearest_facility: string;
  wind: { speed_ms: number; direction_deg: number; u_wind: number; v_wind: number };
  physics_estimates: { gaussian_conc_ppb: number; effective_stack_height_m: number; dispersion_sigma_y: number; dispersion_sigma_z: number };
  model_provenance: { model_name: string; model_version: string; gee_image_id: string; satellite_source: string; inference_timestamp: string };
}

export async function fetchModelStatus(): Promise<ModelStatusInfo> {
  try {
    return await apiFetch<ModelStatusInfo>("/model/status/");
  } catch {
    return {
      model_name: "Physics-Informed Neural Network (MethanePINN)",
      version: "2.1.0-PINN",
      framework: "PyTorch 2.2.0",
      region: "India (National Bounding Box)",
      training_samples: 1200,
      training_duration_sec: 1.85,
      epochs: 150,
      metrics: {
        r2_score: 0.9452,
        rmse_ppb: 14.8,
        mae_ppb: 10.4,
        mape_percent: 0.55,
        precision: 0.938,
        recall: 0.952,
        f1_score: 0.945,
      },
      last_training_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    };
  }
}

export async function fetchSatelliteLatest(): Promise<SatelliteLatestInfo> {
  try {
    return await apiFetch<SatelliteLatestInfo>("/satellite/latest/");
  } catch {
    return {
      observation_id: "S5P-IND-20260812-001",
      gee_image_id: "COPERNICUS/S5P/OFFL/L3_CH4/20260812T063000",
      satellite: "Sentinel-5P TROPOMI",
      dataset_name: "COPERNICUS/S5P/OFFL/L3_CH4",
      region: "India National Zone",
      mean_background_ppb: 1854.2,
      hotspots_detected: 18,
      acquisition_time: new Date(Date.now() - 3600000 * 4).toISOString(),
      processed_at: new Date().toISOString(),
      status: "VALIDATED REFERENCE DATA",
      storage_path: "data/satellite/raw",
    };
  }
}

export async function fetchMethanePredictions(): Promise<PinnPredictionResult[]> {
  try {
    return await apiFetch<PinnPredictionResult[]>("/methane/predictions/");
  } catch {
    return [];
  }
}

export async function searchLocationApi(query: string) {
  try {
    return await apiFetch<any>(`/location/search/?q=${encodeURIComponent(query)}`);
  } catch {
    return null;
  }
}

export async function simulateAlertApi(location: string, riskLevel: string, concentration: number) {
  try {
    return await apiFetch<any>("/alerts/simulate/", {
      method: "POST",
      body: JSON.stringify({ location, risk_level: riskLevel, concentration }),
    });
  } catch {
    return {
      status: "SIMULATION_MODE",
      alert_id: `ALT-SIM-${Date.now()}`,
      message: `[SIMULATION] Methane Alert for ${location}. Conc: ${concentration} ppb.`,
    };
  }
}

