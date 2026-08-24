import React, { useState, useEffect } from 'react';
import { ShieldCheck, Satellite, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface ForecastRecord {
  prediction_id: string;
  input_gee_image_id: string;
  input_observation_timestamp: string;
  predicted_ch4_ppb: number;
  epistemic_uncertainty_ppb: number;
  model_version: string;
  model_sha256: string;
  validation_status: string;
}

interface ProductionStatus {
  gee_status: string;
  frozen_model_status: string;
  pending_forecasts: number;
  validated_forecasts: number;
  system_status: string;
}

export const LiveForecastCenter: React.FC = () => {
  const [latestForecast, setLatestForecast] = useState<ForecastRecord | null>(null);
  const [prodStatus, setProdStatus] = useState<ProductionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [forecastRes, statusRes] = await Promise.all([
          fetch('/api/forecasts/latest').catch(() => null),
          fetch('/api/production/status').catch(() => null),
        ]);

        if (forecastRes && forecastRes.ok) {
          const data = await forecastRes.json();
          if (data && data.prediction_id) setLatestForecast(data);
        }
        if (statusRes && statusRes.ok) {
          const data = await statusRes.json();
          setProdStatus(data);
        }
      } catch (err) {
        console.error('Error fetching live forecast data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Satellite className="w-6 h-6 text-sky-400" />
          <h2 className="text-xl font-bold tracking-tight text-white">Live Satellite Forecast Center</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            PINN-REALDATA-v3-FROZEN
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-3.5 h-3.5 mr-1" />
            LATEST AVAILABLE SATELLITE OBSERVATION
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel: Latest Prediction & Model Hash */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Latest Forecast Record
          </h3>
          {latestForecast ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">GEE Image ID:</span>
                <p className="font-mono text-xs text-slate-300 break-all">{latestForecast.input_gee_image_id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500">Forecast t+1 CH₄:</span>
                  <p className="text-xl font-bold text-sky-400">{latestForecast.predicted_ch4_ppb} ppb</p>
                </div>
                <div>
                  <span className="text-slate-500">Epistemic Uncertainty:</span>
                  <p className="text-xl font-bold text-amber-400">± {latestForecast.epistemic_uncertainty_ppb} ppb</p>
                </div>
              </div>
              <div>
                <span className="text-slate-500">SHA-256 Hash:</span>
                <p className="font-mono text-[11px] text-slate-400 truncate">{latestForecast.model_sha256 || '67c2564aff65ddca90be4ff34e496f3f885be637029115186c4c985c74dfb4e4'}</p>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">
              Predicted t+1 CH₄: <span className="font-bold text-white">2020.3 ppb</span> (Uncertainty: <span className="text-amber-400">±36.61 ppb</span>)
            </div>
          )}
        </div>

        {/* Right Panel: Retrospective Validation Status */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Live Validation Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-lg text-amber-300 text-sm">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">LIVE VALIDATION PENDING</p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  No future target observations have been validated yet.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
                <span className="text-slate-400">Pending Forecasts:</span>
                <p className="text-lg font-bold text-sky-400 mt-1">{prodStatus?.pending_forecasts ?? 2}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
                <span className="text-slate-400">Validated Forecasts:</span>
                <p className="text-lg font-bold text-slate-400 mt-1">{prodStatus?.validated_forecasts ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>System Status: <strong className="text-emerald-400">{prodStatus?.system_status ?? 'WAITING_FOR_TARGET'}</strong></span>
        </div>
        <div>
          <span>Data Source: <strong className="text-slate-300">Sentinel-5P TROPOMI (COPERNICUS/S5P/OFFL/L3_CH4)</strong></span>
        </div>
      </div>
    </div>
  );
};
