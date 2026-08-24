/**
 * WindPlume.tsx  — Gaussian Plume Deep Learning Visualizer
 *
 * This page lets users:
 *  1. Select a methane hotspot (or enter custom coordinates).
 *  2. Tune wind / stack parameters via sliders.
 *  3. Submit to the Django PINN backend → get full plume concentration grid.
 *  4. Visualise the result: interactive Leaflet map + concentration charts +
 *     back-trajectory + nearest facility detection.
 */

import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind, Navigation, Activity, AlertTriangle, Building2,
  Zap, ChevronRight, RefreshCw, Info, Layers, Target, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  type PlumeComputeResult, type BacktrackResult,
  type ReceptorPoint,
} from "@/lib/api";
import { fetchHotspots, type MethaneHotspot } from "@/lib/mock-data";
import { usePlumeSimulation } from "@/hooks/usePlumeSimulation";

const GaussianPlumeMap = lazy(() => import("@/components/GaussianPlumeMap"));

// ── Theme helpers ─────────────────────────────────────────────────────────────
const CHART_THEME = {
  grid: "hsl(222, 16%, 16%)",
  text: "hsl(215, 14%, 52%)",
  green: "hsl(142, 70%, 48%)",
  blue:  "hsl(200, 72%, 52%)",
  orange:"hsl(38, 92%, 52%)",
  red:   "hsl(0, 74%, 52%)",
};
const TOOLTIP_STYLE = {
  background: "hsl(222,18%,10%)",
  border: "1px solid hsl(222,16%,18%)",
  borderRadius: 10,
  color: "#e5e5e5",
  fontSize: 12,
};
const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    low:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase", styles[level] ?? styles.low)}>
      {level}
    </span>
  );
}

function WindArrow({ direction, size = 48 }: { direction: number; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-primary/10 border border-primary/20"
      style={{ width: size, height: size }}
    >
      <Navigation
        style={{ transform: `rotate(${direction}deg)`, color: "hsl(142,70%,48%)" }}
        size={size * 0.40}
      />
    </div>
  );
}

function plumeDirectionLabel(windDeg: number): string {
  const opposite = (windDeg + 180) % 360;
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const label = dirs[Math.round(opposite / 22.5) % 16];
  const toFull: Record<string, string> = {
    N:"North", NNE:"North-NorthEast", NE:"North-East", ENE:"East-NorthEast",
    E:"East",  ESE:"East-SouthEast",  SE:"South-East",  SSE:"South-SouthEast",
    S:"South", SSW:"South-SouthWest", SW:"South-West",  WSW:"West-SouthWest",
    W:"West",  WNW:"West-NorthWest",  NW:"North-West",  NNW:"North-NorthWest",
  };
  return toFull[label] ?? label;
}

// Build a centreline concentration profile from the receptor grid (y ≈ 0)
function buildCentrelineProfile(grid: ReceptorPoint[]) {
  const onAxis = grid
    .filter((p) => Math.abs(p.y_m) < 500)
    .sort((a, b) => a.x_m - b.x_m);

  const byX: Record<number, number[]> = {};
  onAxis.forEach((p) => {
    const x = Math.round(p.x_m / 1000);
    if (!byX[x]) byX[x] = [];
    byX[x].push(p.concentration_ppb);
  });

  return Object.entries(byX).map(([xKm, vals]) => ({
    xKm: Number(xKm),
    concentration: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
  }));
}

// Build crosswind profile at peak downwind distance
function buildCrosswindProfile(grid: ReceptorPoint[], peakXm: number) {
  const band = grid
    .filter((p) => Math.abs(p.x_m - peakXm) < 1500)
    .sort((a, b) => a.y_m - b.y_m);

  return band.map((p) => ({
    yKm: +(p.y_m / 1000).toFixed(2),
    concentration: +p.concentration_ppb.toFixed(3),
  }));
}

