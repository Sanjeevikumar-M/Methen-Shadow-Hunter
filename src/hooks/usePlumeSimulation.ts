import { useState } from "react";
import { computeGaussianPlume, backtrackSource, type PlumeComputeResult, type BacktrackResult } from "@/lib/api";
import type { MethaneHotspot } from "@/lib/mock-data";

export function usePlumeSimulation() {
  const [plumeResult, setPlumeResult] = useState<PlumeComputeResult | null>(null);
  const [backtrackResult, setBacktrackResult] = useState<BacktrackResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = async (
    selected: MethaneHotspot,
    emissionRate: number,
    windSpeed: number,
    windDir: number,
    stackHeight: number,
    gridKm: number,
    daytime: boolean
  ) => {
    setComputing(true);
    setError(null);
    setPlumeResult(null);
    setBacktrackResult(null);

    try {
      const [plume, track] = await Promise.all([
        computeGaussianPlume({
          lat: selected.lat,
          lng: selected.lng,
          emission_rate_kg_hr: emissionRate,
          wind_speed_ms: windSpeed,
          wind_direction_deg: windDir,
          stack_height_m: stackHeight,
          grid_km: gridKm,
          grid_resolution: 20,
          is_daytime: daytime,
        }),
        backtrackSource({
          lat: selected.lat,
          lng: selected.lng,
          wind_speed_ms: windSpeed,
          wind_direction_deg: windDir,
          steps: 20,
          step_km: 2.0,
          measured_concentration_ppb: selected.concentration,
        }),
      ]);
      setPlumeResult(plume);
      setBacktrackResult(track);
    } catch (e: any) {
      setError(e.message ?? "Backend unavailable — ensure Django is running on :8000");
    } finally {
      setComputing(false);
    }
  };

  const reset = () => {
    setPlumeResult(null);
    setBacktrackResult(null);
    setError(null);
  };

  return { plumeResult, backtrackResult, computing, error, simulate, reset };
}
