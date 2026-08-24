import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Activity, Satellite, TrendingUp, AlertTriangle,
  Building2, Wind, Zap, Clock, CheckCircle2, Circle
} from "lucide-react";
import { MethaneMap } from "@/components/MethaneMap";
import {
  fetchIndiaHotspots as _fetchMock, indiaStats, indiaStateStats, indiaSatellitePasses,
  type MethaneHotspot, type IndiaStateStats, type IndiaSatellitePass
} from "@/lib/mock-data";
import { fetchLiveIndiaHotspots } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: "easeOut" as const },
});

// Color hotspot markers by concentration
function getMarkerColor(anomaly: number): string {
  if (anomaly >= 500) return "#ef4444"; // red - critical
  if (anomaly >= 300) return "#f97316"; // orange - high
  if (anomaly >= 100) return "#eab308"; // yellow - elevated
  if (anomaly >= 0) return "#22c55e";   // green - normal+
  return "#3b82f6";                      // blue - below baseline
}

function getRiskColor(level: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
  return map[level] ?? map.low;
}

function PassStatusIcon({ status }: { status: IndiaSatellitePass["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />;
  if (status === "in-progress") return <div className="h-3.5 w-3.5 rounded-full bg-blue-400 animate-pulse shrink-0" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

export default function IndiaMonitoring() {
  const [hotspots, setHotspots] = useState<MethaneHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [selected, setSelected] = useState<MethaneHotspot | null>(null);
  const [activeTab, setActiveTab] = useState<"states" | "passes">("states");

  // Map toggle controls
  const [pipelineActive, setPipelineActive] = useState(true);
  const [clusterMode, setClusterMode] = useState(false);
  const [anomalyMode, setAnomalyMode] = useState(false);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const d = await fetchLiveIndiaHotspots();
      setHotspots(d);
      setIsLive(d.length > 0 && d[0].id.startsWith("LIVE"));
      if (!selectedRef.current) {
        setSelected(d.find(h => h.riskLevel === "critical") ?? d[0]);
      }
      setLoading(false);
    } catch (e) {
      console.error("Live fetch failed", e);
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling — controlled by pipelineActive toggle
  useEffect(() => {
    if (pipelineActive) {
      timerRef.current = setInterval(loadData, 60 * 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pipelineActive, loadData]);

  return (
    <div className="page-container">
      {/* ===== Hero ===== */}
      <motion.div {...FADE_UP(0)} className="gradient-hero rounded-2xl p-6 md:p-8 border border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-64 h-64 rounded-full bg-primary/4 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md gradient-green flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-xs font-semibold text-primary tracking-wider uppercase">🇮🇳 India Monitoring Mode</span>
              {isLive && (
                <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold animate-pulse">
                  API LIVE
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-2">
              India Methane{" "}
              <span className="gradient-text">Intelligence Platform</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Dedicated monitoring of Indian methane hotspots from ONGC oil fields in Gujarat and Assam,
              Mumbai High offshore operations, Rajasthan desert blocks, and LNG terminals along the AP coast.
              Powered by Sentinel-5P TROPOMI with MethaneSAT and CarbonMapper fusion.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {["ONGC Fields", "LNG Terminals", "Mumbai High", "Assam Oil Belt", "Rajasthan Block", "NCR Landfills"].map(t => (
                <Badge key={t} variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">{t}</Badge>
              ))}
            </div>
          </div>
          {/* India Quick Stats */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {[
              { label: "India Hotspots", value: indiaStats.totalHotspots, color: "text-primary", icon: Activity },
              { label: "Critical Sites", value: indiaStats.criticalHotspots, color: "text-red-400", icon: AlertTriangle },
              { label: "Total Emission", value: `${indiaStats.totalEmissions.toLocaleString()} kg/hr`, color: "text-orange-400", icon: Wind },
              { label: "Coverage", value: `${indiaStats.coveragePercent}%`, color: "text-blue-400", icon: Satellite },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl px-3 py-2.5 flex items-center gap-2">
                <s.icon className={cn("h-3.5 w-3.5 shrink-0", s.color)} />
                <div>
                  <p className={cn("text-base font-bold font-mono leading-none", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ===== Heatmap Legend ===== */}
      <motion.div {...FADE_UP(0.05)} className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">CH₄ Concentration:</span>
        {[
          { color: "#3b82f6", label: "Below Baseline" },
          { color: "#22c55e", label: "Normal+" },
          { color: "#eab308", label: "Elevated (+100 ppb)" },
          { color: "#f97316", label: "High (+300 ppb)" },
          { color: "#ef4444", label: "Critical (+500 ppb)" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[11px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ===== Map + Side Panel ===== */}
      <motion.div {...FADE_UP(0.1)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4" style={{ minHeight: 520 }}>
          {/* Map */}
          <div className="rounded-xl border border-border glow-card overflow-hidden" style={{ minHeight: 500 }}>
            {loading ? (
              <Skeleton className="w-full h-full min-h-[500px]" />
            ) : (
              <MethaneMap 
                hotspots={hotspots} 
                selectedId={selected?.id} 
                onSelectHotspot={(id) => {
                  const hs = hotspots.find(h => h.id === id);
                  if (hs) setSelected(hs);
                }}
                center={[22.5937, 78.9629]}
                zoom={4}
                liveEnabled={pipelineActive}
                onLiveToggle={setPipelineActive}
                clusterEnabled={clusterMode}
                onClusterToggle={setClusterMode}
                anomalyEnabled={anomalyMode}
                onAnomalyToggle={setAnomalyMode}
              />
            )}
          </div>

          {/* Right panel — selected hotspot detail */}
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="glow-card rounded-xl border border-border p-4 flex-1"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-mono font-bold text-primary">{selected.id}</p>
                      <h3 className="text-sm font-bold text-foreground mt-0.5 leading-tight">{selected.nearestFacility}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{selected.region}</p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", getRiskColor(selected.riskLevel))}>
                      {selected.riskLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "CH₄ Conc.", value: `${selected.concentration} ppb`, color: "text-foreground" },
                      { label: "Anomaly Δ", value: `+${selected.anomalyDelta} ppb`, color: "text-orange-400" },
                      { label: "Emission Rate", value: `${selected.emissionRate} kg/hr`, color: "text-red-400" },
                      { label: "Confidence", value: `${(selected.confidenceScore * 100).toFixed(0)}%`, color: "text-primary" },
                      { label: "Wind Speed", value: `${selected.windSpeed} m/s`, color: "text-blue-400" },
                      { label: "Plume Area", value: `${selected.plumeArea} km²`, color: "text-cyan-400" },
                    ].map(m => (
                      <div key={m.label} className="bg-secondary/40 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] text-muted-foreground mb-0.5">{m.label}</p>
                        <p className={cn("text-xs font-bold font-mono", m.color)}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-2 space-y-1">
                    <p>Source: <span className="text-primary">{selected.source}</span></p>
                    <p>Wind: <span className="text-blue-400">{selected.windSpeed} m/s @ {selected.windDirection}° ({selected.windDirectionLabel})</span></p>
                    <p>Detected: <span className="text-foreground">{new Date(selected.detectedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hotspot minilist */}
            <Card className="glow-border flex-1">
              <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  India Hotspots ({hotspots.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto custom-scroll max-h-[280px]">
                {loading ? (
                  <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : hotspots.map(hs => (
                  <button
                    key={hs.id}
                    onClick={() => setSelected(hs)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border/40 hover:bg-secondary/25 transition-colors",
                      selected?.id === hs.id && "bg-primary/8 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-mono font-bold text-foreground">{hs.id}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getMarkerColor(hs.anomalyDelta) }} />
                        <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded", getRiskColor(hs.riskLevel))}>{hs.riskLevel}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{hs.nearestFacility}</p>
                    <p className="text-[10px] text-orange-400 font-mono">+{hs.anomalyDelta} ppb · {hs.emissionRate} kg/hr</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* ===== State Stats + Satellite Passes Tabs ===== */}
      <motion.div {...FADE_UP(0.2)}>
        {/* Tab switcher */}
        <div className="flex gap-1 mb-3 p-1 bg-secondary/40 rounded-xl w-fit">
          {[
            { key: "states", label: "State Statistics", icon: TrendingUp },
            { key: "passes", label: "Satellite Passes", icon: Satellite },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as "states" | "passes")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                activeTab === t.key
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "states" ? (
            <motion.div key="states" {...FADE_UP(0)}>
              <Card className="glow-border overflow-hidden">
                <CardHeader className="pb-2 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Indian State Methane Statistics — Ranked by Anomaly
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto custom-scroll">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/40">
                          <th className="p-3 text-left text-muted-foreground font-medium">State</th>
                          <th className="p-3 text-left text-muted-foreground font-medium">Avg CH₄</th>
                          <th className="p-3 text-left text-muted-foreground font-medium">Anomaly Δ</th>
                          <th className="p-3 text-left text-muted-foreground font-medium">Hotspots</th>
                          <th className="p-3 text-left text-muted-foreground font-medium">Dominant Sector</th>
                          <th className="p-3 text-left text-muted-foreground font-medium">Risk</th>
                          <th className="p-3 text-left text-muted-foreground font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indiaStateStats.map((s: IndiaStateStats, i) => (
                          <tr key={s.state} className={cn("border-b border-border/40 hover:bg-secondary/20 transition-colors", i % 2 === 0 && "bg-secondary/5")}>
                            <td className="p-3">
                              <span className="font-semibold text-foreground">{s.state}</span>
                              <span className="ml-1.5 text-[10px] text-muted-foreground/60">{s.code}</span>
                            </td>
                            <td className="p-3 font-mono font-semibold text-foreground">{s.avgConcentration} ppb</td>
                            <td className="p-3">
                              <span className={cn("font-mono font-bold px-1.5 py-0.5 rounded text-[11px]",
                                s.anomalyDelta >= 400 ? "text-red-400 bg-red-500/12" :
                                  s.anomalyDelta >= 200 ? "text-orange-400 bg-orange-500/12" :
                                    s.anomalyDelta >= 50 ? "text-yellow-400 bg-yellow-500/12" :
                                      "text-emerald-400 bg-emerald-500/12"
                              )}>+{s.anomalyDelta}</span>
                            </td>
                            <td className="p-3">
                              {s.hotspots > 0 ? (
                                <span className="flex items-center gap-1 text-red-400 font-bold">
                                  <AlertTriangle className="h-3 w-3" />{s.hotspots}
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="p-3 text-muted-foreground">{s.dominantSector}</td>
                            <td className="p-3">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", getRiskColor(s.riskLevel))}>
                                {s.riskLevel}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (s.anomalyDelta / 650) * 100)}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.04 }}
                                  className="h-full rounded-full gradient-green"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="passes" {...FADE_UP(0)}>
              <Card className="glow-border">
                <CardHeader className="pb-2 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Today's Satellite Pass Schedule — India (IST)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {indiaSatellitePasses.map((pass: IndiaSatellitePass, i) => (
                    <motion.div
                      key={pass.orbitId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0",
                        pass.status === "in-progress" && "bg-blue-500/5",
                        i % 2 === 0 && pass.status !== "in-progress" && "bg-secondary/5"
                      )}
                    >
                      <PassStatusIcon status={pass.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-foreground">{pass.satellite}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{pass.orbitId}</span>
                          {pass.status === "in-progress" && (
                            <Badge className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30 border px-1.5 py-0 animate-pulse">LIVE</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{pass.coverageRegion}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-semibold text-foreground">{formatTime(pass.scheduledTime)}</p>
                        <p className="text-[10px] text-muted-foreground">{pass.resolution}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0",
                        pass.status === "completed" ? "border-primary/25 bg-primary/8 text-primary" :
                          pass.status === "in-progress" ? "border-blue-500/25 bg-blue-500/8 text-blue-400" :
                            "border-border/50 text-muted-foreground"
                      )}>
                        {pass.status}
                      </Badge>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ===== Industrial Zones ===== */}
      <motion.div {...FADE_UP(0.3)}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Key Industrial Monitoring Zones — India
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              zone: "Gujarat Petroleum Corridor",
              facilities: "ONGC Gandhar · Shell Hazira LNG · BPCL Koyali",
              hotspots: 3, maxAnomaly: 365,
              color: "border-orange-500/20 bg-orange-500/5", textColor: "text-orange-400",
              desc: "India's most industrialized energy corridor. Multiple LNG terminals, gas processing plants, and refineries within 80 km stretch.",
            },
            {
              zone: "Mumbai High Offshore",
              facilities: "ONGC Uran Processing · Mumbai High Platform",
              hotspots: 1, maxAnomaly: 485,
              color: "border-red-500/20 bg-red-500/5", textColor: "text-red-400",
              desc: "India's largest offshore oil & gas production zone. Critical maritime methane monitoring zone with limited in-situ sensor coverage.",
            },
            {
              zone: "Assam Oil Belt",
              facilities: "ONGC Duliajan · Digboi Fields · Naharkatiya",
              hotspots: 1, maxAnomaly: 625,
              color: "border-red-600/20 bg-red-600/5", textColor: "text-red-500",
              desc: "India's oldest oil-producing region. Aging ONGC infrastructure with highest recorded methane anomaly in India at +625 ppb.",
            },
            {
              zone: "Rajasthan Desert Block",
              facilities: "Cairn Barmer Block · Mangala Processing",
              hotspots: 1, maxAnomaly: 235,
              color: "border-yellow-500/20 bg-yellow-500/5", textColor: "text-yellow-400",
              desc: "India's largest onshore oil producer. Rapid field development with gas flaring as primary emission source.",
            },
            {
              zone: "AP LNG Coast",
              facilities: "Petronet LNG Gangavaram · GAIL Vizag",
              hotspots: 1, maxAnomaly: 145,
              color: "border-blue-500/20 bg-blue-500/5", textColor: "text-blue-400",
              desc: "Andhra Pradesh LNG import terminals. Coastal maritime monitoring zone with seasonal wind variability.",
            },
            {
              zone: "Delhi NCR Landfill Zone",
              facilities: "Bhalswa · Ghazipur · Okhla Landfills",
              hotspots: 1, maxAnomaly: 215,
              color: "border-purple-500/20 bg-purple-500/5", textColor: "text-purple-400",
              desc: "Urban methane from India's largest landfill cluster. Municipal solid waste decomposition — non-oil sector monitoring priority.",
            },
          ].map((z, i) => (
            <motion.div
              key={z.zone}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={cn("glow-card rounded-xl border p-4", z.color)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className={cn("text-sm font-bold leading-tight", z.textColor)}>{z.zone}</h3>
                {z.hotspots > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-red-400 shrink-0 ml-2">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {z.hotspots}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-primary font-mono mb-1.5">Max: +{z.maxAnomaly} ppb</p>
              <p className="text-[10px] text-muted-foreground/70 mb-2 leading-tight">{z.facilities}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{z.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