// Stability class helper
function stabilityLabel(windSpeed: number, daytime: boolean) {
  if (daytime) {
    if (windSpeed < 2) return "A – Extremely Unstable";
    if (windSpeed < 3) return "B – Moderately Unstable";
    if (windSpeed < 5) return "C – Slightly Unstable";
    return "D – Neutral";
  } else {
    if (windSpeed < 2) return "F – Moderately Stable";
    if (windSpeed < 3) return "E – Slightly Stable";
    return "D – Neutral";
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WindPlume() {
  const [hotspots, setHotspots] = useState<MethaneHotspot[]>([]);
  const [selected, setSelected] = useState<MethaneHotspot | null>(null);

  // Editable parameters
  const [windSpeed,   setWindSpeed]   = useState(3.2);
  const [windDir,     setWindDir]     = useState(245);
  const [stackHeight, setStackHeight] = useState(10);
  const [emissionRate, setEmissionRate] = useState(1240);
  const [daytime,     setDaytime]     = useState(true);
  const [gridKm,      setGridKm]      = useState(30);

  // Results
  const { plumeResult, backtrackResult, computing, error, simulate, reset } = usePlumeSimulation();
  const [loadingHotspots, setLoadingHotspots] = useState(true);

  useEffect(() => {
    fetchHotspots().then((d) => {
      setHotspots(d);
      const hs = d[0];
      setSelected(hs);
      setWindSpeed(hs.windSpeed);
      setWindDir(hs.windDirection);
      setEmissionRate(hs.emissionRate);
      setLoadingHotspots(false);
    });
  }, []);

  const handleHotspotSelect = (hs: MethaneHotspot) => {
    setSelected(hs);
    setWindSpeed(hs.windSpeed);
    setWindDir(hs.windDirection);
    setEmissionRate(hs.emissionRate);
    reset();
  };

  const handleCompute = () => {
    if (!selected) return;
    simulate(selected, emissionRate, windSpeed, windDir, stackHeight, gridKm, daytime);
  };

  if (loadingHotspots) {
    return (
      <div className="page-container space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const centrelineData = plumeResult ? buildCentrelineProfile(plumeResult.receptor_grid) : [];
  const peakX = centrelineData.length > 0
    ? centrelineData.reduce((a, b) => (a.concentration > b.concentration ? a : b)).xKm * 1000
    : 5000;
  const crosswindData = plumeResult ? buildCrosswindProfile(plumeResult.receptor_grid, peakX) : [];
  const stability = stabilityLabel(windSpeed, daytime);
  const downwindLabel = plumeDirectionLabel(windDir);

  return (
    <div className="page-container">
      {/* ── Hero ── */}
      <motion.div {...FADE_UP(0)} className="gradient-hero rounded-2xl p-5 md:p-6 border border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md gradient-green flex items-center justify-center">
              <Wind className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary tracking-wider uppercase">Gaussian Plume Engine</span>
            <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold ml-1">
              PINN Model v2
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground mb-1">
            Deep Learning{" "}
            <span className="gradient-text">Gaussian Plume Dispersion</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mb-3">
            Physics-Informed Neural Network (PINN) predicts atmospheric dispersion coefficients σ_y and σ_z
            trained on Pasquill-Gifford stability data. The full Gaussian Plume equation models methane spread
            in 3D. Back-trajectory analysis detects the nearest industrial source.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "PINN (PyTorch)",        color: "bg-primary/10 text-primary border-primary/20" },
              { label: "Gaussian Plume Eq.",     color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
              { label: "Briggs Plume Rise",      color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
              { label: "Back-Trajectory",        color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
              { label: "Django REST API",        color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
              { label: "Facility KDTree Search",color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
            ].map((b) => (
              <Badge key={b.label} variant="outline" className={cn("text-[11px] font-medium", b.color)}>
                {b.label}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Main layout: Hotspot List | Control Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">

        {/* Hotspot selector */}
        <motion.div {...FADE_UP(0.08)}>
          <Card className="glow-border h-full">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Hotspot Sites
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[500px] custom-scroll">
              {hotspots.map((hs) => (
                <button
                  key={hs.id}
                  onClick={() => handleHotspotSelect(hs)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-border/40 transition-all text-xs",
                    "hover:bg-secondary/30 focus:outline-none",
                    selected?.id === hs.id && "bg-primary/8 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono font-bold text-foreground">{hs.id}</span>
                    <RiskBadge level={hs.riskLevel} />
                  </div>
                  <p className="text-muted-foreground truncate mb-1">{hs.nearestFacility}</p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    <span><Wind className="inline h-2.5 w-2.5 mr-0.5" />{hs.windSpeed} m/s</span>
                    <span>{hs.windDirectionLabel} ({hs.windDirection}°)</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Parameters + Compute */}
        <motion.div {...FADE_UP(0.12)}>
          <Card className="glow-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Plume Parameters — {selected?.nearestFacility ?? "Select a hotspot"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {/* Parameter sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Wind speed */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Wind Speed</Label>
                    <span className="text-xs font-mono font-bold text-blue-400">{windSpeed.toFixed(1)} m/s</span>
                  </div>
                  <Slider min={0.5} max={15} step={0.1} value={[windSpeed]}
                    onValueChange={([v]) => setWindSpeed(v)} className="accent-blue-500" />
                </div>
                {/* Wind direction */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Wind Direction (FROM)</Label>
                    <span className="text-xs font-mono font-bold text-primary">{windDir}° → plume drifts {downwindLabel}</span>
                  </div>
                  <Slider min={0} max={359} step={1} value={[windDir]}
                    onValueChange={([v]) => setWindDir(v)} />
                </div>
                {/* Emission rate */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Emission Rate</Label>
                    <span className="text-xs font-mono font-bold text-orange-400">{emissionRate.toLocaleString()} kg/hr</span>
                  </div>
                  <Slider min={10} max={10000} step={10} value={[emissionRate]}
                    onValueChange={([v]) => setEmissionRate(v)} className="accent-orange-500" />
                </div>
                {/* Stack height */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Stack Height</Label>
                    <span className="text-xs font-mono font-bold text-purple-400">{stackHeight} m</span>
                  </div>
                  <Slider min={1} max={200} step={1} value={[stackHeight]}
                    onValueChange={([v]) => setStackHeight(v)} className="accent-purple-500" />
                </div>
                {/* Grid extent */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Grid Extent (downwind)</Label>
                    <span className="text-xs font-mono font-bold text-cyan-400">{gridKm} km</span>
                  </div>
                  <Slider min={5} max={80} step={5} value={[gridKm]}
                    onValueChange={([v]) => setGridKm(v)} />
                </div>
                {/* Daytime toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/20 px-4 py-3">
                  <div>
                    <Label className="text-xs text-foreground font-medium">Daytime Conditions</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Affects Pasquill-Gifford stability</p>
                  </div>
                  <Switch checked={daytime} onCheckedChange={setDaytime} />
                </div>
              </div>

              {/* Summary row */}
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-secondary/20 border border-border/40">
                <WindArrow direction={windDir} size={40} />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Stability",     value: stability.split(" – ")[0], sub: stability.split(" – ")[1] ?? "", color: "text-primary" },
                    { label: "Plume Drifts",  value: downwindLabel,              sub: `${(windDir + 180) % 360}°`,    color: "text-blue-400" },
                    { label: "Emission",      value: `${(emissionRate / 3600).toFixed(3)} kg/s`, sub: "Q source term", color: "text-orange-400" },
                    { label: "Eff. Stack",    value: `~${stackHeight + 5} m`,   sub: "incl. Briggs rise",             color: "text-purple-400" },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className={cn("text-sm font-mono font-bold", m.color)}>{m.value}</p>
                      <p className="text-[9px] text-muted-foreground">{m.label}</p>
                      <p className="text-[9px] text-muted-foreground/60">{m.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compute button */}
              <button
                onClick={handleCompute}
                disabled={computing || !selected}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
                  "gradient-green text-primary-foreground shadow-lg",
                  "hover:opacity-90 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {computing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running PINN Gaussian Plume Model…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Compute Plume Dispersion
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Error display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-xs text-red-400"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Results Section ── */}
      <AnimatePresence>
        {plumeResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Result stat bar */}
            <motion.div {...FADE_UP(0)} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Max Concentration", value: `${plumeResult.max_concentration_ppb.toFixed(1)} ppb`, color: "text-red-400",    icon: Zap },
                { label: "Plume Length",       value: `${plumeResult.plume_length_km} km`,                  color: "text-orange-400", icon: ArrowUpRight },
                { label: "Plume Width (FWHM)", value: `${plumeResult.plume_width_km} km`,                   color: "text-blue-400",   icon: Wind },
                { label: "Eff. Stack Height",  value: `${plumeResult.effective_stack_height_m} m`,           color: "text-primary",    icon: Activity },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glow-border">
                    <CardContent className="p-3">
                      <m.icon className={cn("h-4 w-4 mb-1.5", m.color)} />
                      <p className={cn("text-lg font-mono font-bold leading-none", m.color)}>{m.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Nearest Facility Banner */}
            {plumeResult.nearest_facility?.name && (
              <motion.div {...FADE_UP(0.05)}>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-yellow-400 font-semibold">🏭 Nearest Industrial Emitter Detected</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{plumeResult.nearest_facility.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Type: <span className="text-yellow-400 capitalize">{plumeResult.nearest_facility.type.replace("_", " ")}</span>
                      &nbsp;·&nbsp; {plumeResult.nearest_facility.distance_km} km from source
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">σ Model</p>
                    <p className="text-xs font-bold text-primary mt-0.5">{plumeResult.sigma_y_model}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Map */}
            <motion.div {...FADE_UP(0.1)}>
              <Card className="glow-border overflow-hidden">
                <CardHeader className="pb-2 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Live Plume Concentration Map
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                      {plumeResult.receptor_count} receptor points
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0" style={{ height: 460 }}>
                  <Suspense fallback={<Skeleton className="w-full h-full" />}>
                    <GaussianPlumeMap
                      sourceLat={plumeResult.source.lat}
                      sourceLng={plumeResult.source.lng}
                      receptorGrid={plumeResult.receptor_grid}
                      trajectory={backtrackResult?.trajectory_waypoints ?? []}
                      nearestFacility={plumeResult.nearest_facility ?? null}
                      windDirection={plumeResult.wind.direction_deg}
                      windSpeed={plumeResult.wind.speed_ms}
                    />
                  </Suspense>
                </CardContent>
              </Card>
            </motion.div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Centreline concentration profile */}
              <motion.div {...FADE_UP(0.15)}>
                <Card className="glow-border">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      Centreline Concentration Profile (C vs Downwind Distance)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={centrelineData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <defs>
                          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={CHART_THEME.green} stopOpacity={0.5} />
                            <stop offset="95%" stopColor={CHART_THEME.green} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                        <XAxis dataKey="xKm" tick={{ fill: CHART_THEME.text, fontSize: 10 }}
                          label={{ value: "Downwind (km)", fill: CHART_THEME.text, fontSize: 10, position: "insideBottomRight", offset: -4 }} />
                        <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }}
                          label={{ value: "ppb", fill: CHART_THEME.text, fontSize: 10, angle: -90, position: "insideLeft" }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} ppb`, "Concentration"]} />
                        <Area type="monotone" dataKey="concentration" stroke={CHART_THEME.green} fill="url(#greenGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Crosswind profile */}
              <motion.div {...FADE_UP(0.18)}>
                <Card className="glow-border">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Wind className="h-3.5 w-3.5 text-blue-400" />
                      Crosswind Concentration Profile (at peak downwind)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={crosswindData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <defs>
                          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={CHART_THEME.blue} stopOpacity={0.5} />
                            <stop offset="95%" stopColor={CHART_THEME.blue} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                        <XAxis dataKey="yKm" tick={{ fill: CHART_THEME.text, fontSize: 10 }}
                          label={{ value: "Crosswind (km)", fill: CHART_THEME.text, fontSize: 10, position: "insideBottomRight", offset: -4 }} />
                        <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }}
                          label={{ value: "ppb", fill: CHART_THEME.text, fontSize: 10, angle: -90, position: "insideLeft" }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} ppb`, "Concentration"]} />
                        <ReferenceLine x={0} stroke={CHART_THEME.orange} strokeDasharray="4 3" label={{ value: "Centreline", fill: CHART_THEME.orange, fontSize: 9 }} />
                        <Area type="monotone" dataKey="concentration" stroke={CHART_THEME.blue} fill="url(#blueGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Back-trajectory attribution */}
            {backtrackResult && (
              <motion.div {...FADE_UP(0.22)}>
                <Card className="glow-border">
                  <CardHeader className="pb-2 border-b border-border/50">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-purple-400" />
                      Back-Trajectory Source Attribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-1">
                        <p className="text-xs text-muted-foreground mb-1">Probable Source Region</p>
                        <p className="text-sm font-mono font-bold text-purple-400">
                          {backtrackResult.probable_source_region.lat.toFixed(4)},&nbsp;
                          {backtrackResult.probable_source_region.lng.toFixed(4)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {backtrackResult.trajectory_waypoints.length * 2} km upwind
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground mb-2">Nearest Industrial Facilities (upwind region)</p>
                        <div className="space-y-1.5">
                          {backtrackResult.nearest_facilities.map((f, i) => (
                            <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-muted-foreground">#{i + 1}</span>
                                <span className="font-medium text-foreground">{f.name}</span>
                                <Badge variant="outline" className="text-[9px] capitalize">{f.type.replace("_", " ")}</Badge>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-purple-400 block">{f.distance_km.toFixed(1)} km</span>
                                {f.estimated_emission_rate_kg_hr !== undefined && f.estimated_emission_rate_kg_hr > 0 && (
                                  <span className="text-[9px] text-orange-400 font-semibold block font-mono">
                                    Est: {Math.round(f.estimated_emission_rate_kg_hr)} kg/hr
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Gaussian equation info card */}
            <motion.div {...FADE_UP(0.26)}>
              <Card className="glow-border border-primary/20 bg-primary/3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-primary">
                    <Info className="h-3.5 w-3.5" />
                    Gaussian Plume Equation (active)
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-xs text-muted-foreground space-y-1">
                  <p className="text-foreground">
                    C(x,y,z) = [Q / (2π · u · σ_y · σ_z)] · exp(−y²/2σ_y²) · [exp(−(z−H)²/2σ_z²) + exp(−(z+H)²/2σ_z²)]
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-0.5 pt-2 text-[10px]">
                    <span><b className="text-primary">Q</b> = {(emissionRate / 3600).toFixed(4)} kg/s</span>
                    <span><b className="text-blue-400">u</b> = {windSpeed} m/s</span>
                    <span><b className="text-orange-400">H_eff</b> = {plumeResult.effective_stack_height_m} m</span>
                    <span><b className="text-purple-400">σ model</b> = PINN (PyTorch)</span>
                    <span><b className="text-cyan-400">Stability</b> = {stability.split(" – ")[0]}</span>
                    <span><b className="text-foreground">Grid</b> = {plumeResult.receptor_count} pts</span>
                    <span><b className="text-yellow-400">Plume drift</b> = {downwindLabel}</span>
                    <span><b className="text-red-400">Max C</b> = {plumeResult.max_concentration_ppb.toFixed(1)} ppb</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Static wind table (always visible) ── */}
      {!plumeResult && !computing && (
        <motion.div {...FADE_UP(0.25)}>
          <Card className="glow-border">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wind className="h-4 w-4 text-primary" />
                All Hotspots — Wind &amp; Plume Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scroll">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["ID","Facility","Wind Speed","Direction","Plume Drifts","Emission","Risk"].map(h => (
                        <th key={h} className="p-3 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hotspots.map((hs, i) => (
                      <tr
                        key={hs.id}
                        onClick={() => handleHotspotSelect(hs)}
                        className={cn(
                          "border-b border-border/40 hover:bg-secondary/25 transition-colors cursor-pointer",
                          selected?.id === hs.id && "bg-primary/5 border-l-2 border-l-primary",
                          i % 2 === 0 && "bg-secondary/5"
                        )}
                      >
                        <td className="p-3 font-mono font-bold text-foreground">{hs.id}</td>
                        <td className="p-3 text-muted-foreground max-w-[140px] truncate">{hs.nearestFacility}</td>
                        <td className="p-3 font-mono text-blue-400 font-semibold">{hs.windSpeed} m/s</td>
                        <td className="p-3 font-mono text-foreground">{hs.windDirection}° {hs.windDirectionLabel}</td>
                        <td className="p-3 text-primary font-medium">{plumeDirectionLabel(hs.windDirection)}</td>
                        <td className="p-3 font-mono text-orange-400">{hs.emissionRate} kg/hr</td>
                        <td className="p-3"><RiskBadge level={hs.riskLevel} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
